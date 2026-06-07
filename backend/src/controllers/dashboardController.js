const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Dealer = require('../models/Dealer');
const Feedback = require('../models/Feedback');
const Category = require('../models/Category');

// Helper: Get monthly sales for current year
const getMonthlySales = async () => {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const sales = await Order.aggregate([
    {
      $match: {
        status: { $in: ['confirmed', 'delivered'] },
        createdAt: { $gte: yearStart },
      },
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        revenue: { $sum: '$grandTotal' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const months = [];
  for (let m = 1; m <= 12; m++) {
    const found = sales.find((s) => s._id === m);
    months.push({
      month: m,
      revenue: found?.revenue || 0,
      count: found?.count || 0,
    });
  }
  return months;
};

// @desc    Get dashboard stats
// @route   GET /api/dashboard
const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalRevenue,
      todayRevenue,
      monthRevenue,
      yearRevenue,
      totalOrders,
      pendingOrders,
      todayOrders,
      totalProducts,
      lowStockProducts,
      expiringProducts,
      totalCustomers,
      newCustomersMonth,
      totalDealers,
      activeDealers,
      unreadFeedback,
      avgOrderValueResult,
      recentOrders,
      categoryDistribution,
      paymentBreakdown,
      topCustomers,
      dailyRevenue,
      weeklyOrders,
      dealerStats,
      monthlySales,
    ] = await Promise.all([
      // Revenue aggregates
      Order.aggregate([
        { $match: { status: { $in: ['confirmed', 'delivered'] } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: todayStart }, status: { $in: ['confirmed', 'delivered'] } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: monthStart }, status: { $in: ['confirmed', 'delivered'] } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: yearStart }, status: { $in: ['confirmed', 'delivered'] } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      // Order counts
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ createdAt: { $gte: todayStart } }),
      // Product counts
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({
        isActive: true,
        $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
      }),
      Product.countDocuments({
        isActive: true,
        expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      }),
      // Customer stats
      Customer.countDocuments(),
      Customer.countDocuments({ createdAt: { $gte: monthStart } }),
      // Dealer stats
      Dealer.countDocuments({ isActive: true }),
      Dealer.countDocuments({ isActive: true, pendingAmount: { $gt: 0 } }),
      // Feedback
      Feedback.countDocuments({ isRead: false }),
      // Average order value
      Order.aggregate([
        { $match: { status: { $in: ['confirmed', 'delivered'] } } },
        { $group: { _id: null, avgValue: { $avg: '$grandTotal' }, count: { $sum: 1 } } },
      ]),
      // Recent orders
      Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('dealer', 'name phone')
        .select('invoiceNumber orderType status grandTotal paymentStatus createdAt customers dealer')
        .lean(),
      // Category distribution
      Category.aggregate([
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: 'category',
            as: 'products',
          },
        },
        {
          $project: {
            name: 1,
            productCount: { $size: { $filter: { input: '$products', as: 'p', cond: '$$p.isActive' } } },
          },
        },
        { $sort: { productCount: -1 } },
      ]),
      // Payment method breakdown
      Order.aggregate([
        { $match: { status: { $in: ['confirmed', 'delivered'] } } },
        { $unwind: '$payments' },
        { $group: { _id: '$payments.method', total: { $sum: '$payments.amount' }, count: { $sum: 1 } } },
      ]),
      // Top customers
      Customer.find()
        .sort({ totalSpent: -1 })
        .limit(5)
        .select('name phone totalOrders totalSpent')
        .lean(),
      // Daily revenue for last 30 days
      Order.aggregate([
        {
          $match: {
            status: { $in: ['confirmed', 'delivered'] },
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$grandTotal' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Orders by day of week
      Order.aggregate([
        {
          $match: {
            status: { $in: ['confirmed', 'delivered'] },
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: '$createdAt' },
            count: { $sum: 1 },
            revenue: { $sum: '$grandTotal' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Dealer stats
      Dealer.aggregate([
        { $match: { isActive: true } },
        { $sort: { pendingAmount: -1 } },
        { $limit: 5 },
        { $project: { name: 1, phone: 1, totalPurchases: 1, pendingAmount: 1 } },
      ]),
      // Monthly sales (full year)
      getMonthlySales(),
    ]);

    // Order status breakdown
    const orderBreakdown = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const statusBreakdown = {};
    orderBreakdown.forEach((s) => (statusBreakdown[s._id] = s.count));

    // Top selling products
    const topProducts = await Product.find({ isActive: true })
      .sort({ totalSold: -1 })
      .limit(5)
      .select('name totalSold sellingPrice')
      .lean();

    // Payment breakdown map
    const paymentMethods = {};
    paymentBreakdown.forEach((p) => {
      paymentMethods[p._id] = { total: p.total, count: p.count };
    });

    // Fill in missing days in daily revenue
    const revenueTrend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const existing = dailyRevenue.find((r) => r._id === dateStr);
      revenueTrend.push({
        date: dateStr,
        revenue: existing?.revenue || 0,
        orders: existing?.orders || 0,
      });
    }

    // Day names for weekly orders
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyOrderData = weeklyOrders.map((w) => ({
      day: dayNames[w._id - 1],
      count: w.count,
      revenue: w.revenue,
    }));

    res.json({
      revenue: {
        total: totalRevenue[0]?.total || 0,
        today: todayRevenue[0]?.total || 0,
        month: monthRevenue[0]?.total || 0,
        year: yearRevenue[0]?.total || 0,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        today: todayOrders,
        monthlySales,
        statusBreakdown,
        avgOrderValue: Math.round(avgOrderValueResult[0]?.avgValue || 0),
        recentOrders,
        dailyTrend: revenueTrend,
        weeklyDistribution: weeklyOrderData,
      },
      products: {
        total: totalProducts,
        lowStock: lowStockProducts,
        expiring: expiringProducts,
        topProducts,
        categoryDistribution,
      },
      customers: {
        total: totalCustomers,
        newThisMonth: newCustomersMonth,
        topCustomers,
      },
      dealers: {
        total: totalDealers,
        activeWithPending: activeDealers,
        topDealers: dealerStats,
      },
      feedback: { unread: unreadFeedback },
      payments: paymentMethods,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };
