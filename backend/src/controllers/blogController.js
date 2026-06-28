const Blog = require('../models/Blog');
const { paginate, generateSlug } = require('../utils/helpers');

// @desc    Upload blog media (image or video)
// @route   POST /api/blogs/upload
const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    const isVideo = req.file.mimetype.startsWith('video/');
    res.json({
      url: fileUrl,
      type: isVideo ? 'video' : 'image',
      filename: req.file.filename,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all blogs
// @route   GET /api/blogs
const getBlogs = async (req, res, next) => {
  try {
    const { page, limit, type, category, search } = req.query;
    const { pageNum, limitNum, skip } = paginate(page, limit);

    const filter = { isPublished: true };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .populate('author', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Blog.countDocuments(filter),
    ]);

    res.json({
      blogs,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single blog
// @route   GET /api/blogs/:id
const getBlog = async (req, res, next) => {
  try {
    let blog;
    // Try by ID or slug
    blog = await Blog.findById(req.params.id).populate('author', 'name');
    if (!blog) blog = await Blog.findOne({ slug: req.params.id }).populate('author', 'name');
    if (!blog) return res.status(404).json({ message: 'Blog not found' });

    blog.views += 1;
    await blog.save();

    res.json({ blog });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin get all blogs (including drafts)
// @route   GET /api/blogs/all
const adminGetBlogs = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const { pageNum, limitNum, skip } = paginate(page, limit);

    const [blogs, total] = await Promise.all([
      Blog.find()
        .populate('author', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Blog.countDocuments(),
    ]);

    res.json({
      blogs,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create blog
// @route   POST /api/blogs
const createBlog = async (req, res, next) => {
  try {
    const blogData = { ...req.body };
    blogData.author = req.user._id;
    
    // Handle uploaded file for image
    if (req.files) {
      if (req.files.image && req.files.image.length > 0) {
        blogData.image = `/uploads/${req.files.image[0].filename}`;
      }
      if (req.files.video && req.files.video.length > 0) {
        blogData.videoUrl = `/uploads/${req.files.video[0].filename}`;
        blogData.type = 'video';
      }
    }
    
    if (blogData.title && !blogData.slug) {
      blogData.slug = generateSlug(blogData.title) + '-' + Date.now().toString(36);
    }
    
    // Parse tags if string
    if (typeof blogData.tags === 'string') {
      blogData.tags = blogData.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
    
    const blog = await Blog.create(blogData);
    res.status(201).json({ message: 'Blog created', blog });
  } catch (error) {
    next(error);
  }
};

// @desc    Update blog
// @route   PUT /api/blogs/:id
const updateBlog = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    
    // Handle uploaded file for image
    if (req.files) {
      if (req.files.image && req.files.image.length > 0) {
        updateData.image = `/uploads/${req.files.image[0].filename}`;
      }
      if (req.files.video && req.files.video.length > 0) {
        updateData.videoUrl = `/uploads/${req.files.video[0].filename}`;
        updateData.type = 'video';
      }
    }
    
    // Parse tags if string
    if (typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
    
    const blog = await Blog.findByIdAndUpdate(req.params.id, updateData, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.json({ message: 'Blog updated', blog });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
const deleteBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.json({ message: 'Blog deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadMedia,
  getBlogs,
  getBlog,
  adminGetBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
};
