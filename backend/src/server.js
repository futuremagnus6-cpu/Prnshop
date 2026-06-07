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

const config = require('./config/env');
const connectDB = require('./config/db');
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

// Security middleware - Helmet with comprehensive CSP
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://checkout.razorpay.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://*.cloudinary.com'],
        connectSrc: ["'self'", 'https://api.razorpay.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        frameSrc: ["'self'", 'https://api.razorpay.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

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

// Health check - basic
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`Prandhara ERP Server running on port ${config.port} in ${config.nodeEnv} mode`);
  });
};

startServer().catch(console.error);

module.exports = app;
