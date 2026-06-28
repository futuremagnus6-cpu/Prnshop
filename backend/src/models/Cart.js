const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, default: '' },
    sellingPrice: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    image: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    stock: { type: Number, default: 0 },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
  },
  { timestamps: true }
);


module.exports = mongoose.model('Cart', cartSchema);
