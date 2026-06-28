import React, { useState, useEffect } from 'react';
import { alertApi } from '../../api/alerts';
import { clearRequestCache } from '../../api/client';
import toast from 'react-hot-toast';
import { FiBell, FiAlertTriangle, FiAlertCircle, FiPackage, FiClock, FiCheckCircle, FiTrash2, FiRefreshCw, FiSearch } from 'react-icons/fi';

const AlertManagement = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async (forceRefresh) => {
    try {
      if (forceRefresh) clearRequestCache('/alerts');
      const data = await alertApi.getAll({ limit: 100 });
      setAlerts(data.alerts || data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await alertApi.markRead(id);
      setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, isRead: true } : a)));
      toast.success('Marked as read');
    } catch {}
  };

  const deleteAlert = async (id) => {
    try {
      await alertApi.delete(id);
      setAlerts((prev) => prev.filter((a) => a._id !== id));
      toast.success('Alert deleted');
    } catch {}
  };

  const filtered = alerts.filter((a) => {
    if (filter !== 'all' && a.type !== filter) return false;
    if (search && !a.message?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const alertIcons = {
    low_stock: { icon: FiAlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50' },
    expiry: { icon: FiClock, color: 'text-red-500', bg: 'bg-red-50' },
    new_order: { icon: FiPackage, color: 'text-blue-500', bg: 'bg-blue-50' },
    missing_customer: { icon: FiAlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  };

  const typeCounts = alerts.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts & Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">{alerts.filter((a) => !a.isRead).length} unread alerts</p>
        </div>
        <button onClick={() => loadAlerts(true)} className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
          <FiRefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'all', label: 'All', count: alerts.length },
          { id: 'low_stock', label: 'Low Stock', count: typeCounts.low_stock || 0 },
          { id: 'expiry', label: 'Expiry', count: typeCounts.expiry || 0 },
          { id: 'new_order', label: 'New Orders', count: typeCounts.new_order || 0 },
          { id: 'missing_customer', label: 'Missing Customer ID', count: typeCounts.missing_customer || 0 },
        ].map((type) => (
          <button
            key={type.id}
            onClick={() => setFilter(type.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              filter === type.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type.label}
            <span className={`text-xs ${filter === type.id ? 'text-emerald-200' : 'text-gray-400'}`}>({type.count})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search alerts..."
          className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FiBell className="mx-auto w-16 h-16 text-gray-300" />
          <p className="mt-4 text-gray-500">No alerts found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((alert) => {
            const info = alertIcons[alert.type] || { icon: FiBell, color: 'text-gray-500', bg: 'bg-gray-50' };
            const Icon = info.icon;
            return (
              <div
                key={alert._id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  alert.isRead ? 'bg-white border-gray-100' : 'bg-emerald-50/30 border-emerald-200'
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${info.bg} ${info.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase ${info.color}`}>{alert.type?.replace('_', ' ')}</span>
                    {!alert.isRead && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!alert.isRead && (
                    <button onClick={() => markRead(alert._id)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Mark read">
                      <FiCheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => deleteAlert(alert._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertManagement;
