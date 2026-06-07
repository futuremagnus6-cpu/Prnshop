const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategory);

router.post(
  '/',
  authenticate,
  authorize('admin', 'superadmin'),
  [body('name').trim().notEmpty().withMessage('Category name is required')],
  validate,
  categoryController.createCategory
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'superadmin'),
  categoryController.updateCategory
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'superadmin'),
  categoryController.deleteCategory
);

module.exports = router;
