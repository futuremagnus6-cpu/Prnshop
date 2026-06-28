const Product = require('../models/Product');
const Category = require('../models/Category');
const Alert = require('../models/Alert');
const InventoryLog = require('../models/InventoryLog');
const { paginate, generateSlug } = require('../utils/helpers');

// @desc    Get all products
// @route   GET /api/products
const getProducts = async (req, res, next) => {
  try {
    const { page, limit, search, category, minPrice, maxPrice, sort, featured, active, inStock } = req.query;
    const { pageNum, limitNum, skip } = paginate(page, limit);

    const filter = {};
    if (active !== 'false') filter.isActive = true;
    if (featured === 'true') filter.isFeatured = true;
    if (category) filter.category = category;
    if (inStock === 'true') filter.stockQuantity = { $gt: 0 };
    if (minPrice || maxPrice) {
      filter.sellingPrice = {};
      if (minPrice) filter.sellingPrice.$gte = Number(minPrice);
      if (maxPrice) filter.sellingPrice.$lte = Number(maxPrice);
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { sellingPrice: 1 };
    if (sort === 'price_desc') sortOption = { sellingPrice: -1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === 'bestseller') sortOption = { totalSold: -1 };
    if (sort === 'in_stock') sortOption = { stockQuantity: -1, createdAt: -1 };

    let query = Product.find(filter);

    if (search) {
      query = Product.find(
        { $text: { $search: search }, ...filter },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } });
    }

    const [products, total] = await Promise.all([
      query.populate('category', 'name slug').skip(skip).limit(limitNum).sort(sortOption),
      Product.countDocuments(filter),
    ]);

    res.json({
      products,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name slug');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product by barcode
// @route   GET /api/products/barcode/:barcode
const getProductByBarcode = async (req, res, next) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode }).populate(
      'category',
      'name slug'
    );
    if (!product) return res.status(404).json({ message: 'Product not found by barcode' });
    res.json({ product });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/products
const createProduct = async (req, res, next) => {
  try {
    // Handle images from FormData (URLs + uploaded files)
    const productData = { ...req.body };
    
    // Parse image URLs from JSON string
    if (typeof productData.images === 'string') {
      try {
        productData.images = JSON.parse(productData.images);
      } catch {
        productData.images = productData.images ? [productData.images] : [];
      }
    }
    if (!Array.isArray(productData.images)) productData.images = [];
    
    // Add uploaded file paths
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        productData.images.push(file.filename);
      });
    }
    
    // Generate slug from name
    if (productData.name && !productData.slug) {
      productData.slug = generateSlug(productData.name) + '-' + Date.now().toString(36);
    }
    
    // Convert numeric fields
    if (productData.mrp) productData.mrp = Number(productData.mrp);
    if (productData.sellingPrice) productData.sellingPrice = Number(productData.sellingPrice);
    if (productData.stockQuantity) productData.stockQuantity = Number(productData.stockQuantity);
    if (productData.gst) productData.gst = Number(productData.gst);
    if (productData.lowStockThreshold) productData.lowStockThreshold = Number(productData.lowStockThreshold);
    if (productData.prescriptionRequired === 'true') productData.prescriptionRequired = true;
    if (productData.isFeatured === 'true') productData.isFeatured = true;

    const product = await Product.create(productData);

    // Create low stock alert if initial stock is below threshold
    if (product.stockQuantity <= product.lowStockThreshold) {
      await Alert.create({
        type: 'low_stock',
        message: `Low stock: ${product.name} (${product.stockQuantity} remaining)`,
        severity: 'warning',
        relatedTo: { model: 'Product', id: product._id },
      });
    }

    await InventoryLog.create({
      product: product._id,
      productName: product.name,
      changeType: 'purchase',
      quantityChange: product.stockQuantity,
      quantityBefore: 0,
      quantityAfter: product.stockQuantity,
      notes: 'Initial stock entry',
    });
    res.status(201).json({ message: 'Product created', product });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
