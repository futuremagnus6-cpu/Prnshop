const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');
const mongooseQueryLogger = require('../middleware/mongooseQueryLogger');

// Apply query logger plugin to all schemas
mongoose.plugin(mongooseQueryLogger);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      // Mongoose 8+ defaults are good, but be explicit
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`, {
      dbName: conn.connection.db?.databaseName,
      models: Object.keys(conn.models).length,
    });

    // Log connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    const safeUri = config.mongodbUri
      ? config.mongodbUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')
      : 'NOT SET';
    logger.error('MongoDB connection failed', {
      error: error.message,
      uri: safeUri,
    });
    // Don't crash the server - allow it to run so health checks work
    logger.warn('Server will continue without database connection');
  }
};

module.exports = connectDB;
