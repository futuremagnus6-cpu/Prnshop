const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const customerController = require('../controllers/customerController');

const router = express.Router();

router.use(authenticate);

router.get('/', customerController.getCustomers);
router.get('/id/:customerId', customerController.getCustomerByCustomerId);
router.get('/:id', customerController.getCustomer);

router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Customer name is required')],
  validate,
  customerController.createCustomer
);

router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Customer name cannot be empty'),
    body('phone').optional().trim().notEmpty().withMessage('Phone cannot be empty'),
    body('phone').optional().matches(/^\d{10}$/).withMessage('Phone must be exactly 10 digits'),
  ],
  validate,
  customerController.updateCustomer
);
router.delete('/:id', authorize('admin', 'superadmin'), customerController.deleteCustomer);

module.exports = router;
