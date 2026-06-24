const mongoose = require('mongoose');
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

const attemptConnect = async () => {
  // Force-reset the default connection if it's in a bad state
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }

  const conn = await mongoose.connect(config.mongodbUri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
  });

  logger.info(`MongoDB connected: ${conn.connection.host}`, {
    dbName: conn.connection.db?.databaseName,
    models: Object.keys(conn.models).length,
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
    return;
  }

  setupConnectionHandlers();

  try {
    await attemptConnect();
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
  }
};

module.exports = connectDB;
