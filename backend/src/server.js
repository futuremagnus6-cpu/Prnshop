// Force Node.js to use public DNS servers instead of your blocked ISP/local DNS
require('node:dns/promises').setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { mongoSanitize } = require('./middleware/sanitize');
const hpp = require('hpp');
const compression = require('compression');
const path = require('path');
const responseTime = require('response-time');
const mongoose = require('mongoose');

const config = require('./config/env');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { performanceMonitor } = require('./middleware/monitor');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const dealerRoutes = require('./routes/dealers');
const customerRoutes = require('./routes/customers');
const blogRoutes = require('./routes/blogs');
const feedbackRoutes = require('./routes/feedback');
const alertRoutes = require('./routes/alerts');
const dashboardRoutes = require('./routes/dashboard');
const cartRoutes = require('./routes/cart');
const paymentRoutes = require('./routes/payment');
const importRoutes = require('./routes/importData');
const earningsRoutes = require('./routes/earnings');
const monitoringRoutes = require('./routes/monitoring');
const storeSettingsRoutes = require('./routes/storeSettings');
const fundRequestRoutes = require('./routes/fundRequests');

const app = express();

// Trust Hostinger's reverse proxy (fixes express-rate-limit on shared hosting)
app.set('trust proxy', 1);

// Security middleware - Helmet with comprehensive CSP
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://razorpay.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https://cloudinary.com', 'https://*.cloudinary.com'],
        connectSrc: ["'self'", 'https://razorpay.com'],
        fontSrc: ["'self'", 'https://gstatic.com'],
        frameSrc: ["'self'", 'https://razorpay.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://sandybrown-owl-905368.hostingersite.com'
  ],
  credentials: true
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many login attempts, please try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many API requests, please try again later.' },
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/payments', apiLimiter);

// Compression for API responses
app.use(compression());

// Body parsing with reasonable limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// NoSQL injection sanitization
app.use(mongoSanitize);

// HTTP Parameter Pollution protection
app.use(hpp());

// Performance monitoring middleware (tracks all API requests)
app.use(performanceMonitor);

// X-Response-Time header
app.use(responseTime());

// HTTP request logging via Morgan with winston stream
app.use(
  morgan(config.nodeEnv === 'development' ? 'dev' : 'combined', {
    stream: logger.stream,
    // Skip logging health check and monitoring endpoints to reduce noise
    skip: (req) => {
      const path = req.originalUrl || req.url;
      return path === '/api/health' || path.startsWith('/api/monitoring');
    },
  })
);

// Static files
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check - includes MongoDB connection details
app.get('/api/health', async (_req, res) => {
  let mongoState = mongoose.connection.readyState;
  const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  // If disconnected, try to connect on-the-fly using mongoose.connect()
  if (mongoState === 0 && config.mongodbUri) {
    try {
      await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: 10000,
      });
      mongoState = 1;
    } catch {
      // Connection attempt failed, state remains disconnected
    }
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: {
      state: stateMap[mongoState] || 'unknown',
      host: mongoState === 1 ? mongoose.connection.host : null,
      database: mongoState === 1 ? mongoose.connection.db?.databaseName : null,
      models: Object.keys(mongoose.models).length,
    },
    env: {
      mongodbUriSet: !!process.env.MONGODB_URI,
      port: process.env.PORT || 'not set',
    },
  });
});

// Diagnostic: test MongoDB connection on-demand (no auth required, but rate-limited)
app.get('/api/health/db-test', async (_req, res) => {
  const results = { dns: null, connect: null };

  // Test DNS resolution
  try {
    const dns = require('node:dns/promises');
    const addresses = await dns.resolve4('cluster0.fnmnt3g.mongodb.net');
    results.dns = { ok: true, addresses };
  } catch (dnsErr) {
    results.dns = { ok: false, error: dnsErr.message, code: dnsErr.code };
  }

  // Test SRV lookup
  try {
    const dns = require('node:dns/promises');
    const srvRecords = await dns.resolveSrv('_mongodb._tcp.cluster0.fnmnt3g.mongodb.net');
    results.srv = { ok: true, records: srvRecords };
  } catch (srvErr) {
    results.srv = { ok: false, error: srvErr.message, code: srvErr.code };
  }

  // Test actual MongoDB connection
  if (config.mongodbUri) {
    try {
      const testConn = await mongoose.createConnection(config.mongodbUri, {
        serverSelectionTimeoutMS: 10000,
      }).asPromise();
      results.connect = {
        ok: true,
        host: testConn.host,
        database: testConn.db?.databaseName,
      };
      await testConn.close();
    } catch (connErr) {
      results.connect = {
        ok: false,
        error: connErr.message,
        code: connErr.code,
        name: connErr.name,
      };
    }
  } else {
    results.connect = { ok: false, error: 'MONGODB_URI is not set' };
  }

  res.json(results);
});

// Monitoring routes (must be before 404 handler)
app.use('/api/monitoring', monitoringRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/import', importRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/store-settings', storeSettingsRoutes);
app.use('/api/fund-requests', fundRequestRoutes);

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback routing for React/Vite single-page application
// Fallback routing for React/Vite single-page application
app.use((req, res, next) => {
  if (!req.url.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '../dist/index.html'));
  }
  next();
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Error handler
app.use(errorHandler);

// Start server - wait for initial MongoDB connection before accepting requests
const startServer = async () => {
  // Try to connect to MongoDB first with a 30-second timeout
  // This prevents buffering timeouts on initial requests and ensures all
  // PM2 cluster processes are connected before accepting traffic.
  const connected = await Promise.race([
    connectDB().then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 30000)),
  ]);

  if (!connected) {
    console.warn(
      'MongoDB could not connect within 30s. Starting server anyway with background retry...'
    );
    // connectDB() has already started background retry internally
  }

  app.listen(config.port, () => {
    console.log(`Prandhara ERP Server running on port ${config.port} in ${config.nodeEnv} mode`);
  });
};

// Only start server if this file is run directly, not imported
if (require.main === module) {
  startServer().catch(console.error);
}

module.exports = app;
