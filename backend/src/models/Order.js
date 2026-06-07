const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: String,
    batchNumber: String,
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    mrp: Number,
    sellingPrice: Number,
    gst: Number,
    totalPrice: Number,
  },
  { _id: false }
);

const customerOrderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    customerName: String,
    customerId: String,
    customerPhone: String,
    products: [orderItemSchema],
    totalAmount: Number,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },
    orderType: {
      type: String,
      enum: ['pos', 'online'],
      required: true,
    },
    status: {
      type: String,
      enum: ['preorder', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'rejected'],
      default: 'preorder',
    },
    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dealer',
    },
    dealerName: String,
    dealerPhone: String,
    dealerAddress: String,
    customers: [customerOrderSchema],
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
    },
    totalGst: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid'],
      default: 'pending',
    },
    payments: [
      {
        method: {
          type: String,
          enum: ['cash', 'upi', 'card', 'credit', 'company', 'cod'],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        transactionId: String,
        reference: String,
      },
    ],
    prescription: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    // Razorpay payment fields
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },
    // Shipping / Blue Dart fields
    shipping: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      courierPartner: { type: String, default: 'Blue Dart' },
      trackingNumber: { type: String, default: '' },
      estimatedDelivery: { type: Date },
      shippedAt: { type: Date },
      deliveredAt: { type: Date },
      shippingCost: { type: Number, default: 0 },
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Status timestamps for order tracking timeline
    confirmedAt: { type: Date },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ status: 1, orderType: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ dealer: 1 });
// Performance indexes for common query patterns
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ orderType: 1, status: 1, createdAt: -1 });
orderSchema.index({ processedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
