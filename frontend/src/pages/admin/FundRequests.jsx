import React, { useState, useEffect, useCallback } from 'react';
import { fundRequestApi } from '../../api/fundRequests';
import { clearRequestCache } from '../../api/client';
import toast from 'react-hot-toast';
import { FiPlus, FiSearch, FiDownload, FiChevronLeft, FiChevronRight, FiRefreshCw, FiEye, FiTrash2, FiEdit2, FiX, FiUpload, FiFilter, FiFileText } from 'react-icons/fi';

const STATUS_BADGES = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  accepted: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};

const TRANSACTION_METHODS = ['Cash', 'Cheque', 'RTGS', 'NEFT', 'UPI', 'Bank Transfer'];

const FundRequests = () => {
  // Table state
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    requestTitle: '',
    requestedAmount: '',
    dateSent: '',
    transactionMethod: '',
    transactionReference: '',
    notes: '',
  });
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Detail modal state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [statusAction, setStatusAction] = useState('');
  const [adminComment, setAdminComment] = useState('');

  const loadRequests = useCallback(async (forceRefresh) => {
    setLoading(true);
    try {
      if (forceRefresh) clearRequestCache('/fund-requests');
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.transactionMethod = methodFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const data = await fundRequestApi.getAll(params);
      setRequests(data.requests);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load fund requests');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, methodFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // ---- Form handlers ----
  const openCreateForm = () => {
    setEditing(null);
    setForm({
      requestTitle: '',
      requestedAmount: '',
      dateSent: '',
      transactionMethod: '',
      transactionReference: '',
      notes: '',
    });
    setProofFile(null);
    setProofPreview(null);
    setShowForm(true);
  };

  const openEditForm = (req) => {
    setEditing(req);
    setForm({
      requestTitle: req.requestTitle,
      requestedAmount: req.requestedAmount,
      dateSent: req.dateSent ? req.dateSent.slice(0, 10) : '',
      transactionMethod: req.transactionMethod || '',
      transactionReference: req.transactionReference || '',
      notes: req.notes || '',
    });
    setProofFile(null);
    setProofPreview(req.proofFile ? `${import.meta.env.VITE_API_URL || ''}${req.proofFile}` : null);
    setShowForm(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProofFile(file);

    // Create preview
    if (file.type === 'application/pdf') {
      setProofPreview('pdf');
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setProofPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requestTitle.trim() || !form.requestedAmount) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val !== '' && val !== null) fd.append(key, val);
      });
      if (proofFile) fd.append('proofFile', proofFile);

      if (editing) {
        await fundRequestApi.update(editing._id, fd);
        toast.success('Fund request updated');
      } else {
        await fundRequestApi.create(fd);
        toast.success('Fund request submitted successfully');
      }
      setShowForm(false);
      loadRequests(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save fund request');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Status management ----
  const openStatusModal = (req) => {
    setSelectedRequest(req);
    setStatusAction(req.status);
    setAdminComment(req.adminComments || '');
    setShowDetail(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedRequest) return;
    try {
      await fundRequestApi.updateStatus(selectedRequest._id, {
        status: statusAction,
        adminComments: adminComment,
      });
      toast.success(`Status updated to ${statusAction}`);
      setShowDetail(false);
      setSelectedRequest(null);
      loadRequests(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // ---- Delete ----
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this fund request permanently?')) return;
    try {
      await fundRequestApi.delete(id);
      toast.success('Fund request deleted');
      loadRequests();
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ---- Export CSV ----
  const handleExportCsv = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.transactionMethod = methodFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const blob = await fundRequestApi.exportCsv(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fund-requests.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  // ---- File URL helper ----
  const getFileUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || '';
    return `${baseUrl}${path}`;
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fund Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track all fund requests</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadRequests(true)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={handleExportCsv} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <FiDownload className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={openCreateForm} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <FiPlus className="w-4 h-4" /> New Request
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by ID, title..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm transition-colors ${
              showFilters || statusFilter || methodFilter || dateFrom || dateTo
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FiFilter className="w-4 h-4" /> Filters
            {(statusFilter || methodFilter || dateFrom || dateTo) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Method</label>
              <select
                value={methodFilter}
                onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Methods</option>
                {TRANSACTION_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Request ID</th>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Ref. No</th>
                <th className="text-left px-4 py-3 font-medium">Method</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <FiFileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No fund requests found</p>
                    <button onClick={openCreateForm} className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                      Create your first request
                    </button>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-gray-700">{req.requestId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{req.requestTitle}</p>
                      {req.notes && <p className="text-xs text-gray-400 truncate max-w-[150px]">{req.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">₹{(req.requestedAmount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-600">{req.transactionReference || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {req.transactionMethod ? (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{req.transactionMethod}</span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_BADGES[req.status] || STATUS_BADGES.pending}`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => openStatusModal(req)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View / Manage"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditForm(req)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        {req.proofFile && (
                          <a
                            href={getFileUrl(req.proofFile)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Download Proof"
                          >
                            <FiDownload className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(req._id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination?.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {pagination.pages}
            <span className="text-gray-400 ml-1">({pagination.total} total)</span>
          </span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage(page + 1)}
            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? 'Edit Fund Request' : 'New Fund Request'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Request Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.requestTitle}
                    onChange={(e) => setForm({ ...form, requestTitle: e.target.value })}
                    placeholder="e.g., Office Equipment Purchase"
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requested Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.requestedAmount}
                    onChange={(e) => setForm({ ...form, requestedAmount: e.target.value })}
                    placeholder="e.g., 50000"
                    min="0"
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Sent</label>
                  <input
                    type="date"
                    value={form.dateSent}
                    onChange={(e) => setForm({ ...form, dateSent: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Method</label>
                  <select
                    value={form.transactionMethod}
                    onChange={(e) => setForm({ ...form, transactionMethod: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select method...</option>
                    {TRANSACTION_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Reference</label>
                  <input
                    type="text"
                    value={form.transactionReference}
                    onChange={(e) => setForm({ ...form, transactionReference: e.target.value })}
                    placeholder="e.g., UTR123456789"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Any additional details..."
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload Proof (JPG, PNG, PDF)</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-emerald-400 hover:text-emerald-600 cursor-pointer transition-colors">
                      <FiUpload className="w-4 h-4" />
                      Choose File
                      <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} className="hidden" />
                    </label>
                    {proofFile && <span className="text-sm text-gray-500">{proofFile.name}</span>}
                  </div>
                  {/* Preview */}
                  {proofPreview && (
                    <div className="mt-3">
                      {proofPreview === 'pdf' ? (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <FiFileText className="w-5 h-5 text-red-500" />
                          <span className="text-sm text-red-700">PDF file selected</span>
                        </div>
                      ) : (
                        <div className="relative inline-block">
                          <img src={proofPreview} alt="Preview" className="h-32 w-auto rounded-lg border border-gray-200 object-cover" />
                          <button
                            type="button"
                            onClick={() => { setProofFile(null); setProofPreview(null); }}
                            className="absolute -top-2 -right-2 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <FiX className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {editing && !proofFile && editing.proofFile && (
                    <div className="mt-2">
                      <a
                        href={getFileUrl(editing.proofFile)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        <FiDownload className="w-3 h-3" /> View current proof
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Saving...' : editing ? 'Update Request' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Status Management Modal */}
      {showDetail && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="text-lg font-bold text-gray-900">
                Fund Request Details
              </h2>
              <button onClick={() => setShowDetail(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium border ${STATUS_BADGES[selectedRequest.status]}`}>
                  {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                </span>
                <span className="text-xs text-gray-400 font-mono">{selectedRequest.requestId}</span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Request Title</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedRequest.requestTitle}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Requested Amount</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">₹{(selectedRequest.requestedAmount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Date Sent</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedRequest.dateSent ? new Date(selectedRequest.dateSent).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Transaction Method</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedRequest.transactionMethod || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Reference Number</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedRequest.transactionReference || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Created At</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {new Date(selectedRequest.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Last Updated</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {new Date(selectedRequest.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {selectedRequest.notes && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Notes / Remarks</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedRequest.notes}</p>
                </div>
              )}

              {/* Proof File */}
              {selectedRequest.proofFile && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Uploaded Proof</p>
                  {selectedRequest.proofFile.endsWith('.pdf') ? (
                    <a
                      href={getFileUrl(selectedRequest.proofFile)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 hover:bg-red-100 transition-colors"
                    >
                      <FiFileText className="w-5 h-5" />
                      View PDF Document
                    </a>
                  ) : (
                    <a
                      href={getFileUrl(selectedRequest.proofFile)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={getFileUrl(selectedRequest.proofFile)}
                        alt="Proof"
                        className="max-h-48 rounded-lg border border-gray-200 object-contain"
                      />
                    </a>
                  )}
                </div>
              )}

              {/* Admin Status Management */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Admin Actions</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
                    <select
                      value={statusAction}
                      onChange={(e) => setStatusAction(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Comments</label>
                    <textarea
                      value={adminComment}
                      onChange={(e) => setAdminComment(e.target.value)}
                      placeholder="Add comments about this request..."
                      rows={3}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                  <button
                    onClick={handleStatusUpdate}
                    className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Update Status & Comments
                  </button>
                </div>
              </div>

              {/* Existing admin comments */}
              {selectedRequest.adminComments && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Previous Comments</p>
                  <p className="text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
                    {selectedRequest.adminComments}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundRequests;
