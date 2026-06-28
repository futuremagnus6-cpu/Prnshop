const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const storeSettingController = require('../controllers/storeSettingController');

const router = express.Router();

// Public - get store settings
router.get('/', storeSettingController.getStoreSettings);

// Admin only - update store settings
router.put('/', authenticate, authorize('admin', 'superadmin'), storeSettingController.updateStoreSettings);

module.exports = router;
