const express = require('express');
const { authenticate } = require('../middleware/auth');
const cartController = require('../controllers/cartController');

const router = express.Router();

// All cart routes require authentication
router.use(authenticate);

router.get('/', cartController.getCart);
router.put('/', cartController.syncCart);
router.delete('/', cartController.clearCart);

module.exports = router;
