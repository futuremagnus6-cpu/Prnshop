const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    content: {
      type: String,
      default: '',
    },
    excerpt: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: 'general',
    },
    type: {
      type: String,
      enum: ['blog', 'video'],
      default: 'blog',
    },
    videoUrl: {
      type: String,
      default: '',
    },
    tags: [String],
    isPublished: {
      type: Boolean,
      default: false,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

blogSchema.index({ type: 1, isPublished: 1 });
blogSchema.index({ tags: 1 });
// Performance indexes for listing and filtering
blogSchema.index({ createdAt: -1 });
blogSchema.index({ isPublished: 1, type: 1, createdAt: -1 });
blogSchema.index({ isPublished: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model('Blog', blogSchema);
