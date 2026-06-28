import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboard';
import { clearRequestCache } from '../../api/client';
import toast from 'react-hot-toast';
import {
  FiPackage, FiShoppingBag, FiUsers, FiAlertTriangle, FiDollarSign,
  FiTrendingUp, FiClock, FiCheckCircle, FiXCircle, FiBarChart2,
  FiArrowUp, FiArrowDown, FiRefreshCw, FiPlus,
  FiMessageSquare, FiGrid, FiFileText,
} from 'react-icons/fi';

// Recharts
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line,
} from 'recharts';

// --- Constants ---
const COLORS = {
  primary: '#059669',
  primaryLight: '#10b981',
  secondary: '#6366f1',
  accent: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  orange: '#f97316',
};

const STATUS_COLORS = {
  pending: { bg: '#fef3c7', text: '#d97706', dot: '#f59e0b' },
  confirmed: { bg: '#dbeafe', text: '#2563eb', dot: '#3b82f6' },
  preorder: { bg: '#fef3c7', text: '#d97706', dot: '#f59e0b' },
  delivered: { bg: '#d1fae5', text: '#059669', dot: '#10b981' },
  rejected: { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444' },
  cancelled: { bg: '#f3f4f6', text: '#6b7280', dot: '#9ca3af' },
};

const PIE_COLORS = ['#059669', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];
const CHART_COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;
const formatNumber = (val) => (val || 0).toLocaleString('en-IN');

// --- Custom Tooltip ---
const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-3">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

// --- Dashboard Component ---
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      if (silent) clearRequestCache('/dashboard');
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch {
      if (!silent) toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  // Stat cards data
  const statCards = useMemo(() => {
    if (!stats) return [];
    const r = stats.revenue;
    const prevMonthRevenue = r?.month || 0;
    const growth = prevMonthRevenue > 0
      ? ((r?.month - (r?.total / 12)) / (r?.total / 12) * 100).toFixed(1)
      : 0;

    return [
      {
        title: 'Total Revenue', value: formatCurrency(r?.total),
        sub: `Month: ${formatCurrency(r?.month)}`,
        icon: FiDollarSign, gradient: 'from-emerald-500 to-teal-600',
        trend: 'up', trendVal: `${growth}%`,
        link: '/admin/earnings',
      },
      {
        title: 'Today Revenue', value: formatCurrency(r?.today),
        sub: `Year: ${formatCurrency(r?.year)}`,
        icon: FiTrendingUp, gradient: 'from-blue-500 to-indigo-600',
        trend: 'up', trendVal: 'Today',
        link: '/admin/earnings',
      },
      {
        title: 'Total Orders', value: formatNumber(stats.orders?.total),
        sub: `${stats.orders?.pending} pending · ${stats.orders?.today} today`,
        icon: FiShoppingBag, gradient: 'from-violet-500 to-purple-600',
        link: '/admin/orders',
      },
      {
        title: 'Pre-Orders Pending', value: formatNumber(stats.orders?.statusBreakdown?.preorder || 0),
        sub: 'Awaiting your confirmation',
        icon: FiClock, gradient: 'from-amber-500 to-orange-600',
        link: '/admin/pre-orders',
      },
      {
        title: 'Avg Order Value', value: formatCurrency(stats.orders?.avgOrderValue),
        sub: `${stats.orders?.total} completed orders`,
        icon: FiBarChart2, gradient: 'from-orange-500 to-red-500',
      },
      {
        title: 'Products', value: formatNumber(stats.products?.total),
        sub: `${stats.products?.lowStock} low stock · ${stats.products?.expiring} expiring`,
        icon: FiPackage, gradient: 'from-teal-500 to-emerald-600',
        link: '/admin/products',
      },
      {
        title: 'Dealers', value: formatNumber(stats.dealers?.total),
        sub: `${stats.dealers?.activeWithPending} with pending dues`,
        icon: FiUsers, gradient: 'from-rose-500 to-pink-600',
        link: '/admin/dealers',
      },
      {
        title: 'Unread Feedback', value: formatNumber(stats.feedback?.unread),
        sub: 'Customer messages',
        icon: FiMessageSquare, gradient: 'from-amber-500 to-orange-600',
        link: '/admin/feedback',
      },
    ];
  }, [stats]);

  // --- Render ---
  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded-lg w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
                <div className="h-8 bg-gray-100 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-50 rounded w-1/2" />
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 h-80" />
            <div className="bg-white rounded-2xl p-5 border border-gray-100 h-80" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Prandhara store overview · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadStats(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/admin/pos"
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-emerald-200"
          >
            <FiPlus className="w-4 h-4" /> New Sale (POS)
          </Link>
        </div>
      </div>

      {/* ===== Stats Cards ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <Link
            to={card.link || '#'}
            key={i}
            className={`group relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden ${card.link ? 'cursor-pointer' : ''}`}
            onClick={(e) => { if (!card.link) e.preventDefault(); }}
          >
            {/* Gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} opacity-80`} />

            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-lg`}>
                <card.icon className="w-5 h-5" />
              </div>
              {card.trend && (
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  card.trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {card.trend === 'up' ? <FiArrowUp className="w-3 h-3" /> : <FiArrowDown className="w-3 h-3" />}
                  {card.trendVal}
                </span>
              )}
            </div>
            <p className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
            <p className="text-xs text-gray-500">{card.title}</p>
            {card.sub && <p className="text-[10px] text-gray-400 mt-1.5">{card.sub}</p>}
          </Link>
        ))}
      </div>

      {/* ===== Charts Row 1 ===== */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Revenue Trend (30 Days)</h3>
            <div className="flex gap-1">
              {['7d', '30d', '90d'].map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    timeRange === r ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.orders?.dailyTrend || []} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => v?.slice(5) || ''} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#059669" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: '#059669' }} />
              <Area type="monotone" dataKey="orders" name="Orders" stroke="#3b82f6" strokeWidth={2} fill="url(#ordersGrad)" dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Sales Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Sales</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.orders?.monthlySales || []} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(m) => ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m]} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
              <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]}>
                {(stats.orders?.monthlySales || []).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
            <span>Year {new Date().getFullYear()}</span>
            <span className="font-medium text-gray-600">
              Avg: {formatCurrency(Math.round((stats.orders?.monthlySales?.reduce((s, m) => s + m.revenue, 0) || 0) / Math.max(1, stats.orders?.monthlySales?.filter(m => m.count > 0).length || 1)))}
            </span>
          </div>
        </div>
      </div>

      {/* ===== Charts Row 2 ===== */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order Status Donut */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Order Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={Object.entries(stats.orders?.statusBreakdown || {}).map(([key, value]) => ({
                  name: key.charAt(0).toUpperCase() + key.slice(1),
                  value,
                  color: STATUS_COLORS[key]?.dot || '#9ca3af',
                }))}
                cx="50%" cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {Object.entries(stats.orders?.statusBreakdown || {}).map(([key], i) => (
                  <Cell key={i} fill={STATUS_COLORS[key]?.dot || '#9ca3af'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {Object.entries(stats.orders?.statusBreakdown || {}).map(([key, count], i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[key]?.dot || '#9ca3af' }} />
                <span className="text-xs text-gray-500 capitalize">{key} ({count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods Pie */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={Object.entries(stats.payments || {}).map(([key, val]) => ({
                  name: key.charAt(0).toUpperCase() + key.slice(1),
                  value: val.total,
                  count: val.count,
                }))}
                cx="50%" cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {Object.entries(stats.payments || {}).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {Object.entries(stats.payments || {}).map(([key, val], i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-xs text-gray-500 capitalize">{key} ({val.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
          <div className="space-y-3">
            {(stats.products?.categoryDistribution || []).slice(0, 6).map((cat, i) => {
              const maxCount = Math.max(...(stats.products?.categoryDistribution || []).map(c => c.productCount), 1);
              const pct = (cat.productCount / maxCount) * 100;
              return (
                <div key={cat._id || i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 truncate">{cat.name}</span>
                    <span className="font-medium text-gray-900 text-xs">{cat.productCount}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
            {(stats.products?.categoryDistribution || []).length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">No categories</p>
            )}
          </div>
        </div>
      </div>

      {/* ===== Row 3: Top Products + Recent Orders ===== */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Top Selling Products</h3>
            <Link to="/admin/products" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">View all</Link>
          </div>
          {stats.products?.topProducts?.length > 0 ? (
            <div className="space-y-3">
              {stats.products.topProducts.map((p, i) => {
                const maxSold = Math.max(...stats.products.topProducts.map(x => x.totalSold || 0), 1);
                return (
                  <div key={p._id} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                      i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-700' : 'bg-gray-300'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${(p.totalSold / maxSold) * 100}%`,
                            background: `linear-gradient(90deg, #059669, #10b981)`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{p.totalSold || 0}</p>
                      <p className="text-[10px] text-gray-400">sold</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No sales data yet</p>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Orders</h3>
            <Link to="/admin/orders" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="pb-2 font-medium">Invoice</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(stats.orders?.recentOrders || []).slice(0, 7).map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-2">
                      <span className="font-medium text-gray-900 text-xs">{order.invoiceNumber}</span>
                    </td>
                    <td className="py-2.5 pr-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        order.orderType === 'pos' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {order.orderType}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-medium text-gray-900 text-xs">
                      {formatCurrency(order.grandTotal)}
                    </td>
                    <td className="py-2.5 text-center">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{
                          backgroundColor: STATUS_COLORS[order.status]?.bg || '#f3f4f6',
                          color: STATUS_COLORS[order.status]?.text || '#6b7280',
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[order.status]?.dot }} />
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(stats.orders?.recentOrders || []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">No orders yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===== Row 4: Inventory Alerts + Weekly Distribution ===== */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Inventory Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Inventory Alerts</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/admin/products?filter=low-stock"
              className="relative p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600">
                  <FiAlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-orange-600 mb-1">{stats.products?.lowStock || 0}</p>
              <p className="text-sm font-medium text-orange-800">Low Stock Items</p>
              <p className="text-xs text-orange-500 mt-1">Below threshold</p>
            </Link>
            <Link to="/admin/products?filter=expiring"
              className="relative p-4 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-red-100 text-red-600">
                  <FiClock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-red-600 mb-1">{stats.products?.expiring || 0}</p>
              <p className="text-sm font-medium text-red-800">Expiring Soon</p>
              <p className="text-xs text-red-500 mt-1">Within 30 days</p>
            </Link>
          </div>

          {/* Top Customers */}
          {stats.customers?.topCustomers?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Top Customers</h4>
              <div className="space-y-2">
                {stats.customers.topCustomers.map((c, i) => (
                  <div key={c._id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                        i === 0 ? 'bg-amber-500' : 'bg-gray-300'
                      }`}>
                        {i + 1}
                      </span>
                      <span className="text-gray-700 truncate max-w-[120px]">{c.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-gray-900 text-xs">{formatCurrency(c.totalSpent)}</span>
                      <span className="text-gray-400 text-[10px] ml-2">({c.totalOrders} orders)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Weekly Distribution + Order Status */}
        <div className="space-y-6">
          {/* Weekly Orders Distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Weekly Order Distribution</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.orders?.weeklyDistribution || []} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Orders" radius={[4, 4, 0, 0]}>
                  {(stats.orders?.weeklyDistribution || []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Order Status Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Order Status Summary</h3>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'Pending', count: stats.orders?.statusBreakdown?.pending || 0, ...STATUS_COLORS.pending },
                { label: 'Confirmed', count: stats.orders?.statusBreakdown?.confirmed || 0, ...STATUS_COLORS.confirmed },
                { label: 'Delivered', count: stats.orders?.statusBreakdown?.delivered || 0, ...STATUS_COLORS.delivered },
                { label: 'Rejected', count: stats.orders?.statusBreakdown?.rejected || 0, ...STATUS_COLORS.rejected },
                { label: 'Cancelled', count: stats.orders?.statusBreakdown?.cancelled || 0, ...STATUS_COLORS.cancelled },
              ].map((s, i) => (
                <div key={i} className="text-center p-2 rounded-xl" style={{ backgroundColor: s.bg }}>
                  <p className="text-lg font-bold" style={{ color: s.text }}>{s.count}</p>
                  <p className="text-[10px] font-medium" style={{ color: s.text }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Row 5: Dealer Stats + Quick Actions ===== */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dealer Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Dealers with Pending Dues</h3>
            <Link to="/admin/dealers" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">Manage</Link>
          </div>
          {stats.dealers?.topDealers?.length > 0 ? (
            <div className="space-y-3">
              {stats.dealers.topDealers.filter(d => d.pendingAmount > 0).slice(0, 5).map((d, i) => (
                <div key={d._id || i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.phone || 'No phone'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600">{formatCurrency(d.pendingAmount)}</p>
                    <p className="text-xs text-gray-400">{d.totalPurchases || 0} purchases</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-6">No pending dues</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { to: '/admin/products', label: 'Products', icon: FiPackage, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { to: '/admin/orders', label: 'Orders', icon: FiFileText, color: 'text-blue-600', bg: 'bg-blue-50' },
              { to: '/admin/pos', label: 'New Sale', icon: FiPlus, color: 'text-teal-600', bg: 'bg-teal-50' },
              { to: '/admin/customers', label: 'Customers', icon: FiUsers, color: 'text-purple-600', bg: 'bg-purple-50' },
              { to: '/admin/dealers', label: 'Dealers', icon: FiUsers, color: 'text-rose-600', bg: 'bg-rose-50' },
              { to: '/admin/categories', label: 'Categories', icon: FiGrid, color: 'text-amber-600', bg: 'bg-amber-50' },
              { to: '/admin/feedback', label: 'Feedback', icon: FiMessageSquare, color: 'text-orange-600', bg: 'bg-orange-50' },
            ].map((action, i) => (
              <Link
                key={i}
                to={action.to}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className={`p-2.5 rounded-xl ${action.bg}`}>
                  <action.icon className={`w-5 h-5 ${action.color}`} />
                </div>
                <span className="text-xs font-medium text-gray-700">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
