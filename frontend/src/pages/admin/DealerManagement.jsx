import React, { useState, useEffect } from 'react';
import { dealerApi } from '../../api/dealers';
import { clearRequestCache } from '../../api/client';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUsers, FiChevronLeft, FiChevronRight, FiUserCheck, FiRefreshCw } from 'react-icons/fi';

const DealerManagement = () => {
  const [dealers, setDealers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: { street: '', city: '', state: '', pincode: '' }, gstNumber: '' });

  useEffect(() => {
    loadDealers();
  }, [page, search]);

  const loadDealers = async (forceRefresh) => {
    setLoading(true);
    try {
      if (forceRefresh) clearRequestCache('/dealers');
      const params = { page, limit: 15 };
      if (search) params.search = search;
      const data = await dealerApi.getAll(params);
      setDealers(data.dealers);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load'); } finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ name: '', phone: '', email: '', address: { street: '', city: '', state: '', pincode: '' }, gstNumber: '' }); setShowModal(true); };
  const openEdit = (d) => { setEditing(d); setForm({ name: d.name, phone: d.phone, email: d.email || '', address: d.address || { street: '', city: '', state: '', pincode: '' }, gstNumber: d.gstNumber || '' }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanPhone = form.phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }
    try {
      if (editing) { await dealerApi.update(editing._id, form); toast.success('Updated'); }
      else { await dealerApi.create(form); toast.success('Created'); }
      setShowModal(false); loadDealers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this dealer?')) return;
    try { await dealerApi.delete(id); toast.success('Deleted'); loadDealers(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Dealers</h1></div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadDealers(true)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link
            to="/admin/customers"
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-lg text-sm font-medium hover:bg-cyan-100 transition-colors"
          >
            <FiUserCheck className="w-4 h-4" /> Customers
          </Link>
          <button onClick={openCreate} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
            <FiPlus className="w-4 h-4" /> Add Dealer
          </button>
        </div>
      </div>
      <div className="relative max-w-sm mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search dealers..." className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Phone</th>
              <th className="text-right px-4 py-3 font-medium">Purchases</th>
              <th className="text-center px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={4} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
            )) : dealers.map((d) => (
              <tr key={d._id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><p className="font-medium text-gray-900">{d.name}</p><p className="text-xs text-gray-400">{d.email || 'No email'}</p></td>
                <td className="px-4 py-3 text-gray-600">{d.phone}</td>
                <td className="px-4 py-3 text-right font-medium">₹{d.totalPurchases?.toLocaleString() || 0}</td>
                <td className="px-4 py-3 text-center"><div className="flex justify-center gap-2">
                  <button onClick={() => openEdit(d)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><FiEdit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(d._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><FiTrash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination?.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-2 rounded-lg border text-gray-600 disabled:opacity-50"><FiChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm text-gray-600">Page {page} of {pagination.pages}</span>
          <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)} className="p-2 rounded-lg border text-gray-600 disabled:opacity-50"><FiChevronRight className="w-4 h-4" /></button>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Dealer' : 'Add Dealer'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dealer Name *" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone (10 digits) *" required maxLength={10} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={form.address.street} onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })} placeholder="Street" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="text" value={form.address.city} onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} placeholder="City" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <input type="text" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} placeholder="GST Number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
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

export default DealerManagement;
