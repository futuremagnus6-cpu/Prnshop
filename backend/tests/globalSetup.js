const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

module.exports = async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'testdb',
    },
  });
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  // Store the instance globally so globalTeardown can access it
  global.__MONGO_SERVER__ = mongoServer;
};
