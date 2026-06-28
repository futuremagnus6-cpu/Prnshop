const Dealer = require('../models/Dealer');
const { paginate } = require('../utils/helpers');

// @desc    Get all dealers
// @route   GET /api/dealers
const getDealers = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const { pageNum, limitNum, skip } = paginate(page, limit);

    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [dealers, total] = await Promise.all([
      Dealer.find(filter).skip(skip).limit(limitNum).sort({ createdAt: -1 }),
      Dealer.countDocuments(filter),
    ]);

    res.json({
      dealers,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single dealer
// @route   GET /api/dealers/:id
const getDealer = async (req, res, next) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) return res.status(404).json({ message: 'Dealer not found' });
    res.json({ dealer });
  } catch (error) {
    next(error);
  }
};

// @desc    Create dealer
// @route   POST /api/dealers
const createDealer = async (req, res, next) => {
  try {
    req.body.addedBy = req.user._id;
    const dealer = await Dealer.create(req.body);
    res.status(201).json({ message: 'Dealer created', dealer });
  } catch (error) {
    next(error);
  }
};

// @desc    Update dealer
// @route   PUT /api/dealers/:id
const updateDealer = async (req, res, next) => {
  try {
    // Only allow specific fields to be updated to prevent overwriting protected data
    const allowedFields = ['name', 'phone', 'email', 'address', 'gstNumber', 'isActive'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const dealer = await Dealer.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!dealer) return res.status(404).json({ message: 'Dealer not found' });
    res.json({ message: 'Dealer updated', dealer });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete dealer
// @route   DELETE /api/dealers/:id
const deleteDealer = async (req, res, next) => {
  try {
    const dealer = await Dealer.findByIdAndDelete(req.params.id);
    if (!dealer) return res.status(404).json({ message: 'Dealer not found' });
    res.json({ message: 'Dealer deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDealers, getDealer, createDealer, updateDealer, deleteDealer };
