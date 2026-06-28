const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/server');
const config = require('../src/config/env');

let authToken;

beforeAll(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  const User = mongoose.model('User');
  // Use findOneAndUpdate to upsert in case other tests already created this user
  let user = await User.findOne({ email: 'admin@test.com' });
  if (!user) {
    user = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
    });
  }

  authToken = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '1h' });
});

afterAll(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  await mongoose.connection.close();
});

describe('Transaction ID Uniqueness Check - GET /api/orders/check-transaction/:txnId', () => {
  beforeEach(async () => {
    // Clean orders collection before each test
    const Order = mongoose.model('Order');
    await Order.deleteMany({});
  });

  it('should return exists:false for a transaction ID that does not exist', async () => {
    const res = await request(app)
      .get('/api/orders/check-transaction/TXN-NONEXISTENT-123')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('exists', false);
  });

  it('should return exists:true for a transaction ID that already exists in an order', async () => {
    const Order = mongoose.model('Order');
    await Order.create({
      invoiceNumber: 'INV-TEST-001',
      orderType: 'pos',
      status: 'preorder',
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          quantity: 1,
          sellingPrice: 100,
          totalPrice: 100,
        },
      ],
      subtotal: 100,
      grandTotal: 100,
      payments: [
        {
          method: 'upi',
          amount: 100,
          transactionId: 'TXN-EXISTING-456',
        },
      ],
    });

    const res = await request(app)
      .get('/api/orders/check-transaction/TXN-EXISTING-456')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('exists', true);
  });

  it('should return exists:false for a transaction ID that is similar but not identical', async () => {
    const Order = mongoose.model('Order');
    await Order.create({
      invoiceNumber: 'INV-TEST-002',
      orderType: 'pos',
      status: 'preorder',
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          quantity: 1,
          sellingPrice: 100,
          totalPrice: 100,
        },
      ],
      subtotal: 100,
      grandTotal: 100,
      payments: [
        {
          method: 'cash',
          amount: 100,
          transactionId: 'TXN-EXACT-MATCH',
        },
      ],
    });

    // Slightly different ID
    const res = await request(app)
      .get('/api/orders/check-transaction/TXN-EXACT-MATCH-DIFFERENT')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('exists', false);
  });

  it('should find transaction IDs across multiple payment methods within same order', async () => {
    const Order = mongoose.model('Order');
    await Order.create({
      invoiceNumber: 'INV-TEST-003',
      orderType: 'pos',
      status: 'preorder',
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          quantity: 1,
          sellingPrice: 200,
          totalPrice: 200,
        },
      ],
      subtotal: 200,
      grandTotal: 200,
      payments: [
        { method: 'cash', amount: 100, transactionId: '' },
        { method: 'upi', amount: 100, transactionId: 'TXN-MULTI-PAY-789' },
      ],
    });

    const res = await request(app)
      .get('/api/orders/check-transaction/TXN-MULTI-PAY-789')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('exists', true);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app)
      .get('/api/orders/check-transaction/TXN-NO-AUTH');

    expect(res.status).toBe(401);
  });
});
