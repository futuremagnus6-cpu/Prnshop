const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const orderController = require('../controllers/orderController');

const router = express.Router();

// Stats
router.get('/stats', authenticate, authorize('admin', 'superadmin'), orderController.getOrderStats);
router.get('/pending', authenticate, authorize('admin', 'superadmin'), orderController.getPendingOrders);
router.get('/pre-orders', authenticate, authorize('admin', 'superadmin', 'manager'), orderController.getPreOrders);

// POS order
router.post(
  '/pos',
  authenticate,
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.product').notEmpty().withMessage('Product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validate,
  orderController.createPOSOrder
);

// Online order (public with auth)
router.post(
  '/online',
  authenticate,
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('customerId').notEmpty().withMessage('Customer ID is required'),
  ],
  validate,
  orderController.createOnlineOrder
);

// Web checkout order (authenticated users)
router.post(
  '/',
  authenticate,
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('customer.name').notEmpty().withMessage('Customer name is required'),
    body('customer.phone').notEmpty().withMessage('Customer phone is required'),
    body('customer.phone').matches(/^\d{10}$/).withMessage('Customer phone must be exactly 10 digits'),
  ],
  validate,
  orderController.createWebOrder
);

// Update shipping/tracking
router.put('/:id/shipping', authenticate, authorize('admin', 'superadmin'), orderController.updateShipping);

// Confirm pre-order
router.put('/:id/confirm', authenticate, authorize('admin', 'superadmin', 'manager'), orderController.confirmPreOrder);

// Update pre-order
router.put('/:id/pre-order', authenticate, authorize('admin', 'superadmin', 'manager'), orderController.updatePreOrder);

// Check transaction ID uniqueness
router.get('/check-transaction/:txnId', authenticate, orderController.checkTransactionId);

// Get orders
router.get('/', authenticate, orderController.getOrders);
router.get('/my', authenticate, orderController.getMyOrders);
router.get('/:id', authenticate, orderController.getOrder);
// Update status
router.put(
  '/:id/status',
  authenticate,
  authorize('admin', 'superadmin'),
  [body('status').isIn(['preorder', 'pending', 'confirmed', 'rejected', 'delivered', 'cancelled']).withMessage('Invalid status')],
  validate,
  orderController.updateOrderStatus
);

module.exports = router;
