const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadProof } = require('../middleware/upload');
const fundRequestController = require('../controllers/fundRequestController');

const router = express.Router();

// Public: Create a fund request (auth optional)
router.post(
  '/',
  uploadProof.single('proofFile'),
  [
    body('requestTitle').trim().notEmpty().withMessage('Request title is required'),
    body('requestedAmount').isNumeric().withMessage('Requested amount must be a number'),
  ],
  validate,
  fundRequestController.createFundRequest
);

// Export CSV (admin only, must be before /:id routes)
router.get('/export/csv', authenticate, authorize('admin', 'superadmin'), fundRequestController.exportCSV);

// Authenticated routes
router.get('/my', authenticate, fundRequestController.getMyFundRequests);

router.use(authenticate);

router.get('/', authorize('admin', 'superadmin'), fundRequestController.getFundRequests);
router.get('/:id', fundRequestController.getFundRequest);
router.get('/:id/proof', fundRequestController.downloadProof);

router.put(
  '/:id',
  authorize('admin', 'superadmin'),
  uploadProof.single('proofFile'),
  [
    body('requestTitle').optional().trim().notEmpty().withMessage('Request title cannot be empty'),
    body('requestedAmount').optional().isNumeric().withMessage('Requested amount must be a number'),
  ],
  validate,
  fundRequestController.updateFundRequest
);

router.patch(
  '/:id/status',
  authorize('admin', 'superadmin'),
  [
    body('status').isIn(['pending', 'accepted', 'rejected']).withMessage('Status must be pending, accepted, or rejected'),
  ],
  validate,
  fundRequestController.updateStatus
);

router.delete('/:id', authorize('admin', 'superadmin'), fundRequestController.deleteFundRequest);

module.exports = router;
