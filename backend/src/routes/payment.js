const express = require('express');
const { authenticate } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

// Public - frontend needs the key to initialize Razorpay
router.get('/key', paymentController.getRazorpayKey);

// Authenticated routes
router.post('/create-order', authenticate, paymentController.createRazorpayOrder);
router.post('/verify', authenticate, paymentController.verifyPayment);

module.exports = router;
