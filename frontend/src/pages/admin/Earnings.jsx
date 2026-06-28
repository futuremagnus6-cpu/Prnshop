import React, { useState, useEffect, useMemo } from 'react';
import { earningsApi } from '../../api/earnings';
import toast from 'react-hot-toast';
import { clearRequestCache } from '../../api/client';
import {
  FiDollarSign, FiTrendingUp, FiShoppingBag, FiClock,
  FiRefreshCw, FiCalendar, FiArrowUp, FiArrowDown, FiSearch,
} from 'react-icons/fi';

import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from 'recharts';

const PERIODS = [
  { key: 'day', label: 'Day', desc: 'Last 30 days' },
  { key: 'week', label: 'Week', desc: 'Last 12 weeks' },
  { key: 'month', label: 'Month', desc: 'Last 12 months' },
  { key: 'year', label: 'Year', desc: 'Last 5 years' },
  { key: 'all', label: 'All Time', desc: 'Complete history' },
  { key: 'custom', label: 'Custom', desc: 'Pick a range' },
];

const PIE_COLORS = ['#059669', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;
const formatNumber = (val) => (val || 0).toLocaleString('en-IN');
const formatCompact = (val) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
};

const toDateInputValue = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return date.toISOString().split('T')[0];
};

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

const Earnings = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('month');
  const [chartType, setChartType] = useState('bar');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Init custom dates to last 30 days on mount
  useEffect(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    setCustomStartDate(toDateInputValue(start));
    setCustomEndDate(toDateInputValue(end));
  }, []);

  const fetchEarnings = async (overridePeriod, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      if (silent) clearRequestCache('/earnings');
      const params = {};
      const p = overridePeriod || period;
      if (p === 'custom') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      } else {
        params.period = p;
      }
      const result = await earningsApi.getEarnings(params);
      setData(result);
    } catch {
      if (!silent) toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    fetchEarnings(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePeriodChange = (key) => {
    setPeriod(key);
    setLoading(true);
    setData(null);
    fetchEarnings(key);
  };

  const handleCustomSearch = () => {
    if (!customStartDate || !customEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    if (new Date(customStartDate) > new Date(customEndDate)) {
      toast.error('Start date cannot be after end date');
      return;
    }
    setPeriod('custom');
    setLoading(true);
    setData(null);
    fetchEarnings('custom');
  };

  // Chart data
  const chartData = useMemo(() => {
    if (!data?.breakdown) return [];
    return data.breakdown.map((item) => ({
      label: item._id,
      Online: item.online,
      Offline: item.offline,
      Total: item.total,
      Orders: item.orderCount,
    }));
  }, [data]);

  const totalOfPeriod = data?.periodSummary?.total || 0;
  const totalOnline = data?.periodSummary?.online || 0;
  const totalOffline = data?.periodSummary?.offline || 0;
  const onlinePct = totalOfPeriod > 0 ? ((totalOnline / totalOfPeriod) * 100).toFixed(1) : 0;
  const offlinePct = totalOfPeriod > 0 ? ((totalOffline / totalOfPeriod) * 100).toFixed(1) : 0;

  // Period description
  const currentPeriodDesc = useMemo(() => {
    if (period === 'custom') {
      if (!customStartDate || !customEndDate) return 'Select a date range';
      const start = new Date(customStartDate).toLocaleDateString('en-IN');
      const end = new Date(customEndDate).toLocaleDateString('en-IN');
      return `${start} — ${end}`;
    }
    const p = PERIODS.find((x) => x.key === period);
    return p ? p.desc : '';
  }, [period, customStartDate, customEndDate]);

  // Loading state
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
          <div className="bg-white rounded-2xl border border-gray-100 h-80" />
        </div>
      </div>
    );
  }

  if (!data) {
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
          <div className="bg-white rounded-2xl border border-gray-100 h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Earnings</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track your revenue — online vs in-store · {currentPeriodDesc}
          </p>
        </div>          <button
          onClick={() => fetchEarnings(period, true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ===== Period Tabs ===== */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePeriodChange(p.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              period === p.key
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p.key === 'custom' ? <FiSearch className="w-4 h-4" /> : <FiCalendar className="w-4 h-4" />}
            {p.label}
            <span className={`text-xs ${period === p.key ? 'text-emerald-100' : 'text-gray-400'}`}>
              {p.desc}
            </span>
          </button>
        ))}
      </div>

      {/* ===== Custom Date Range Inputs ===== */}
      {period === 'custom' && (
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">From Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">To Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                max={toDateInputValue(new Date())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleCustomSearch}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-emerald-200 whitespace-nowrap"
            >
              <FiSearch className="w-4 h-4" /> Search
            </button>
          </div>
        </div>
      )}

      {/* ===== Summary Cards ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Earnings */}
        <div className="relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 opacity-80" />
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
              <FiDollarSign className="w-5 h-5" />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
              <FiArrowUp className="w-3 h-3" /> {period === 'all' ? 'All time' : 'This period'}
            </span>
          </div>
          <p className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">{formatCurrency(totalOfPeriod)}</p>
          <p className="text-xs text-gray-500">Total Earnings</p>
          <p className="text-[10px] text-gray-400 mt-1.5">{data.periodSummary?.orderCount || 0} orders</p>
        </div>

        {/* Online Earnings */}
        <div className="relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-80" />
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <FiTrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700">
              {onlinePct}%
            </span>
          </div>
          <p className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">{formatCurrency(totalOnline)}</p>
          <p className="text-xs text-gray-500">Online (Website)</p>
          <p className="text-[10px] text-gray-400 mt-1.5">{data.periodSummary?.onlineOrders || 0} orders</p>
        </div>

        {/* Offline (POS) Earnings */}
        <div className="relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-600 opacity-80" />
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg">
              <FiShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-teal-50 text-teal-700">
              {offlinePct}%
            </span>
          </div>
          <p className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">{formatCurrency(totalOffline)}</p>
          <p className="text-xs text-gray-500">In-Store (POS)</p>
          <p className="text-[10px] text-gray-400 mt-1.5">{data.periodSummary?.offlineOrders || 0} orders</p>
        </div>

        {/* Avg Order Value */}
        <div className="relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600 opacity-80" />
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
              <FiClock className="w-5 h-5" />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-purple-50 text-purple-700">
              {period === 'all' ? 'All time' : 'Period avg'}
            </span>
          </div>
          <p className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">{formatCurrency(data.periodSummary?.avgOrderValue || 0)}</p>
          <p className="text-xs text-gray-500">Avg Order Value</p>
          <p className="text-[10px] text-gray-400 mt-1.5">
            Online avg: {formatCurrency(totalOnline > 0 && data.periodSummary?.onlineOrders > 0 ? Math.round(totalOnline / data.periodSummary.onlineOrders) : 0)}
          </p>
        </div>
      </div>

      {/* ===== Summary Comparison ===== */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Online vs Offline Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Online vs In-Store</h3>
            <div className="flex gap-1">
              <button
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  chartType === 'bar' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Bar
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  chartType === 'area' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Area
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500" /> Online (Website)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" /> In-Store (POS)
            </span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v)} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                <Legend />
                <Bar dataKey="Online" name="Online (Website)" stackId="a" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Offline" name="In-Store (POS)" stackId="a" fill="#059669" radius={[2, 2, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="onlineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="offlineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v)} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                <Legend />
                <Area type="monotone" dataKey="Online" name="Online (Website)" stroke="#3b82f6" strokeWidth={2} fill="url(#onlineGrad)" dot={false} />
                <Area type="monotone" dataKey="Offline" name="In-Store (POS)" stroke="#059669" strokeWidth={2} fill="url(#offlineGrad)" dot={false} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Payment Methods</h3>
          {data.paymentMethods?.length > 0 ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.paymentMethods.map((p, i) => ({
                      name: p.method.charAt(0).toUpperCase() + p.method.slice(1),
                      value: p.total,
                      color: PIE_COLORS[i % PIE_COLORS.length],
                    }))}
                    cx="50%" cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.paymentMethods.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2">
                {data.paymentMethods.map((p, i) => (
                  <div key={p.method} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 capitalize truncate">{p.method}</p>
                      <p className="text-[10px] text-gray-400">{p.count} transactions</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-900">{formatCurrency(p.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No payment data for this period</p>
          )}
        </div>
      </div>

      {/* ===== Payment Methods by Type ===== */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Online Payment Methods */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            Online Payment Methods
          </h3>
          {Object.keys(data.paymentByType?.online || {}).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(data.paymentByType.online).map(([method, val], i) => (
                <div key={method} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-sm font-medium text-gray-700 capitalize">{method}</span>
                    <span className="text-xs text-gray-400">({val.count})</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(val.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-6">No online payment data</p>
          )}
        </div>

        {/* Offline Payment Methods */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            In-Store Payment Methods
          </h3>
          {Object.keys(data.paymentByType?.offline || {}).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(data.paymentByType.offline).map(([method, val], i) => (
                <div key={method} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-sm font-medium text-gray-700 capitalize">{method}</span>
                    <span className="text-xs text-gray-400">({val.count})</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(val.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-6">No in-store payment data</p>
          )}
        </div>
      </div>

      {/* ===== All Time Summary ===== */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">All Time Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
            <p className="text-2xl font-bold text-emerald-700">{formatCurrency(data.summary?.total || 0)}</p>
            <p className="text-xs font-medium text-emerald-600 mt-1">Total Revenue</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(data.summary?.online || 0)}</p>
            <p className="text-xs font-medium text-blue-600 mt-1">Online Revenue</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100">
            <p className="text-2xl font-bold text-teal-700">{formatCurrency(data.summary?.offline || 0)}</p>
            <p className="text-xs font-medium text-teal-600 mt-1">In-Store Revenue</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-purple-100">
            <p className="text-2xl font-bold text-purple-700">{formatNumber(data.summary?.orderCount || 0)}</p>
            <p className="text-xs font-medium text-purple-600 mt-1">Total Orders</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Earnings;
