const Order = require('../models/Order');

// Helper: pick group format based on date range width
const pickGroupFormat = (start, end) => {
  const diffMs = end.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 62) {
    // Within ~2 months → daily buckets
    return { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  }
  if (diffDays <= 730) {
    // Within ~2 years → monthly buckets
    return { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
  }
  // 2+ years → yearly buckets
  return { $dateToString: { format: '%Y', date: '$createdAt' } };
};

// @desc    Get earnings breakdown by period or custom date range
// @route   GET /api/earnings?period=day|week|month|year|all
// @route   GET /api/earnings?startDate=2025-01-01&endDate=2025-06-30
const getEarnings = async (req, res, next) => {
  try {
    const { period = 'all', startDate: startDateParam, endDate: endDateParam } = req.query;
    const now = new Date();

    // Determine whether custom date range is being used
    const isCustom = !!startDateParam;

    let startDate;
    let endDate;
    let groupFormat;
    let dateLabel;

    if (isCustom) {
      // Custom date range
      startDate = new Date(startDateParam);
      endDate = endDateParam ? new Date(endDateParam) : new Date(now);
      // Set endDate to end of day
      endDate.setHours(23, 59, 59, 999);
      groupFormat = pickGroupFormat(startDate, endDate);
      dateLabel = 'custom';
    } else {
      // Predefined period
      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
          dateLabel = 'daily';
          break;
        case 'week':
          startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
          groupFormat = { $dateToString: { format: '%G-W%V', date: '$createdAt' } };
          dateLabel = 'weekly';
          break;
        case 'month':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
          dateLabel = 'monthly';
          break;
        case 'year':
          startDate = new Date(now.getFullYear() - 4, 0, 1);
          groupFormat = { $dateToString: { format: '%Y', date: '$createdAt' } };
          dateLabel = 'yearly';
          break;
        case 'all':
        default:
          startDate = new Date(0);
          groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
          dateLabel = 'all';
          break;
      }
    }

    // Base match: only confirmed/delivered orders
    const baseMatch = { status: { $in: ['confirmed', 'delivered'] } };

    if (isCustom) {
      baseMatch.createdAt = { $gte: startDate, $lte: endDate };
    } else if (period !== 'all') {
      baseMatch.createdAt = { $gte: startDate };
    }

    // Overall breakdown by period buckets
    const breakdown = await Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: groupFormat,
          total: { $sum: '$grandTotal' },
          online: {
            $sum: { $cond: [{ $eq: ['$orderType', 'online'] }, '$grandTotal', 0] },
          },
          offline: {
            $sum: { $cond: [{ $eq: ['$orderType', 'pos'] }, '$grandTotal', 0] },
          },
          orderCount: { $sum: 1 },
          onlineOrders: {
            $sum: { $cond: [{ $eq: ['$orderType', 'online'] }, 1, 0] },
          },
          offlineOrders: {
            $sum: { $cond: [{ $eq: ['$orderType', 'pos'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // All-time summary (unfiltered)
    const summaryResult = await Order.aggregate([
      { $match: { status: { $in: ['confirmed', 'delivered'] } } },
      {
        $group: {
          _id: null,
          total: { $sum: '$grandTotal' },
          online: {
            $sum: { $cond: [{ $eq: ['$orderType', 'online'] }, '$grandTotal', 0] },
          },
          offline: {
            $sum: { $cond: [{ $eq: ['$orderType', 'pos'] }, '$grandTotal', 0] },
          },
          orderCount: { $sum: 1 },
          onlineOrders: {
            $sum: { $cond: [{ $eq: ['$orderType', 'online'] }, 1, 0] },
          },
          offlineOrders: {
            $sum: { $cond: [{ $eq: ['$orderType', 'pos'] }, 1, 0] },
          },
          avgValue: { $avg: '$grandTotal' },
        },
      },
    ]);

    // Period-specific summary (within the time range)
    const periodSummaryResult = await Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          total: { $sum: '$grandTotal' },
          online: {
            $sum: { $cond: [{ $eq: ['$orderType', 'online'] }, '$grandTotal', 0] },
          },
          offline: {
            $sum: { $cond: [{ $eq: ['$orderType', 'pos'] }, '$grandTotal', 0] },
          },
          orderCount: { $sum: 1 },
          onlineOrders: {
            $sum: { $cond: [{ $eq: ['$orderType', 'online'] }, 1, 0] },
          },
          offlineOrders: {
            $sum: { $cond: [{ $eq: ['$orderType', 'pos'] }, 1, 0] },
          },
          avgValue: { $avg: '$grandTotal' },
        },
      },
    ]);

    // Payment method breakdown for the period
    const paymentMethods = await Order.aggregate([
      { $match: baseMatch },
      { $unwind: '$payments' },
      {
        $group: {
          _id: '$payments.method',
          total: { $sum: '$payments.amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Payment methods by online/offline
    const paymentByOrderType = await Order.aggregate([
      { $match: baseMatch },
      { $unwind: '$payments' },
      {
        $group: {
          _id: {
            method: '$payments.method',
            orderType: '$orderType',
          },
          total: { $sum: '$payments.amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Online vs offline payment methods
    const onlinePayments = {};
    const offlinePayments = {};
    paymentByOrderType.forEach((p) => {
      const target = p._id.orderType === 'online' ? onlinePayments : offlinePayments;
      target[p._id.method] = { total: p.total, count: p.count };
    });

    const summary = summaryResult[0] || {
      total: 0, online: 0, offline: 0, orderCount: 0,
      onlineOrders: 0, offlineOrders: 0, avgValue: 0,
    };

    const periodSummary = periodSummaryResult[0] || {
      total: 0, online: 0, offline: 0, orderCount: 0,
      onlineOrders: 0, offlineOrders: 0, avgValue: 0,
    };

    res.json({
      period: isCustom ? 'custom' : period,
      dateLabel,
      isCustom,
      customRange: isCustom
        ? { startDate: startDateParam, endDate: endDateParam || now.toISOString().split('T')[0] }
        : null,
      summary: {
        total: summary.total,
        online: summary.online,
        offline: summary.offline,
        orderCount: summary.orderCount,
        onlineOrders: summary.onlineOrders,
        offlineOrders: summary.offlineOrders,
        avgOrderValue: Math.round(summary.avgValue || 0),
      },
      periodSummary: {
        total: periodSummary.total,
        online: periodSummary.online,
        offline: periodSummary.offline,
        orderCount: periodSummary.orderCount,
        onlineOrders: periodSummary.onlineOrders,
        offlineOrders: periodSummary.offlineOrders,
        avgOrderValue: Math.round(periodSummary.avgValue || 0),
      },
      breakdown,
      paymentMethods: paymentMethods.map((p) => ({
        method: p._id,
        total: p.total,
        count: p.count,
      })),
      paymentByType: {
        online: onlinePayments,
        offline: offlinePayments,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getEarnings };
