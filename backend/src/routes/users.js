const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const userController = require('../controllers/userController');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);

// Create a new manager (admin only, does not require auth middleware's role check since we use authorize)
router.post(
  '/create-manager',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  userController.createManager
);

router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('role').optional().isIn(['user', 'admin', 'manager']).withMessage('Invalid role'),
  ],
  validate,
  userController.updateUser
);

router.delete('/:id', userController.deleteUser);

module.exports = router;
