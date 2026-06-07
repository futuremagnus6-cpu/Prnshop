import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { monitoringApi } from '../../api/monitoring';
import toast from 'react-hot-toast';
import { clearRequestCache } from '../../api/client';
import {
  FiActivity, FiServer, FiBarChart2, FiClock, FiAlertTriangle,
  FiRefreshCw, FiTrash2, FiTerminal, FiSliders, FiChevronDown,
  FiChevronUp, FiSearch, FiCheckCircle, FiXCircle, FiInfo,
  FiArrowUp, FiArrowDown, FiMinus, FiCpu, FiZap,
} from 'react-icons/fi';

import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, Legend,
} from 'recharts';

// ─── Constants ───────────────────────────────────────────────
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

const STATUS_GRADIENTS = {
  healthy: 'from-emerald-500 to-teal-600',
  degraded: 'from-amber-500 to-orange-600',
  critical: 'from-red-500 to-rose-600',
};

const LOG_LEVELS = ['error', 'warn', 'info', 'debug'];
const LOG_LEVEL_COLORS = {
  ERROR: { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444' },
  WARN: { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b' },
  INFO: { bg: '#f0fdf4', text: '#059669', dot: '#10b981' },
  DEBUG: { bg: '#f0f9ff', text: '#2563eb', dot: '#3b82f6' },
};

const PIE_COLORS = ['#059669', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];

const formatNumber = (val) => (val || 0).toLocaleString('en-IN');
const formatMs = (val) => {
  if (!val) return '0ms';
  const str = String(val);
  if (str.includes('ms')) return str;
  return `${Math.round(parseFloat(val))}ms`;
};
const parseMs = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  return parseInt(String(val).replace('ms', '')) || 0;
};
const formatDuration = (ms) => {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
};

// ─── Shared Components ──────────────────────────────────────

const Spinner = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const SkeletonRow = ({ count = 4 }) => (
  <div className="animate-pulse space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
        <div className="h-8 bg-gray-100 rounded w-1/2 mb-2" />
        <div className="h-3 bg-gray-50 rounded w-2/3" />
      </div>
    ))}
  </div>
);