const updateProduct = async (req, res, next) => {
  try {
    // Handle images from FormData (URLs + uploaded files)
    const updateData = { ...req.body };
    
    // Parse image URLs from JSON string
    if (typeof updateData.images === 'string') {
      try {
        updateData.images = JSON.parse(updateData.images);
      } catch {
        updateData.images = updateData.images ? [updateData.images] : [];
      }
    }
    if (!Array.isArray(updateData.images)) updateData.images = [];
    
    // Keep existing images and add uploaded file paths
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        updateData.images.push(file.filename);
      });
    }
    
    // Generate slug from name if name changed
    if (updateData.name && !updateData.slug) {
      updateData.slug = generateSlug(updateData.name) + '-' + Date.now().toString(36);
    }
    
    // Convert numeric fields
    if (updateData.mrp) updateData.mrp = Number(updateData.mrp);
    if (updateData.sellingPrice) updateData.sellingPrice = Number(updateData.sellingPrice);
    if (updateData.stockQuantity) updateData.stockQuantity = Number(updateData.stockQuantity);
    if (updateData.gst) updateData.gst = Number(updateData.gst);
    if (updateData.lowStockThreshold) updateData.lowStockThreshold = Number(updateData.lowStockThreshold);
    if (updateData.prescriptionRequired === 'true') updateData.prescriptionRequired = true;
    if (updateData.isFeatured === 'true') updateData.isFeatured = true;

    const oldProduct = await Product.findById(req.params.id);
    if (!oldProduct) return res.status(404).json({ message: 'Product not found' });

    // Check if stock changed
    const stockChanged = 'stockQuantity' in updateData && updateData.stockQuantity !== oldProduct.stockQuantity;

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      returnDocument: 'after',
      runValidators: true,
    });

    // Create low stock alert if stock was reduced below threshold
    if (stockChanged && product.stockQuantity <= product.lowStockThreshold) {
      await Alert.create({
        type: 'low_stock',
        message: `Low stock: ${product.name} (${product.stockQuantity} remaining)`,
        severity: 'warning',
        relatedTo: { model: 'Product', id: product._id },
      });
    }

    res.json({ message: 'Product updated', product });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get low stock products
// @route   GET /api/products/low-stock
const getLowStockProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
    })
      .populate('category', 'name')
      .sort({ stockQuantity: 1 });
    res.json({ products });
  } catch (error) {
    next(error);
  }
};

// @desc    Get expiring products
// @route   GET /api/products/expiring
const getExpiringProducts = async (req, res, next) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const products = await Product.find({
      isActive: true,
      expiryDate: { $lte: thirtyDaysFromNow },
    })
      .populate('category', 'name')
      .sort({ expiryDate: 1 });
    res.json({ products });
  } catch (error) {
    next(error);
  }
};

// @desc    Update stock
// @route   PUT /api/products/:id/stock
const updateStock = async (req, res, next) => {
  try {
    const { quantity, notes } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const before = product.stockQuantity;
    product.stockQuantity = quantity;
    await product.save();

    // Create low stock alert if stock is now below threshold
    if (product.stockQuantity <= product.lowStockThreshold) {
      await Alert.create({
        type: 'low_stock',
        message: `Low stock: ${product.name} (${product.stockQuantity} remaining)`,
        severity: 'warning',
        relatedTo: { model: 'Product', id: product._id },
      });
    }

    await InventoryLog.create({
      product: product._id,
      productName: product.name,
      changeType: 'adjustment',
      quantityChange: quantity - before,
      quantityBefore: before,
      quantityAfter: quantity,
      notes: notes || 'Manual stock adjustment',
    });

    res.json({ message: 'Stock updated', product });
  } catch (error) {
    next(error);
  }
};

// @desc    Get best selling products
// @route   GET /api/products/best-selling
const getBestSelling = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ totalSold: -1 })
      .limit(10)
      .populate('category', 'name');
    res.json({ products });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getExpiringProducts,
  updateStock,
  getBestSelling,
};
