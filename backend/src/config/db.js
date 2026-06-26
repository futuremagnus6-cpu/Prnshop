const mongoose = require('mongoose');
const dns = require('node:dns/promises');
const config = require('./env');
const logger = require('../utils/logger');
const mongooseQueryLogger = require('../middleware/mongooseQueryLogger');

// Apply query logger plugin to all schemas
mongoose.plugin(mongooseQueryLogger);

let reconnectInterval = null;

const startBackgroundRetry = () => {
  if (reconnectInterval) return; // Already retrying

  reconnectInterval = setInterval(async () => {
    if (mongoose.connection.readyState !== 0) {
      // Already connected or connecting, skip
      return;
    }
    try {
      logger.info('Attempting MongoDB reconnection...');
      await attemptConnect();
    } catch (err) {
      logger.error('Reconnection attempt failed', { error: err.message });
    }
  }, 15000);
};

const CONNECTION_EVENTS = {
  error(err) {
    logger.error('MongoDB connection error', { error: err.message });
  },
  disconnected() {
    logger.warn('MongoDB disconnected');
    // Restart background retry if connection drops unexpectedly
    if (!reconnectInterval && config.mongodbUri) {
      logger.info('Starting background reconnection attempts...');
      startBackgroundRetry();
    }
  },
  reconnected() {
    logger.info('MongoDB reconnected');
    // Clear retry interval once reconnected
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
  },
};

const setupConnectionHandlers = () => {
  mongoose.connection.on('error', CONNECTION_EVENTS.error);
  mongoose.connection.on('disconnected', CONNECTION_EVENTS.disconnected);
  mongoose.connection.on('reconnected', CONNECTION_EVENTS.reconnected);
};

/**
 * Resolve an SRV URI to a standard direct connection URI.
 *
 * The `mongodb+srv://` protocol requires a DNS SRV lookup to get the actual
 * shard hostnames and ports. Some hosting environments (like Hostinger) have
 * DNS servers that cannot resolve Atlas SRV records.
 *
 * This function performs the SRV + TXT lookups ourselves using Google DNS
 * (8.8.8.8, 1.1.1.1), then constructs a standard `mongodb://` URI that
 * bypasses the need for SRV resolution in the MongoDB driver entirely.
 */
async function resolveToDirectUri(uri) {
  if (!uri || !uri.startsWith('mongodb+srv://')) return uri;

  try {
    // Use Google/Cloudflare DNS for reliable SRV resolution
    dns.setServers(['8.8.8.8', '1.1.1.1']);

    // Parse the SRV URI to extract components
    const withoutProtocol = uri.slice('mongodb+srv://'.length);
    const firstSlash = withoutProtocol.indexOf('/');
    const hostPart = firstSlash === -1 ? withoutProtocol : withoutProtocol.slice(0, firstSlash);
    const pathAndQuery = firstSlash === -1 ? '' : withoutProtocol.slice(firstSlash); // e.g. /database?params

    const atIndex = hostPart.lastIndexOf('@');
    const authPart = atIndex === -1 ? '' : hostPart.slice(0, atIndex + 1); // e.g. user:pass@
    const hostname = atIndex === -1 ? hostPart : hostPart.slice(atIndex + 1); // e.g. cluster0.xxxxx.mongodb.net

    // Resolve SRV records -> shard hosts
    const srvRecords = await dns.resolveSrv(`_mongodb._tcp.${hostname}`);
    if (!srvRecords.length) {
      throw new Error(`No SRV records found for ${hostname}`);
    }
    const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(',');

    // Resolve TXT records -> replicaSet, authSource
    // Atlas TXT records are formatted as URL query strings:
    // e.g. "authSource=admin&replicaSet=atlas-xxxxx-shard-0"
    let replicaSet = '';
    let authSource = 'admin';
    try {
      const txtRecords = await dns.resolveTxt(hostname);
      for (const txt of txtRecords) {
        const entry = txt.join('');
        if (entry.includes('=')) {
          const parsed = new URLSearchParams(entry);
          if (parsed.get('replicaSet')) replicaSet = parsed.get('replicaSet');
          if (parsed.get('authSource')) authSource = parsed.get('authSource');
        }
      }
    } catch {
      // TXT records are optional
    }

    // Parse existing query params and inject required ones
    const qIndex = pathAndQuery.indexOf('?');
    const dbName = qIndex === -1 ? pathAndQuery.replace(/^\//, '') : pathAndQuery.slice(1, qIndex);
    const existingQuery = qIndex === -1 ? '' : pathAndQuery.slice(qIndex + 1);

    const params = new URLSearchParams(existingQuery);
    if (replicaSet && !params.has('replicaSet')) params.set('replicaSet', replicaSet);
    if (!params.has('authSource')) params.set('authSource', authSource);
    if (!params.has('ssl')) params.set('ssl', 'true');
    if (!params.has('retryWrites')) params.set('retryWrites', 'true');

    const queryStr = params.toString();
    const directUri = `mongodb://${authPart}${hosts}/${dbName}${queryStr ? '?' + queryStr : ''}`;

    logger.info('Resolved mongodb+srv:// to direct connection URI', {
      hostCount: srvRecords.length,
      database: dbName,
    });

    return directUri;
  } catch (error) {
    logger.warn('Failed to resolve SRV connection string, falling back to original URI', {
      error: error.message,
    });
    return uri;
  }
}

const attemptConnect = async () => {
  // Resolve SRV URI to direct URI if needed (bypasses DNS issues on some hosts)
  const resolvedUri = await resolveToDirectUri(config.mongodbUri);

  // Use mongoose.connect() to connect the DEFAULT connection.
  // This is critical: all models are registered via mongoose.model() at require() time,
  // which binds them to the default connection. Using createConnection() creates a
  // separate connection that cached model references in controllers won't use.
  await mongoose.connect(resolvedUri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
  });

  logger.info(`MongoDB connected: ${mongoose.connection.host}`, {
    dbName: mongoose.connection.db?.databaseName,
  });

  // Clear reconnect interval once connected
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }
};

const connectDB = async () => {
  if (!config.mongodbUri) {
    logger.warn('MONGODB_URI is not set. Server will start without database.');
    return false;
  }

  setupConnectionHandlers();

  try {
    await attemptConnect();
    return true;
  } catch (error) {
    const safeUri = config.mongodbUri
      ? config.mongodbUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')
      : 'NOT SET';
    logger.error('Initial MongoDB connection failed', {
      error: error.message,
      uri: safeUri,
    });
    logger.warn('Starting background retry every 15 seconds...');
    startBackgroundRetry();
    return false;
  }
};

module.exports = { connectDB };
