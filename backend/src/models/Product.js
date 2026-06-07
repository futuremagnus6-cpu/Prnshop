const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    images: [
      {
        type: String,
      },
    ],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
    },
    barcode: {
      type: String,
      default: '',
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    mrp: {
      type: Number,
      required: [true, 'MRP is required'],
      min: [0, 'MRP cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    prescriptionRequired: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: '',
    },
    dosage: {
      type: String,
      default: '',
    },
    manufacturer: {
      type: String,
      default: '',
    },
    gst: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    totalSold: {
      type: Number,
      default: 0,
    },
    isLowStock: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook to compute isLowStock
productSchema.pre('save', function () {
  this.isLowStock = this.stockQuantity <= this.lowStockThreshold;
});

// Post-findOneAndUpdate hook to keep isLowStock in sync
// Handles stock changes via findByIdAndUpdate (e.g., order cancellation stock restore)
productSchema.post('findOneAndUpdate', async function (doc) {
  if (doc) {
    const update = this.getUpdate();
    // Only recalculate if stock-related fields changed
    if (update && ('stockQuantity' in update || '$inc' in update)) {
      const freshDoc = await doc.constructor.findById(doc._id);
      if (freshDoc) {
        freshDoc.isLowStock = freshDoc.stockQuantity <= freshDoc.lowStockThreshold;
        // Use updateOne to avoid re-triggering hooks
        await freshDoc.constructor.updateOne(
          { _id: freshDoc._id },
          { $set: { isLowStock: freshDoc.isLowStock } }
        );
      }
    }
  }
});

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ barcode: 1 });
productSchema.index({ category: 1, isActive: 1 });
// Performance indexes for common query patterns
productSchema.index({ totalSold: -1, isActive: 1 });
productSchema.index({ expiryDate: 1, isActive: 1 });
productSchema.index({ stockQuantity: 1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ sellingPrice: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
