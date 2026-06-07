const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.get('/', authenticate, authorize('admin', 'superadmin'), dashboardController.getDashboardStats);

module.exports = router;