const StatusDot = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
    status === 'healthy' ? 'bg-emerald-50 text-emerald-700' :
    status === 'degraded' ? 'bg-amber-50 text-amber-700' :
    'bg-red-50 text-red-700'
  }`}>
    <span className={`w-2 h-2 rounded-full ${
      status === 'healthy' ? 'bg-emerald-500' :
      status === 'degraded' ? 'bg-amber-500' :
      'bg-red-500'
    }`} />
    {status}
  </span>
);

const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-3 max-w-xs">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

const GradientCard = ({ gradient, icon: Icon, label, value, sub, trend, trendVal, trendDir, className = '' }) => (
  <div className={`relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm overflow-hidden ${className}`}>
    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} opacity-80`} />
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
        <Icon className="w-5 h-5" />
      </div>
      {trend && (
        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
          trendDir === 'up' ? 'bg-emerald-50 text-emerald-700' :
          trendDir === 'down' ? 'bg-red-50 text-red-700' :
          'bg-gray-50 text-gray-600'
        }`}>
          {trendDir === 'up' ? <FiArrowUp className="w-3 h-3" /> :
           trendDir === 'down' ? <FiArrowDown className="w-3 h-3" /> :
           <FiMinus className="w-3 h-3" />}
          {trendVal}
        </span>
      )}
    </div>
    <p className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
    {sub && <p className="text-[10px] text-gray-400 mt-1.5">{sub}</p>}
  </div>
);

// ─── Main Component ─────────────────────────────────────────

const MonitoringDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(15);
  const [activeTab, setActiveTab] = useState('overview');
  const [logFilter, setLogFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'avgTime', dir: 'desc' });
  const intervalRef = useRef(null);

  // ── Data Loading ───────────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      if (silent) {
        clearRequestCache('/monitoring');
        clearRequestCache('/metrics');
        clearRequestCache('/logs');
      }
      const [metricsData, logsData] = await Promise.all([
        monitoringApi.getMetrics(),
        monitoringApi.getLogs(200),
      ]);
      setMetrics(metricsData);
      setLogs(logsData.logs || []);
    } catch (err) {
      if (!silent) toast.error('Failed to fetch monitoring data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => loadData(true), refreshInterval * 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, refreshInterval, loadData]);

  const handleReset = async () => {
    try {
      await monitoringApi.resetMetrics();
      toast.success('Metrics reset');
      loadData();
    } catch {
      toast.error('Failed to reset metrics');
    }
  };

  const handleLogLevel = async (level) => {
    try {
      await monitoringApi.setLogLevel(level);
      toast.success(`Log level set to ${level}`);
    } catch {
      toast.error('Failed to set log level');
    }
  };

  // ── Derived Data ───────────────────────────────────────
  const healthStatus = useMemo(() => {
    if (!metrics) return 'healthy';
    const errPct = parseFloat(metrics.requests?.errorRate) || 0;
    if (errPct > 10) return 'critical';
    if (errPct > 3) return 'degraded';
    return 'healthy';
  }, [metrics]);

  const routeList = useMemo(() => {
    if (!metrics?.routes) return [];
    return Object.entries(metrics.routes)
      .map(([route, data]) => ({
        route,
        method: route.split(' ')[0],
        path: route.split(' ').slice(1).join(' '),
        ...data,
        avgMs: parseMs(data.avgTime),
        p95Ms: parseMs(data.p95),
        p99Ms: parseMs(data.p99),
      }))
      .sort((a, b) => {
        const aVal = a[sortConfig.key] ?? 0;
        const bVal = b[sortConfig.key] ?? 0;
        if (typeof aVal === 'string') {
          return sortConfig.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortConfig.dir === 'asc' ? aVal - bVal : bVal - aVal;
      });
  }, [metrics, sortConfig]);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (logFilter !== 'all') {
      result = result.filter((l) => {
        const level = (l.level || '').toUpperCase();
        return level === logFilter.toUpperCase();
      });
    }
    if (logSearch) {
      const s = logSearch.toLowerCase();
      result = result.filter((l) =>
        JSON.stringify(l).toLowerCase().includes(s)
      );
    }
    return result.slice(0, 100);
  }, [logs, logFilter, logSearch]);

  const responseTimeDistribution = useMemo(() => {
    if (!metrics?.routes) return [];
    const buckets = [
      { name: '<50ms', min: 0, max: 50, color: '#059669' },
      { name: '50-200ms', min: 50, max: 200, color: '#10b981' },
      { name: '200-500ms', min: 200, max: 500, color: '#6366f1' },
      { name: '500-1s', min: 500, max: 1000, color: '#f59e0b' },
      { name: '1-2s', min: 1000, max: 2000, color: '#f97316' },
      { name: '>2s', min: 2000, max: Infinity, color: '#ef4444' },
    ];
    const routeAvgTimes = Object.values(metrics.routes).map((r) => parseMs(r.avgTime));
    return buckets.map((b) => ({
      name: b.name,
      count: routeAvgTimes.filter((t) => t >= b.min && t < b.max).length,
      fill: b.color,
    }));
  }, [metrics]);

  // Determine log level distribution
  const logLevelDist = useMemo(() => {
    const dist = { error: 0, warn: 0, info: 0, debug: 0 };
    logs.forEach((l) => {
      const level = (l.level || '').toLowerCase();
      if (dist[level] !== undefined) dist[level]++;
    });
    return Object.entries(dist).map(([name, count]) => ({ name, count }));
  }, [logs]);

  // Top slowest routes
  const slowestRoutes = useMemo(() => {
    return [...routeList].sort((a, b) => b.avgMs - a.avgMs).slice(0, 10);
  }, [routeList]);

  const toggleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <FiChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />;
    return sortConfig.dir === 'desc'
      ? <FiChevronDown className="w-3 h-3 text-emerald-600" />
      : <FiChevronUp className="w-3 h-3 text-emerald-600" />;
  };

  // ── Loading ────────────────────────────────────────────
  if (loading) return <Spinner />;

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* ═══ Header ════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Monitoring Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Server performance, logs, and health metrics
            {metrics?.server?.uptimeHuman && (
              <span className="ml-2 text-gray-400">
                · Uptime: {metrics.server.uptimeHuman}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          {/* Auto-refresh controls */}
          <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                autoRefresh ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <FiZap className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-500' : ''}`} />
              Auto
            </button>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="text-xs border-0 bg-transparent focus:outline-none cursor-pointer text-gray-600"
              >
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
            )}
          </div>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 border border-red-200 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <FiTrash2 className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* ═══ Tabs ════ */}
      <div className="flex flex-wrap gap-1 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm">
        {[
          { key: 'overview', label: 'Overview', icon: FiActivity },
          { key: 'routes', label: 'Routes', icon: FiBarChart2 },
          { key: 'logs', label: 'Logs', icon: FiTerminal },
          { key: 'slow', label: 'Slow Requests', icon: FiClock },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB: Overview
          ══════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* ── Server Health + Quick Stats ── */}
          <div className="grid lg:grid-cols-4 gap-4">
            <GradientCard
              gradient={STATUS_GRADIENTS[healthStatus]}
              icon={FiServer}
              label="Server Status"
              value={<StatusDot status={healthStatus} />}
              sub={`Started: ${metrics?.server?.startTime ? new Date(metrics.server.startTime).toLocaleString() : 'N/A'}`}
            />
            <GradientCard
              gradient="from-emerald-500 to-teal-600"
              icon={FiCpu}
              label="Total Requests"
              value={formatNumber(metrics?.requests?.total)}
              sub={`Active: ${metrics?.server?.activeRequests || 0}`}
            />
            <GradientCard
              gradient={parseFloat(metrics?.requests?.errorRate || '0') > 5 ? 'from-red-500 to-rose-600' : 'from-blue-500 to-indigo-600'}
              icon={FiAlertTriangle}
              label="Error Rate"
              value={metrics?.requests?.errorRate || '0%'}
              sub={`${metrics?.requests?.errors || 0} total errors`}
              trend
              trendVal={metrics?.requests?.errorRate || '0%'}
              trendDir={parseFloat(metrics?.requests?.errorRate || '0') > 5 ? 'up' : 'down'}
            />
            <GradientCard
              gradient="from-violet-500 to-purple-600"
              icon={FiClock}
              label="Avg Response Time"
              value={metrics?.requests?.avgResponseTime || '0ms'}
              sub={`p95: ${metrics?.requests?.p95 || '0ms'} · p99: ${metrics?.requests?.p99 || '0ms'}`}
            />
          </div>

          {/* ── Response Time Stats ── */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Min', value: metrics?.requests?.min, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'p50', value: metrics?.requests?.p50, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'p95', value: metrics?.requests?.p95, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'p99', value: metrics?.requests?.p99, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Max', value: metrics?.requests?.max, color: 'text-red-600', bg: 'bg-red-50' },
            ].map((stat, i) => (
              <div key={i} className={`text-center p-4 rounded-xl ${stat.bg} border`}>
                <p className="text-xs font-medium text-gray-500 mb-1">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{formatMs(stat.value)}</p>
              </div>
            ))}
          </div>

          {/* ── Response Time Distribution Chart ── */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Route Response Time Distribution</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={responseTimeDistribution} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v} routes`} />} />
                  <Bar dataKey="count" name="Routes" radius={[6, 6, 0, 0]}>
                    {responseTimeDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Distribution of average response times across all API routes
              </p>
            </div>

            {/* ── Slowest Routes ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Slowest Routes (Top 10)</h3>
              {slowestRoutes.length > 0 ? (
                <div className="space-y-2">
                  {slowestRoutes.map((route, i) => {
                    const maxMs = slowestRoutes[0]?.avgMs || 1;
                    const barWidth = Math.min((route.avgMs / maxMs) * 100, 100);
                    const barColor = route.avgMs > 1000 ? '#ef4444' : route.avgMs > 500 ? '#f59e0b' : '#059669';
                    return (
                      <div key={route.route} className="group">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                              {i + 1}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              route.method === 'GET' ? 'bg-emerald-100 text-emerald-700' :
                              route.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                              route.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {route.method}
                            </span>
                            <span className="text-gray-700 truncate font-medium">{route.path}</span>
                          </div>
                          <span className={`font-mono text-xs font-bold shrink-0 ml-2 ${
                            route.avgMs > 1000 ? 'text-red-600' : route.avgMs > 500 ? 'text-amber-600' : 'text-gray-600'
                          }`}>
                            {route.avgTime}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${barWidth}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">No routes tracked yet</p>
              )}
            </div>
          </div>

          {/* ── Log Level Distribution ── */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Log Level Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={logLevelDist.filter((d) => d.count > 0)}
                    cx="50%" cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {logLevelDist.map((entry) => (
                      <Cell key={entry.name} fill={LOG_LEVEL_COLORS[entry.name.toUpperCase()]?.dot || '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {logLevelDist.filter((d) => d.count > 0).map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LOG_LEVEL_COLORS[entry.name.toUpperCase()]?.dot }} />
                    <span className="text-xs text-gray-500 capitalize">{entry.name} ({entry.count})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Log Level Controls ── */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Dynamic Log Level Control</h3>
              <p className="text-xs text-gray-500 mb-4">
                Change the server log level in real-time — useful for debugging without restarting.
              </p>
              <div className="flex flex-wrap gap-2">
                {LOG_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => handleLogLevel(level)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      level === 'error' ? 'bg-red-50 text-red-700 hover:bg-red-100' :
                      level === 'warn' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' :
                      level === 'info' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' :
                      'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      level === 'error' ? 'bg-red-500' :
                      level === 'warn' ? 'bg-amber-500' :
                      level === 'info' ? 'bg-emerald-500' :
                      'bg-blue-500'
                    }`} />
                    Set {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: Routes
          ══════════════════════════════════════════════════════ */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          {/* ── Route Performance Summary ── */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GradientCard
              gradient="from-emerald-500 to-teal-600"
              icon={FiBarChart2}
              label="Total Endpoints"
              value={routeList.length}
              sub="API routes tracked"
            />
            <GradientCard
              gradient="from-amber-500 to-orange-600"
              icon={FiClock}
              label="Avg Response Time"
              value={routeList.length > 0
                ? formatMs(Math.round(routeList.reduce((s, r) => s + r.avgMs, 0) / routeList.length))
                : '0ms'}
              sub="Across all routes"
            />
            <GradientCard
              gradient="from-red-500 to-rose-600"
              icon={FiAlertTriangle}
              label="Routes with Errors"
              value={routeList.filter((r) => r.errors > 0).length}
              sub={`${routeList.reduce((s, r) => s + r.errors, 0)} total errors`}
            />
            <GradientCard
              gradient="from-violet-500 to-purple-600"
              icon={FiZap}
              label="Fastest Routes"
              value={routeList.filter((r) => r.avgMs < 100).length}
              sub="Under 100ms average"
            />
          </div>

          {/* ── Route Table ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                      <button onClick={() => toggleSort('route')} className="flex items-center gap-1 group">
                        Route <SortIcon columnKey="route" />
                      </button>
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                      <button onClick={() => toggleSort('count')} className="flex items-center gap-1 group ml-auto">
                        Count <SortIcon columnKey="count" />
                      </button>
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                      <button onClick={() => toggleSort('errors')} className="flex items-center gap-1 group ml-auto">
                        Errors <SortIcon columnKey="errors" />
                      </button>
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                      <button onClick={() => toggleSort('avgMs')} className="flex items-center gap-1 group ml-auto">
                        Avg Time <SortIcon columnKey="avgMs" />
                      </button>
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                      <button onClick={() => toggleSort('p95Ms')} className="flex items-center gap-1 group ml-auto">
                        p95 <SortIcon columnKey="p95Ms" />
                      </button>
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                      <button onClick={() => toggleSort('p99Ms')} className="flex items-center gap-1 group ml-auto">
                        p99 <SortIcon columnKey="p99Ms" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {routeList.map((route) => (
                    <tr key={route.route} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            route.method === 'GET' ? 'bg-emerald-100 text-emerald-700' :
                            route.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                            route.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                            route.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {route.method}
                          </span>
                          <span className="text-gray-900 font-medium truncate max-w-[250px] lg:max-w-[400px]">
                            {route.path}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatNumber(route.count)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${route.errors > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {route.errors || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono font-medium ${
                          route.avgMs > 1000 ? 'text-red-600' :
                          route.avgMs > 500 ? 'text-amber-600' :
                          route.avgMs > 200 ? 'text-blue-600' :
                          'text-gray-700'
                        }`}>
                          {route.avgTime}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-gray-600">{route.p95}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-gray-600">{route.p99}</td>
                    </tr>
                  ))}
                  {routeList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                        <FiBarChart2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No route data available yet</p>
                        <p className="text-xs text-gray-300 mt-1">Make some API requests first</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: Logs
          ══════════════════════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* ── Log Filters ── */}
          <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex gap-1">
              {['all', 'error', 'warn', 'info', 'debug'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLogFilter(lvl)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    logFilter === lvl
                      ? lvl === 'error' ? 'bg-red-100 text-red-700' :
                        lvl === 'warn' ? 'bg-amber-100 text-amber-700' :
                        lvl === 'info' ? 'bg-emerald-100 text-emerald-700' :
                        lvl === 'debug' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-200 text-gray-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {lvl.toUpperCase()}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400">{filteredLogs.length} entries shown</span>
          </div>

          {/* ── Log Entries ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {filteredLogs.length > 0 ? (
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {filteredLogs.map((entry, i) => {
                  const level = (entry.level || 'INFO').toUpperCase();
                    const colors = LOG_LEVEL_COLORS[level] || LOG_LEVEL_COLORS.INFO;
                    const message = entry.message || (typeof entry === 'string' ? entry : '');
                    const timestamp = entry.timestamp || '';
                    const meta = { ...entry };
                    delete meta.level;
                    delete meta.message;
                    delete meta.timestamp;
                    const metaStr = Object.keys(meta).length > 0 ? meta : null;

                    return (
                      <div key={i} className="p-3 hover:bg-gray-50 transition-colors font-mono text-xs">
                        <div className="flex items-start gap-3">
                          <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0 mt-0.5">
                            {timestamp ? new Date(timestamp).toLocaleTimeString() : ''}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
                            style={{ backgroundColor: colors.bg, color: colors.text }}
                          >
                            {level}
                          </span>
                          <span className="text-gray-800 break-words flex-1">
                            {message}
                          </span>
                        </div>
                        {metaStr && (
                          <pre className="mt-1 ml-[100px] text-[10px] text-gray-400 overflow-x-auto">
                            {JSON.stringify(metaStr, null, 1)}
                          </pre>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400">
                <FiTerminal className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No log entries</p>
                <p className="text-xs text-gray-300 mt-1">Logs will appear here once the server starts processing requests</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: Slow Requests
          ══════════════════════════════════════════════════════ */}
      {activeTab === 'slow' && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <GradientCard
              gradient="from-orange-500 to-red-600"
              icon={FiClock}
              label="Slow Requests (>2s)"
              value={metrics?.slowRequests?.length || 0}
              sub="Last 100 tracked"
            />
            <GradientCard
              gradient="from-red-500 to-rose-600"
              icon={FiAlertTriangle}
              label="Critical (>5s)"
              value={metrics?.slowRequests?.filter((r) => parseMs(r.duration) > 5000).length || 0}
              sub="Needs immediate attention"
            />
            <GradientCard
              gradient="from-violet-500 to-purple-600"
              icon={FiBarChart2}
              label="Total API Requests"
              value={formatNumber(metrics?.requests?.total)}
              sub={`${metrics?.requests?.slowRequests?.length || 0} slow total`}
            />
          </div>

          {metrics?.slowRequests?.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Timestamp</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Method</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Route</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Duration</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {metrics.slowRequests.map((req, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(req.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            req.method === 'GET' ? 'bg-emerald-100 text-emerald-700' :
                            req.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                            req.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {req.method}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-900 font-medium truncate max-w-[300px] block">
                            {req.path}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold ${req.duration > 5000 ? 'text-red-600' : 'text-amber-600'}`}>
                            {formatMs(req.duration)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            req.statusCode >= 500 ? 'bg-red-50 text-red-700' :
                            req.statusCode >= 400 ? 'bg-amber-50 text-amber-700' :
                            'bg-emerald-50 text-emerald-700'
                          }`}>
                            {req.statusCode >= 500 ? <FiXCircle className="w-3 h-3" /> :
                             req.statusCode >= 400 ? <FiInfo className="w-3 h-3" /> :
                             <FiCheckCircle className="w-3 h-3" />}
                            {req.statusCode}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <FiCheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No Slow Requests</h3>
              <p className="text-sm text-gray-500">All requests are completing within normal time thresholds</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MonitoringDashboard;
