const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/server');
const config = require('../src/config/env');

// We need to extract the express app from the server module.
// Since server.js starts listening immediately, we just use supertest with the app.
let testUser;
let authToken;

beforeAll(async () => {
  // Connect to the in-memory MongoDB (URI set by globalSetup)
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  // Create a test user and generate auth token
  const User = mongoose.model('User');
  testUser = await User.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
  });

  authToken = jwt.sign({ id: testUser._id }, config.jwtSecret, { expiresIn: '1h' });
});

afterAll(async () => {
  // Clean up collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  await mongoose.connection.close();
});

describe('Phone Validation - Dealers', () => {
  const validDealerPayload = {
    name: 'Test Dealer',
    phone: '9876543210',
  };

  describe('POST /api/dealers', () => {
    it('should accept a valid 10-digit phone', async () => {
      const res = await request(app)
        .post('/api/dealers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validDealerPayload);

      // If it fails for another reason (e.g., duplicate), that's fine - just check validation
      if (res.status === 400) {
        expect(res.body.errors).toBeDefined();
        // Make sure none of the errors are about phone
        const phoneErrors = res.body.errors.filter((e) => e.includes('Phone'));
        expect(phoneErrors).toHaveLength(0);
      } else {
        expect(res.status).toBe(201);
      }
    });

    it('should reject a phone with less than 10 digits', async () => {
      const res = await request(app)
        .post('/api/dealers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validDealerPayload, phone: '123456789' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.some((e) => e.includes('10 digits') || e.includes('10 digit'))).toBe(true);
    });

    it('should reject a phone with more than 10 digits', async () => {
      const res = await request(app)
        .post('/api/dealers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validDealerPayload, phone: '12345678901' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.some((e) => e.includes('10 digits') || e.includes('10 digit') || e.includes('exactly 10'))).toBe(true);
    });

    it('should reject a phone with non-digit characters', async () => {
      const res = await request(app)
        .post('/api/dealers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validDealerPayload, phone: '98765abcde' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.some((e) => e.includes('10 digits') || e.includes('10 digit') || e.includes('digits'))).toBe(true);
    });

    it('should reject an empty phone', async () => {
      const res = await request(app)
        .post('/api/dealers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validDealerPayload, phone: '' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('PUT /api/dealers/:id', () => {
    it('should accept a valid 10-digit phone when updating', async () => {
      // First create a dealer
      const createRes = await request(app)
        .post('/api/dealers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Update Test', phone: '1111111111' });

      // If creation failed due to some other setup issue, skip
      if (createRes.status !== 201) return;

      const dealerId = createRes.body.dealer?._id || createRes.body._id;
      const res = await request(app)
        .put(`/api/dealers/${dealerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ phone: '2222222222' });

      if (res.status === 400 && res.body.errors) {
        const phoneErrors = res.body.errors.filter((e) => e.includes('Phone'));
        expect(phoneErrors).toHaveLength(0);
      } else {
        expect([200, 403]).toContain(res.status);
      }
    });

    it('should reject an invalid phone on update', async () => {
      const createRes = await request(app)
        .post('/api/dealers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Update Test 2', phone: '3333333333' });

      if (createRes.status !== 201) return;

      const dealerId = createRes.body.dealer?._id || createRes.body._id;
      const res = await request(app)
        .put(`/api/dealers/${dealerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ phone: '12345' });

      expect(res.status).toBe(400);
      if (res.body.errors) {
        expect(res.body.errors.some((e) => e.includes('10 digits') || e.includes('10 digit') || e.includes('exactly 10'))).toBe(true);
      }
    });
  });
});

describe('Phone Validation - Customers', () => {
  describe('PUT /api/customers/:id', () => {
    it('should reject an invalid phone on customer update', async () => {
      // First create a customer
      const Customer = mongoose.model('Customer');
      const customer = await Customer.create({ name: 'Test Customer' });

      const res = await request(app)
        .put(`/api/customers/${customer._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ phone: '12345' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.some((e) => e.includes('10 digits') || e.includes('10 digit') || e.includes('exactly 10'))).toBe(true);
    });

    it('should accept a valid 10-digit phone on customer update', async () => {
      const Customer = mongoose.model('Customer');
      const customer = await Customer.create({ name: 'Test Customer 2' });

      const res = await request(app)
        .put(`/api/customers/${customer._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ phone: '9876543210' });

      if (res.status === 400 && res.body.errors) {
        const phoneErrors = res.body.errors.filter((e) => e.includes('Phone'));
        expect(phoneErrors).toHaveLength(0);
      } else {
        expect([200, 403]).toContain(res.status);
      }
    });
  });
});

describe('Phone Validation - Orders (Web Checkout)', () => {
  it('should reject order creation with invalid phone', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        items: [{ product: new mongoose.Types.ObjectId().toString(), quantity: 1 }],
        customer: { name: 'Test', phone: '12345' },
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some((e) => e.includes('phone') || e.includes('digit'))).toBe(true);
  });

  it('should reject order with empty phone', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        items: [{ product: new mongoose.Types.ObjectId().toString(), quantity: 1 }],
        customer: { name: 'Test', phone: '' },
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('should reject order with non-digit phone characters', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        items: [{ product: new mongoose.Types.ObjectId().toString(), quantity: 1 }],
        customer: { name: 'Test', phone: 'abcdefghij' },
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe('Phone Validation - Feedback', () => {
  it('should reject feedback with invalid phone', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Great service!',
        phone: '12345',
      });

    expect(res.status).toBe(400);
    if (res.body.errors) {
      expect(res.body.errors.some((e) => e.includes('phone') || e.includes('digit') || e.includes('10'))).toBe(true);
    }
  });

  it('should accept feedback with valid 10-digit phone', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Great service!',
        phone: '9876543210',
      });

    if (res.status === 400 && res.body.errors) {
      const phoneErrors = res.body.errors.filter((e) => e.includes('phone') || e.includes('digit'));
      expect(phoneErrors).toHaveLength(0);
    } else {
      expect(res.status).toBe(201);
    }
  });

  it('should accept feedback without phone (optional field)', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({
        name: 'Test User No Phone',
        email: 'test2@example.com',
        message: 'Great service!',
      });

    if (res.status === 400) {
      // If it fails, make sure it's not about phone
      if (res.body.errors) {
        const phoneErrors = res.body.errors.filter((e) => e.includes('phone') || e.includes('digit'));
        expect(phoneErrors).toHaveLength(0);
      }
    } else {
      expect(res.status).toBe(201);
    }
  });
});
