const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: String,
    changeType: {
      type: String,
      enum: ['sale', 'purchase', 'adjustment', 'return', 'expiry'],
      required: true,
    },
    quantityChange: {
      type: Number,
      required: true,
    },
    quantityBefore: Number,
    quantityAfter: Number,
    reference: {
      type: String,
      default: '',
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

inventoryLogSchema.index({ product: 1, createdAt: -1 });
inventoryLogSchema.index({ changeType: 1 });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
