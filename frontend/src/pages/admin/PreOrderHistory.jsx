import React, { useState, useEffect } from 'react';
import { orderApi } from '../../api/orders';
import { clearRequestCache } from '../../api/client';
import toast from 'react-hot-toast';
import { FiCheck, FiEdit2, FiX, FiChevronLeft, FiChevronRight, FiAlertTriangle, FiClock, FiSave, FiUser, FiPhone, FiEye } from 'react-icons/fi';

const PreOrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [confirming, setConfirming] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [viewingOrder, setViewingOrder] = useState(null);

  useEffect(() => {
    loadPreOrders();
  }, [page]);

  const loadPreOrders = async (forceRefresh) => {
    setLoading(true);
    try {
      if (forceRefresh) clearRequestCache('/orders');
      const data = await orderApi.getPreOrders({ page, limit: 15 });
      setOrders(data.orders || []);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load pre-orders');
    } finally {
      setLoading(false);
    }
  };

  // Silent background refresh — clears cache and fetches fresh data without showing loading skeletons
  const silentRefresh = async () => {
    try {
      clearRequestCache('/orders');
      const data = await orderApi.getPreOrders({ page, limit: 15 });
      if (data.orders) setOrders(data.orders);
      if (data.pagination) setPagination(data.pagination);
    } catch {}
  };

  const handleConfirm = async (id) => {
    setConfirming(id);
    try {
      await orderApi.confirmPreOrder(id);
      toast.success('Pre-order confirmed successfully!');
      setOrders((prev) => prev.filter((o) => o._id !== id));
      silentRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm');
    } finally {
      setConfirming(null);
    }
  };

  const handleView = async (order) => {
    // If order details are already populated, just show modal
    if (order.items && order.items.length > 0) {
      setViewingOrder(order);
      return;
    }
    // Otherwise fetch full details for deeper info
    try {
      const data = await orderApi.getById(order._id);
      setViewingOrder(data.order || data);
    } catch {
      // List already has populated data — show it silently
      setViewingOrder(order);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this pre-order? This will restore stock.')) return;
    setConfirming(id);
    // Optimistically remove from UI immediately
    setOrders((prev) => prev.filter((o) => o._id !== id));
    try {
      await orderApi.updateStatus(id, 'rejected');
      toast.success('Pre-order rejected');
      silentRefresh();
    } catch {
      toast.error('Failed to reject');
      silentRefresh();
    } finally {
      setConfirming(null);
    }
  };

  const startEdit = (order) => {
    const payInfo = getPaymentInfo(order);
    setEditingId(order._id);
    setEditForm({
      customers: (order.customers || []).map((c) => ({
        name: c.customerName || c.customer?.name || '',
        phone: c.customerPhone || '',
        customerId: c.customerId || '',
      })),
      discount: order.discount || 0,
      notes: order.notes || '',
      dealerName: order.dealerName || '',
      dealerPhone: order.dealerPhone || '',
      // Payment fields — pre-fill due amount
      newPayment: {
        method: 'cash',
        amount: payInfo.due > 0 ? payInfo.due : 0,
        transactionId: '',
      },
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditCustomerChange = (idx, field, value) => {
    setEditForm((prev) => ({
      ...prev,
      customers: prev.customers.map((c, i) =>
        i === idx ? { ...c, [field]: value } : c
      ),
    }));
  };

  const addEditCustomer = () => {
    setEditForm((prev) => ({
      ...prev,
      customers: [...prev.customers, { name: '', phone: '', customerId: '' }],
    }));
  };

  const removeEditCustomer = (idx) => {
    setEditForm((prev) => ({
      ...prev,
      customers: prev.customers.filter((_, i) => i !== idx),
    }));
  };

  const handleSaveEdit = async () => {
    try {
      const { newPayment, ...payload } = editForm;
      // Include payment if amount > 0
      if (newPayment?.amount > 0) {
        payload.payments = [
          {
            method: newPayment.method,
            amount: Number(newPayment.amount),
            transactionId: newPayment.transactionId || '',
          },
        ];
      }

      const res = await orderApi.updatePreOrder(editingId, payload);
      toast.success('Pre-order updated');
      setEditingId(null);
      setEditForm({});
      silentRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  // Check if a customer is missing ID
  const hasMissingId = (order) => {
    if (!order.customers?.length) return true;
    return order.customers.some((c) => !c.customerId && !c.customer?.customerId);
  };

  // Calculate payment info for a pre-order
  const getPaymentInfo = (order) => {
    const totalPaid = (order.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const grandTotal = order.grandTotal || 0;
    const due = grandTotal - totalPaid;
    const status = order.paymentStatus || 'pending';
    return { totalPaid, grandTotal, due, status };
  };

  const formatCurrency = (val) => `₹${(val || 0).toFixed(2)}`;

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pre-Order History</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pagination?.total || orders.length} orders awaiting confirmation
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <FiClock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Pre-Orders Pending Confirmation</p>            <p className="text-xs text-amber-700 mt-0.5">
              These POS orders are awaiting your confirmation. Orders with <span className="font-semibold">missing Customer IDs</span> are highlighted in red.
              Orders with <span className="font-semibold">incomplete payment</span> show the due amount — payment must be fully cleared before confirming.
              Click <strong>Confirm</strong> to move to Orders, or <strong>Edit</strong> to update customer details first.
            </p>
        </div>
      </div>

      {/* Pre-Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Invoice</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Dealer</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-center px-4 py-3 font-medium">Payment</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <FiClock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No pre-orders</p>
                    <p className="text-xs text-gray-400 mt-1">All POS orders have been confirmed.</p>
                  </td>
                </tr>
              ) : orders.map((order) => {
                const isEditing = editingId === order._id;
                const missingId = hasMissingId(order);
                const payInfo = getPaymentInfo(order);
                const isPayIncomplete = payInfo.status !== 'paid';

                return (
                  <tr
                    key={order._id}
                    className={`transition-all duration-300 ${
                      missingId && !isEditing
                        ? 'bg-red-50 hover:bg-red-100/70'
                        : isEditing
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-xs">{order.invoiceNumber}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                      {missingId && !isEditing && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 mt-1">
                          <FiAlertTriangle className="w-3 h-3" /> No Customer ID
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          {editForm.customers.map((c, ci) => (
                            <div key={ci} className="bg-white rounded-lg border border-gray-200 p-2 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-medium text-gray-500">Customer {ci + 1}</span>
                                {editForm.customers.length > 1 && (
                                  <button onClick={() => removeEditCustomer(ci)} className="text-red-400 hover:text-red-600">
                                    <FiX className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                value={c.customerId}
                                onChange={(e) => handleEditCustomerChange(ci, 'customerId', e.target.value)}
                                placeholder="Customer ID"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                              <input
                                type="text"
                                value={c.name}
                                onChange={(e) => handleEditCustomerChange(ci, 'name', e.target.value)}
                                placeholder="Customer Name"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                              <input
                                type="text"
                                value={c.phone}
                                onChange={(e) => handleEditCustomerChange(ci, 'phone', e.target.value)}
                                placeholder="Phone"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          ))}
                          <button
                            onClick={addEditCustomer}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            + Add Customer
                          </button>
                        </div>
                      ) : (
                        <>
                          {order.customers?.length > 0 ? (
                            order.customers.map((c, ci) => {
                              const custId = c.customerId || c.customer?.customerId;
                              return (
                                <div key={ci} className={ci > 0 ? 'mt-1 pt-1 border-t border-gray-100' : ''}>
                                  <p className={`text-sm ${custId ? 'text-gray-900' : 'text-red-600 font-medium'}`}>
                                    {custId
                                      ? `${custId} - ${c.customerName || c.customer?.name || 'N/A'}`
                                      : (c.customerName || c.customer?.name || 'N/A') + ' (No ID)'}
                                  </p>
                                  {c.customerPhone && (
                                    <p className="text-xs text-gray-400">{c.customerPhone}</p>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-red-600 font-medium">No customer data</p>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={editForm.dealerName}
                            onChange={(e) => setEditForm((p) => ({ ...p, dealerName: e.target.value }))}
                            placeholder="Dealer Name"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <input
                            type="text"
                            value={editForm.dealerPhone}
                            onChange={(e) => setEditForm((p) => ({ ...p, dealerPhone: e.target.value }))}
                            placeholder="Dealer Phone"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gray-900">{order.dealerName || '-'}</p>
                          <p className="text-xs text-gray-400">{order.dealerPhone || ''}</p>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-xs text-gray-500">₹</span>
                          <input
                            type="number"
                            value={editForm.discount}
                            onChange={(e) => setEditForm((p) => ({ ...p, discount: Number(e.target.value) || 0 }))}
                            className="w-16 px-1 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-xs text-gray-400">disc</span>
                        </div>
                      ) : (
                        formatCurrency(order.grandTotal)
                      )}
                    </td>
                    {/* Payment Column */}
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        payInfo.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                            ✓ Paid
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            {/* Current payment summary */}
                            <div className="text-[10px] leading-tight mb-1">
                              <div className="text-gray-500">Current: <span className="font-medium text-gray-700">{formatCurrency(payInfo.totalPaid)}</span></div>
                              <div className="text-red-500 font-semibold">Due: {formatCurrency(payInfo.due)}</div>
                            </div>
                            {/* New payment input */}
                            <div className="bg-blue-50 rounded-lg p-2 border border-blue-200 w-36">
                              <p className="text-[9px] font-semibold text-blue-700 uppercase mb-1">Add Payment</p>
                              <select
                                value={editForm.newPayment?.method || 'cash'}
                                onChange={(e) => setEditForm((p) => ({ ...p, newPayment: { ...p.newPayment, method: e.target.value } }))}
                                className="w-full px-1.5 py-1 border border-blue-200 rounded text-[10px] bg-white mb-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              >
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                                <option value="credit">Credit</option>
                                <option value="company">Company</option>
                              </select>
                              <input
                                type="number"
                                value={editForm.newPayment?.amount || ''}
                                onChange={(e) => setEditForm((p) => ({ ...p, newPayment: { ...p.newPayment, amount: Number(e.target.value) } }))}
                                placeholder="Amount"
                                className="w-full px-1.5 py-1 border border-blue-200 rounded text-[10px] bg-white mb-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                              <input
                                type="text"
                                value={editForm.newPayment?.transactionId || ''}
                                onChange={(e) => setEditForm((p) => ({ ...p, newPayment: { ...p.newPayment, transactionId: e.target.value } }))}
                                placeholder="Txn ID (optional)"
                                className="w-full px-1.5 py-1 border border-blue-200 rounded text-[10px] bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          {/* Payment Status Badge */}
                          {payInfo.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                              ✓ Paid
                            </span>
                          ) : payInfo.status === 'partial' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700">
                              ⚡ Partial
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                              ✗ Not Paid
                            </span>
                          )}
                          {/* Amount Paid */}
                          {payInfo.status !== 'paid' && (
                            <div className="text-[10px] leading-tight">
                              {payInfo.totalPaid > 0 ? (
                                <>
                                  <span className="text-gray-500">Paid: </span>
                                  <span className="text-gray-700 font-medium">{formatCurrency(payInfo.totalPaid)}</span>
                                </>
                              ) : null}
                              <div>
                                <span className="text-red-500 font-semibold">Due: {formatCurrency(payInfo.due)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="space-y-1">
                          <textarea
                            value={editForm.notes}
                            onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                            placeholder="Notes..."
                            rows={2}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                          />
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          <FiClock className="w-3 h-3" /> Pre-Order
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSaveEdit}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Save"
                            >
                              <FiSave className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Cancel"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleView(order)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <FiEye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleConfirm(order._id)}
                              disabled={confirming === order._id}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Confirm"
                            >
                              {confirming === order._id ? (
                                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <FiCheck className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => startEdit(order)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(order._id)}
                              disabled={confirming === order._id}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Reject / Delete"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-2 rounded-lg border text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">Page {page} of {pagination.pages}</span>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="p-2 rounded-lg border text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="text-lg font-bold text-gray-900">Order Details</h2>
              <button onClick={() => setViewingOrder(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Invoice Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Invoice Number</p>
                  <p className="text-lg font-bold text-gray-900 font-mono">{viewingOrder.invoiceNumber || 'N/A'}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  <FiClock className="w-3 h-3" /> Pre-Order
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Dealer</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{viewingOrder.dealer?.name || viewingOrder.dealerName || '-'}</p>
                  {viewingOrder.dealer?.phone && <p className="text-xs text-gray-400">{viewingOrder.dealer.phone}</p>}
                  {viewingOrder.dealer?.gstNumber && <p className="text-xs text-gray-400">GST: {viewingOrder.dealer.gstNumber}</p>}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Processed By</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{viewingOrder.processedBy?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Created</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {viewingOrder.createdAt ? new Date(viewingOrder.createdAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Payment</p>
                {(() => {
                  const totalPaid = (viewingOrder.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
                  const due = (viewingOrder.grandTotal || 0) - totalPaid;
                  const status = viewingOrder.paymentStatus || 'pending';
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">Status:</span>
                        {status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            ✓ Paid
                          </span>
                        ) : status === 'partial' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                            ⚡ Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            ✗ Not Paid
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Grand Total</p>
                          <p className="font-semibold text-gray-900">{formatCurrency(viewingOrder.grandTotal)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total Paid</p>
                          <p className="font-semibold text-emerald-600">{formatCurrency(totalPaid)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Balance Due</p>
                          <p className={`font-semibold ${due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {due > 0 ? formatCurrency(due) : '₹0.00'}
                          </p>
                        </div>
                      </div>
                      {viewingOrder.payments?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Payment Breakdown</p>
                          {viewingOrder.payments.map((p, i) => (
                            <div key={i} className="flex justify-between text-xs py-0.5">
                              <span className="text-gray-600 capitalize">
                                {p.method === 'company' ? 'Company Billing' : p.method}
                                {p.transactionId ? <span className="text-gray-400 ml-1">({p.transactionId})</span> : ''}
                              </span>
                              <span className="font-medium text-gray-800">{formatCurrency(p.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Customers */}
              {viewingOrder.customers?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Customers</p>
                  <div className="space-y-2">
                    {viewingOrder.customers.map((c, ci) => (
                      <div key={ci} className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                        <FiUser className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {c.customerId || c.customer?.customerId || 'No ID'} - {c.customerName || c.customer?.name || 'N/A'}
                          </p>
                          {c.customerPhone && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <FiPhone className="w-3 h-3" /> {c.customerPhone}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Items Table */}
              {viewingOrder.items?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Products</p>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Product</th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Qty</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Rate</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {viewingOrder.items.map((item, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <p className="font-medium text-gray-900">{item.productName || item.name || 'N/A'}</p>
                              {item.batchNumber && <p className="text-[10px] text-gray-400">Batch: {item.batchNumber}</p>}
                            </td>
                            <td className="px-3 py-2 text-center">{item.quantity || 0}</td>
                            <td className="px-3 py-2 text-right">₹{(item.sellingPrice || item.price || 0).toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-medium">₹{(item.totalPrice || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">₹{(viewingOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                {viewingOrder.totalGst > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">GST</span>
                    <span className="text-gray-900">₹{viewingOrder.totalGst.toFixed(2)}</span>
                  </div>
                )}
                {viewingOrder.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-green-600">-₹{viewingOrder.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Grand Total</span>
                  <span className="text-emerald-600">₹{(viewingOrder.grandTotal || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Notes */}
              {viewingOrder.notes && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Notes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{viewingOrder.notes}</p>
                </div>
              )}

              {/* Prescription */}
              {viewingOrder.prescription && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Prescription</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{viewingOrder.prescription}</p>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setViewingOrder(null)}
                className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreOrderHistory;
