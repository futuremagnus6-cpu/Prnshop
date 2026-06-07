import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { userApi } from '../../api/users';
import { FiUserPlus, FiTrash2, FiMail, FiClock, FiAlertTriangle } from 'react-icons/fi';

const ManagerManagement = () => {
  const { user } = useSelector((state) => state.auth);

  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    // Only load managers for admin/superadmin
    if (user?.role !== 'admin' && user?.role !== 'superadmin') return;
    loadManagers();
  }, [user]);

  // Guard: only admin/superadmin can manage managers
  // Must be placed AFTER all hooks to avoid React hooks violation
  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <Navigate to="/admin/pos" replace />;
  }

  const loadManagers = async () => {
    try {
      setLoading(true);
      const data = await userApi.getUsers({ limit: 100 });
      setManagers(data.users.filter((u) => u.role === 'manager'));
    } catch (err) {
      setError('Failed to load managers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await userApi.createManager(form);
      setSuccess(`Manager "${form.name}" created successfully!`);
      setForm({ name: '', email: '', password: '' });
      setShowCreate(false);
      loadManagers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create manager');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete manager "${name}"? This cannot be undone.`)) return;
    setError('');
    setSuccess('');
    try {
      await userApi.deleteUser(id);
      setSuccess(`Manager "${name}" deleted.`);
      loadManagers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete manager');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manager Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage POS operators</p>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setError(''); setSuccess(''); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          <FiUserPlus className="w-4 h-4" />
          {showCreate ? 'Cancel' : 'Add Manager'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <FiAlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Create Manager Form */}
      {showCreate && (
        <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="font-semibold text-gray-800 mb-4">New Manager</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Rajesh Kumar"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email (Login ID)</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="e.g. manager@prandhara.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 characters"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              Create Manager
            </button>
          </form>
        </div>
      )}

      {/* Managers List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : managers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <FiUserPlus className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No managers yet. Click "Add Manager" to create one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Created</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {managers.map((m) => (
                <tr key={m._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{m.name}</td>
                  <td className="px-4 py-3 text-gray-500 flex items-center gap-1.5">
                    <FiMail className="w-3.5 h-3.5" />
                    {m.email}
                  </td>
                  <td className="px-4 py-3 text-gray-500 flex items-center gap-1.5">
                    <FiClock className="w-3.5 h-3.5" />
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(m._id, m.name)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete manager"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManagerManagement;
