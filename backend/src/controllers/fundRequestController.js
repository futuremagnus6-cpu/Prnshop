const FundRequest = require('../models/FundRequest');
const { paginate } = require('../utils/helpers');
const path = require('path');
const fs = require('fs');

// @desc    Get all fund requests (admin)
// @route   GET /api/fund-requests
const getFundRequests = async (req, res, next) => {
  try {
    const { page, limit, search, status, transactionMethod, dateFrom, dateTo, sortBy, sortOrder } = req.query;
    const { pageNum, limitNum, skip } = paginate(page, limit);

    const filter = {};

    // Search by requestId or companyName
    if (search) {
      filter.$or = [
        { requestId: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { requestTitle: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by status
    if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
      filter.status = status;
    }

    // Filter by transaction method
    if (transactionMethod) {
      filter.transactionMethod = transactionMethod;
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      filter.dateSent = {};
      if (dateFrom) filter.dateSent.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.dateSent.$lte = endDate;
      }
    }

    // Sorting
    const sortField = sortBy || 'createdAt';
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    const [requests, total] = await Promise.all([
      FundRequest.find(filter)
        .populate('createdBy', 'name email')
        .skip(skip)
        .limit(limitNum)
        .sort({ [sortField]: sortDir }),
      FundRequest.countDocuments(filter),
    ]);

    res.json({
      requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all fund requests for the public/user (non-admin)
// @route   GET /api/fund-requests/my
const getMyFundRequests = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const { pageNum, limitNum, skip } = paginate(page, limit);

    const filter = { createdBy: req.user._id };

    const [requests, total] = await Promise.all([
      FundRequest.find(filter)
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      FundRequest.countDocuments(filter),
    ]);

    res.json({
      requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single fund request
// @route   GET /api/fund-requests/:id
const getFundRequest = async (req, res, next) => {
  try {
    const request = await FundRequest.findById(req.params.id).populate('createdBy', 'name email');
    if (!request) return res.status(404).json({ message: 'Fund request not found' });
    res.json({ request });
  } catch (error) {
    next(error);
  }
};

// @desc    Create fund request
// @route   POST /api/fund-requests
const createFundRequest = async (req, res, next) => {
  try {
    const { requestTitle, companyName, requestedAmount, dateSent, transactionMethod, transactionReference, notes } = req.body;

    // Check for duplicate transaction reference
    if (transactionReference) {
      const existing = await FundRequest.findOne({ transactionReference });
      if (existing) {
        return res.status(400).json({ message: 'Transaction reference number already exists. Please use a unique number.' });
      }
    }

    // Auto-generate unique requestId (supports concurrent requests)
    const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();

    const requestData = {
      requestId: `FR-${timestamp}-${random}`,
      requestTitle,
      companyName: companyName || '',
      requestedAmount: Number(requestedAmount),
      dateSent: dateSent || undefined,
      transactionMethod: transactionMethod || undefined,
      transactionReference: transactionReference || '',
      notes: notes || '',
    };

    // Attach uploaded file if present
    if (req.file) {
      requestData.proofFile = `/uploads/${req.file.filename}`;
    }

    // Attach user if authenticated
    if (req.user) {
      requestData.createdBy = req.user._id;
    }

    const fundRequest = await FundRequest.create(requestData);
    res.status(201).json({ message: 'Fund request submitted successfully', request: fundRequest });
  } catch (error) {
    next(error);
  }
};

// @desc    Update fund request (admin)
// @route   PUT /api/fund-requests/:id
const updateFundRequest = async (req, res, next) => {
  try {
    // Check for duplicate transaction reference (exclude current request)
    if (req.body.transactionReference) {
      const existing = await FundRequest.findOne({
        transactionReference: req.body.transactionReference,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(400).json({ message: 'Transaction reference number already exists. Please use a unique number.' });
      }
    }

    const allowedFields = [
      'requestTitle', 'companyName', 'requestedAmount',
      'dateSent', 'transactionMethod', 'transactionReference', 'notes',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = field === 'requestedAmount'
          ? Number(req.body[field])
          : req.body[field];
      }
    }

    // Handle file upload
    if (req.file) {
      // Delete old proof file if it exists
      const existing = await FundRequest.findById(req.params.id);
      if (existing && existing.proofFile) {
        const oldPath = path.resolve(__dirname, '../../', existing.proofFile.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      updates.proofFile = `/uploads/${req.file.filename}`;
    }

    const fundRequest = await FundRequest.findByIdAndUpdate(
      req.params.id,
      updates,
      { returnDocument: 'after', runValidators: true }
    );

    if (!fundRequest) return res.status(404).json({ message: 'Fund request not found' });
    res.json({ message: 'Fund request updated', request: fundRequest });
  } catch (error) {
    next(error);
  }
};

// @desc    Update fund request status (admin)
// @route   PATCH /api/fund-requests/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const { status, adminComments } = req.body;

    if (!status || !['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required (pending, accepted, rejected)' });
    }

    const updates = { status };
    if (adminComments !== undefined) {
      updates.adminComments = adminComments;
    }

    const fundRequest = await FundRequest.findByIdAndUpdate(
      req.params.id,
      updates,
      { returnDocument: 'after', runValidators: true }
    );

    if (!fundRequest) return res.status(404).json({ message: 'Fund request not found' });
    res.json({ message: `Status updated to ${status}`, request: fundRequest });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete fund request (admin)
// @route   DELETE /api/fund-requests/:id
const deleteFundRequest = async (req, res, next) => {
  try {
    const fundRequest = await FundRequest.findById(req.params.id);
    if (!fundRequest) return res.status(404).json({ message: 'Fund request not found' });

    // Delete associated proof file
    if (fundRequest.proofFile) {
      const filePath = path.resolve(__dirname, '../../', fundRequest.proofFile.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await FundRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Fund request deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Download proof file
// @route   GET /api/fund-requests/:id/proof
const downloadProof = async (req, res, next) => {
  try {
    const fundRequest = await FundRequest.findById(req.params.id);
    if (!fundRequest) return res.status(404).json({ message: 'Fund request not found' });
    if (!fundRequest.proofFile) return res.status(404).json({ message: 'No proof file uploaded' });

    const filePath = path.resolve(__dirname, '../../', fundRequest.proofFile.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on server' });

    res.download(filePath);
  } catch (error) {
    next(error);
  }
};

// @desc    Export fund requests as CSV
// @route   GET /api/fund-requests/export/csv
const exportCSV = async (req, res, next) => {
  try {
    const { search, status, transactionMethod, dateFrom, dateTo } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { requestId: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
      filter.status = status;
    }
    if (transactionMethod) {
      filter.transactionMethod = transactionMethod;
    }
    if (dateFrom || dateTo) {
      filter.dateSent = {};
      if (dateFrom) filter.dateSent.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.dateSent.$lte = endDate;
      }
    }

    const requests = await FundRequest.find(filter).sort({ createdAt: -1 });

    // Generate CSV
    const headers = [
      'Request ID', 'Title', 'Requested Amount',
      'Date Sent', 'Transaction Method', 'Reference No', 'Status', 'Notes',
      'Admin Comments', 'Created At',
    ];

    const csvRows = [headers.join(',')];
    for (const r of requests) {
      csvRows.push([
        r.requestId,
        `"${(r.requestTitle || '').replace(/"/g, '""')}"`,
        r.requestedAmount || 0,
        r.dateSent ? new Date(r.dateSent).toLocaleDateString() : '',
        r.transactionMethod || '',
        `"${(r.transactionReference || '').replace(/"/g, '""')}"`,
        r.status,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
        `"${(r.adminComments || '').replace(/"/g, '""')}"`,
        r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=fund-requests.csv');
    res.send(csvRows.join('\n'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFundRequests,
  getMyFundRequests,
  getFundRequest,
  createFundRequest,
  updateFundRequest,
  updateStatus,
  deleteFundRequest,
  downloadProof,
  exportCSV,
};
