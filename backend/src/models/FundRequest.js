const mongoose = require('mongoose');

const fundRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      unique: true,
    },
    requestTitle: {
      type: String,
      required: [true, 'Request title is required'],
      trim: true,
    },
    companyName: {
      type: String,
      default: '',
      trim: true,
    },
    requestedAmount: {
      type: Number,
      required: [true, 'Requested amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    amountSent: {
      type: Number,
      default: 0,
      min: [0, 'Amount sent cannot be negative'],
    },
    dateSent: {
      type: Date,
    },
    transactionMethod: {
      type: String,
      enum: ['Cash', 'Cheque', 'RTGS', 'NEFT', 'UPI', 'Bank Transfer'],
    },
    transactionReference: {
      type: String,
      default: '',
      trim: true,
      unique: true,
      sparse: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    proofFile: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    adminComments: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

fundRequestSchema.index({ requestId: 1 });
fundRequestSchema.index({ status: 1, createdAt: -1 });
fundRequestSchema.index({ companyName: 'text', requestTitle: 'text' });



module.exports = mongoose.model('FundRequest', fundRequestSchema);
