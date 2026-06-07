const mongoose = require('mongoose');

const storeSettingSchema = new mongoose.Schema(
  {
    shopName: { type: String, default: 'Prandhara Pharmacy & Healthcare' },
    shopAddress: { type: String, default: '123, Medical Complex, Main Road, City - 123456' },
    shopPhone: { type: String, default: '+91 98765 43210' },
    shopEmail: { type: String, default: 'info@prandhara.com' },
    shopGstin: { type: String, default: '' },
    shopLicense: { type: String, default: '' },
    footerMessage: { type: String, default: 'Thank you for your business!' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StoreSetting', storeSettingSchema);
