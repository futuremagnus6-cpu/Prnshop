const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Get user's cart
// @route   GET /api/cart
const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate(
      'items.product',
      'name sellingPrice mrp images stockQuantity isActive'
    );

    if (!cart) {
      return res.json({ items: [] });
    }

    // Filter out items whose products no longer exist or are inactive
    const validItems = cart.items.filter(
      (item) => item.product && item.product.isActive !== false
    );

    res.json({ items: validItems });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync cart (replace all items)
// @route   PUT /api/cart
const syncCart = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items must be an array' });
    }

    // Validate each item has product ID and quantity
    const validItems = items.filter(
      (item) => item.product && item.quantity > 0
    );

    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        items: validItems.map((item) => ({
          product: item.product,
          name: item.name || '',
          sellingPrice: item.sellingPrice || 0,
          mrp: item.mrp || 0,
          image: item.image || '',
          quantity: Math.max(1, item.quantity),
          stock: item.stock || 0,
        })),
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    ).populate('items.product', 'name sellingPrice mrp images stockQuantity isActive');

    res.json({ message: 'Cart synced', items: cart.items });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
const clearCart = async (req, res, next) => {
  try {
    await Cart.findOneAndDelete({ user: req.user._id });
    res.json({ message: 'Cart cleared', items: [] });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCart, syncCart, clearCart };
