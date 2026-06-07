const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const alertController = require('../controllers/alertController');

const router = express.Router();

router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/', alertController.getAlerts);
router.put('/read-all', alertController.markAllAsRead);
router.put('/:id/read', alertController.markAsRead);
router.delete('/:id', alertController.deleteAlert);

module.exports = router;
