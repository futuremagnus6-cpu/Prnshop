const StoreSetting = require('../models/StoreSetting');

// @desc    Get store settings (public)
// @route   GET /api/store-settings
const getStoreSettings = async (req, res, next) => {
  try {
    let settings = await StoreSetting.findOne();
    if (!settings) {
      settings = await StoreSetting.create({});
    }
    res.json({ settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Update store settings (admin only)
// @route   PUT /api/store-settings
const updateStoreSettings = async (req, res, next) => {
  try {
    const { shopName, shopAddress, shopPhone, shopEmail, shopGstin, shopLicense, footerMessage } = req.body;

    let settings = await StoreSetting.findOne();
    if (!settings) {
      settings = new StoreSetting();
    }

    if (shopName !== undefined) settings.shopName = shopName;
    if (shopAddress !== undefined) settings.shopAddress = shopAddress;
    if (shopPhone !== undefined) settings.shopPhone = shopPhone;
    if (shopEmail !== undefined) settings.shopEmail = shopEmail;
    if (shopGstin !== undefined) settings.shopGstin = shopGstin;
    if (shopLicense !== undefined) settings.shopLicense = shopLicense;
    if (footerMessage !== undefined) settings.footerMessage = footerMessage;
    settings.updatedBy = req.user._id;

    await settings.save();
    res.json({ message: 'Store settings updated', settings });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStoreSettings, updateStoreSettings };
