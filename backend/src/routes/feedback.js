const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const feedbackController = require('../controllers/feedbackController');

const router = express.Router();

// Public route
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('phone').optional({ values: 'falsy' }).matches(/^\d{10}$/).withMessage('Phone must be exactly 10 digits'),
  ],
  validate,
  feedbackController.submitFeedback
);

// Admin routes
router.get('/', authenticate, authorize('admin', 'superadmin'), feedbackController.getFeedback);
router.put('/:id/read', authenticate, authorize('admin', 'superadmin'), feedbackController.markFeedbackRead);
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), feedbackController.deleteFeedback);

module.exports = router;
