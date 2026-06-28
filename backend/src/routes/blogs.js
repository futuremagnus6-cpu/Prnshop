const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadBlogMedia } = require('../middleware/upload');
const blogController = require('../controllers/blogController');

const router = express.Router();

// Public routes
router.get('/', blogController.getBlogs);
router.get('/:id', blogController.getBlog);

// Admin routes
router.get('/admin/all', authenticate, authorize('admin', 'superadmin'), blogController.adminGetBlogs);

// Upload media route (image or video)
router.post(
  '/upload',
  authenticate,
  authorize('admin', 'superadmin'),
  uploadBlogMedia.single('media'),
  blogController.uploadMedia
);

router.post(
  '/',
  authenticate,
  authorize('admin', 'superadmin'),
  uploadBlogMedia.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]),
  [body('title').trim().notEmpty().withMessage('Title is required')],
  validate,
  blogController.createBlog
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'superadmin'),
  uploadBlogMedia.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]),
  blogController.updateBlog
);

router.delete('/:id', authenticate, authorize('admin', 'superadmin'), blogController.deleteBlog);

module.exports = router;
