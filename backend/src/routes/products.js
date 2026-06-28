const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const upload = require('../middleware/upload');
const productController = require('../controllers/productController');

const router = express.Router();

// Public routes
router.get('/', productController.getProducts);
router.get('/best-selling', productController.getBestSelling);
router.get('/barcode/:barcode', productController.getProductByBarcode);
router.get('/:id', productController.getProduct);

// Protected routes (admin/staff)
router.use(authenticate);

router.get('/low-stock/all', productController.getLowStockProducts);
router.get('/expiring/all', productController.getExpiringProducts);

router.post(
  '/',
  authorize('admin', 'superadmin'),
  upload.array('images', 5),
  [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('mrp').isNumeric().withMessage('MRP must be a number'),
    body('sellingPrice').isNumeric().withMessage('Selling price must be a number'),
    body('stockQuantity').isInt({ min: 0 }).withMessage('Stock must be a non-negative number'),
    body('expiryDate').isISO8601().withMessage('Valid expiry date is required'),
    body('batchNumber').notEmpty().withMessage('Batch number is required'),
  ],
  validate,
  productController.createProduct
);

router.put(
  '/:id',
  authorize('admin', 'superadmin'),
  upload.array('images', 5),
  productController.updateProduct
);

router.put(
  '/:id/stock',
  authorize('admin', 'superadmin'),
  [body('quantity').isInt({ min: 0 }).withMessage('Stock must be a non-negative number')],
  validate,
  productController.updateStock
);

router.delete('/:id', authorize('admin', 'superadmin'), productController.deleteProduct);

module.exports = router;
