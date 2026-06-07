const Customer = require('../models/Customer');
const { paginate } = require('../utils/helpers');

// @desc    Get all customers
// @route   GET /api/customers
const getCustomers = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const { pageNum, limitNum, skip } = paginate(page, limit);

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter).skip(skip).limit(limitNum).sort({ createdAt: -1 }),
      Customer.countDocuments(filter),
    ]);

    res.json({
      customers,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
const getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer by customerId
// @route   GET /api/customers/id/:customerId
const getCustomerByCustomerId = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ customerId: req.params.customerId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Create customer (auto-generates customerId)
// @route   POST /api/customers
const createCustomer = async (req, res, next) => {
  try {
    req.body.addedBy = req.user._id;
    const customer = await Customer.create(req.body);
    res.status(201).json({ message: 'Customer created', customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
const updateCustomer = async (req, res, next) => {
  try {
    // Only allow specific fields to be updated to prevent overwriting protected data
    const allowedFields = ['name', 'phone', 'email', 'address'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const customer = await Customer.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer updated', customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomer,
  getCustomerByCustomerId,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
