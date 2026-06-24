const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');
const mongooseQueryLogger = require('../middleware/mongooseQueryLogger');

// Apply query logger plugin to all schemas
mongoose.plugin(mongooseQueryLogger);

const connectDB = async (retries = 3, delay = 3000) => {
  if (!config.mongodbUri) {
    logger.warn('MONGODB_URI is not set. Server will start without database.');
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(config.mongodbUri, {
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

      return; // Success
    } catch (error) {
      const safeUri = config.mongodbUri
        ? config.mongodbUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')
        : 'NOT SET';
      logger.error(`MongoDB connection attempt ${attempt}/${retries} failed`, {
        error: error.message,
        uri: safeUri,
      });

      if (attempt < retries) {
        logger.info(`Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        logger.warn('All connection attempts failed. Server will continue without database connection.');
      }
    }
  }
};

module.exports = connectDB;
