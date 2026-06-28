const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadImport } = require('../middleware/upload');
const importController = require('../controllers/importController');

const router = express.Router();

router.post(
  '/products',
  authenticate,
  authorize('admin', 'superadmin'),
  uploadImport.array('file', 1),
  importController.importProducts
);

module.exports = router;
