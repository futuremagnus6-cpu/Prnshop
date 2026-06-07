import React, { useState, useEffect } from 'react';
import { customerApi } from '../../api/customers';
import { clearRequestCache } from '../../api/client';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUsers, FiRefreshCw } from 'react-icons/fi';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ customerId: '', name: '', phone: '', email: '', address: '' });

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const loadCustomers = async (forceRefresh) => {
    setLoading(true);
    try {
      if (forceRefresh) clearRequestCache('/customers');
      const params = { limit: 50 };
      if (search) params.search = search;
      const data = await customerApi.getAll(params);
      setCustomers(data.customers);
    } catch { toast.error('Failed to load'); } finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ customerId: '', name: '', phone: '', email: '', address: '' }); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ customerId: c.customerId || '', name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '' }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editing && !form.customerId.trim()) {
      toast.error('Please enter a Customer ID');
      return;
    }
    if (form.phone) {
      const cleanPhone = form.phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        toast.error('Phone number must be exactly 10 digits');
        return;
      }
    }
    try {
      if (editing) { await customerApi.update(editing._id, form); toast.success('Updated'); }
      else { await customerApi.create(form); toast.success('Created'); }
      setShowModal(false); loadCustomers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await customerApi.delete(id); toast.success('Deleted'); loadCustomers(); } catch { toast.error('Failed'); }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Customers</h1></div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadCustomers(true)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link
            to="/admin/dealers"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
          >
            <FiUsers className="w-4 h-4" /> Dealers
          </Link>
          <button onClick={openCreate} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
            <FiPlus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>
      <div className="relative max-w-sm mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr><th className="text-left px-4 py-3 font-medium">Customer ID</th><th className="text-left px-4 py-3 font-medium">Name</th><th className="text-left px-4 py-3 font-medium">Phone</th><th className="text-right px-4 py-3 font-medium">Orders</th><th className="text-right px-4 py-3 font-medium">Spent</th><th className="text-center px-4 py-3 font-medium">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
            )) : customers.map((c) => (
              <tr key={c._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.customerId}</td>
                <td className="px-4 py-3"><p className="font-medium text-gray-900">{c.name}</p></td>
                <td className="px-4 py-3 text-gray-600">{c.phone || '-'}</td>
                <td className="px-4 py-3 text-right">{c.totalOrders || 0}</td>
                <td className="px-4 py-3 text-right font-medium">₹{c.totalSpent?.toLocaleString() || 0}</td>
                <td className="px-4 py-3 text-center"><div className="flex justify-center gap-2">
                  <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><FiEdit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(c._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><FiTrash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Customer' : 'Add Customer'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {!editing ? (
                <div>
                  <input type="text" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    placeholder="Enter Customer ID *" required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <p className="text-[10px] text-gray-400 mt-1">You must provide a unique Customer ID</p>
                </div>
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-500 font-mono">
                  ID: {form.customerId}
                </div>
              )}
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name *" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone (10 digits)" maxLength={10} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
