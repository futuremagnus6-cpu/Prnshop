const Razorpay = require('razorpay');
const { validatePaymentVerification } = require('razorpay/dist/utils/razorpay-utils');
const config = require('../config/env');

// Lazily initialize Razorpay so missing keys don't crash the server on startup
const getRazorpayInstance = () => {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    return null;
  }
  return new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });
};

// @desc    Create a Razorpay order
// @route   POST /api/payments/create-order
const createRazorpayOrder = async (req, res, next) => {
  try {
    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return res.status(503).json({ message: 'Payment gateway not configured. Contact the administrator.' });
    }

    const { amount, currency = 'INR', receipt } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: {
        userId: req.user?._id?.toString() || '',
      },
    };

    const order = await razorpay.orders.create(options);

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay payment signature
// @route   POST /api/payments/verify
const verifyPayment = async (req, res, next) => {
  try {
    if (!config.razorpay.keySecret) {
      return res.status(503).json({ message: 'Payment gateway not configured.' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    const isValid = validatePaymentVerification(
      {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
      },
      razorpay_signature,
      config.razorpay.keySecret
    );

    if (isValid) {
      res.json({ verified: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ verified: false, message: 'Invalid payment signature' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get Razorpay key for frontend
// @route   GET /api/payments/key
const getRazorpayKey = (_req, res) => {
  if (!config.razorpay.keyId) {
    return res.status(503).json({ key: '', message: 'Payment gateway not configured.' });
  }
  res.json({ key: config.razorpay.keyId });
};

module.exports = { createRazorpayOrder, verifyPayment, getRazorpayKey };
