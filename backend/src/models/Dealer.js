const mongoose = require('mongoose');

const dealerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Dealer name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
    },
    email: {
      type: String,
      default: '',
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    gstNumber: {
      type: String,
      default: '',
    },
    totalPurchases: {
      type: Number,
      default: 0,
    },
    pendingAmount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

dealerSchema.index({ name: 'text' });
// Performance index for listing queries
dealerSchema.index({ isActive: 1, createdAt: -1 });
dealerSchema.index({ pendingAmount: -1 });

module.exports = mongoose.model('Dealer', dealerSchema);
