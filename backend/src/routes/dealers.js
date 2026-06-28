const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const dealerController = require('../controllers/dealerController');

const router = express.Router();

router.use(authenticate);

router.get('/', dealerController.getDealers);
router.get('/:id', dealerController.getDealer);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Dealer name is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('phone').matches(/^\d{10}$/).withMessage('Phone must be exactly 10 digits'),
  ],
  validate,
  dealerController.createDealer
);

router.put(
  '/:id',
  authorize('admin', 'superadmin'),
  [
    body('name').optional().trim().notEmpty().withMessage('Dealer name cannot be empty'),
    body('phone').optional().trim().notEmpty().withMessage('Phone cannot be empty'),
    body('phone').optional().matches(/^\d{10}$/).withMessage('Phone must be exactly 10 digits'),
  ],
  validate,
  dealerController.updateDealer
);
router.delete('/:id', authorize('admin', 'superadmin'), dealerController.deleteDealer);

module.exports = router;
