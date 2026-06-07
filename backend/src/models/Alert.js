const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'low_stock',
        'expiry',
        'missing_customer_id',
        'new_order',
        'new_feedback',
        'preorder_created',
        'payment_pending',
        'system',
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },
    relatedTo: {
      model: {
        type: String,
        enum: ['Product', 'Order', 'Customer', 'Feedback', 'Dealer'],
      },
      id: mongoose.Schema.Types.ObjectId,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

alertSchema.index({ isRead: 1, createdAt: -1 });
alertSchema.index({ type: 1 });
// Performance index for type-filtered listing
alertSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
