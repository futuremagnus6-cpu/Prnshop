const Category = require('../models/Category');
const Product = require('../models/Product');

// @desc    Get all categories
// @route   GET /api/categories
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.aggregate([
      { $sort: { order: 1, name: 1 } },
      {
        $lookup: {
          from: 'products',
          let: { categoryId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$category', '$$categoryId'] }, { $eq: ['$isActive', true] }] } } },
            { $count: 'count' },
          ],
          as: 'productCountLookup',
        },
      },
      {
        $addFields: {
          productCount: {
            $ifNull: [{ $arrayElemAt: ['$productCountLookup.count', 0] }, 0],
          },
        },
      },
      { $project: { productCountLookup: 0 } },
    ]);
    res.json({ categories });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
const getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ category });
  } catch (error) {
    next(error);
  }
};

const { generateSlug } = require('../utils/helpers');

// @desc    Create category
// @route   POST /api/categories
const createCategory = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (!data.slug) {
      data.slug = generateSlug(data.name);
    }
    const category = await Category.create(data);
    res.status(201).json({ message: 'Category created', category });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
const updateCategory = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.name && !data.slug) {
      data.slug = generateSlug(data.name);
    }
    const category = await Category.findByIdAndUpdate(req.params.id, data, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category updated', category });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    const productCount = await Product.countDocuments({ category: req.params.id });
    if (productCount > 0)
      return res
        .status(400)
        .json({ message: `Cannot delete category with ${productCount} products` });

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCategories, getCategory, createCategory, updateCategory, deleteCategory };
