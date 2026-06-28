const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const earningsController = require('../controllers/earningsController');

const router = express.Router();

router.get('/', authenticate, authorize('admin', 'superadmin'), earningsController.getEarnings);

module.exports = router;
