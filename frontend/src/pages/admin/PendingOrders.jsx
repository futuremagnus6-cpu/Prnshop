import React, { useState, useEffect } from 'react';
import { ordersApi } from '../../api/orders';
import { clearRequestCache } from '../../api/client';
import toast from 'react-hot-toast';
import { FiClock, FiCheckCircle, FiXCircle, FiEye, FiPrinter, FiDownload, FiSearch, FiChevronDown, FiChevronUp, FiPackage, FiUser, FiPhone, FiCalendar, FiDollarSign, FiRefreshCw } from 'react-icons/fi';

const PendingOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    let result = orders;
    if (statusFilter) result = result.filter((o) => o.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.invoiceNumber?.toLowerCase().includes(q) ||
          o.customer?.name?.toLowerCase().includes(q) ||
          o._id?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [orders, search, statusFilter]);

  const loadOrders = async (forceRefresh) => {
    try {
      if (forceRefresh) clearRequestCache('/orders');
      const data = await ordersApi.getAll({ status: statusFilter });
      setOrders(data.orders || data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await ordersApi.updateStatus(id, status);
      toast.success(`Order ${status} successfully`);
      loadOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order');
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>          <div className="flex items-center gap-3">
          <button
              onClick={() => loadOrders(true)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="">All Orders</option>
          </select>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders..."
              className="rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-48"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FiPackage className="mx-auto w-16 h-16 text-gray-300" />
          <p className="mt-4 text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <div key={order._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                      <FiPackage className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Order #{order.invoiceNumber || order._id.slice(-8).toUpperCase()}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3" /> {new Date(order.createdAt).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><FiUser className="w-3 h-3" /> {order.customer?.name || order.name || 'Walk-in'}</span>
                        <span className="flex items-center gap-1"><FiDollarSign className="w-3 h-3" /> ₹{(order.grandTotal || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <button
                      onClick={() => setExpanded(expanded === order._id ? null : order._id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {expanded === order._id ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expanded === order._id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Customer Details</h4>
                        <div className="text-sm space-y-1">
                          <p><span className="text-gray-500">Name:</span> {order.customer?.name || order.name || 'N/A'}</p>
                          <p><span className="text-gray-500">Phone:</span> {order.customer?.phone || order.phone || 'N/A'}</p>
                          <p><span className="text-gray-500">Address:</span> {order.customer?.address || order.address || 'N/A'}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Order Items</h4>
                        <div className="text-sm space-y-1">
                          {(order.items || order.products || []).map((item, idx) => (
                            <p key={idx} className="flex justify-between">
                              <span>{item.name || item.product?.name} × {item.quantity}</span>
                              <span>₹{((item.price || 0) * item.quantity).toLocaleString()}</span>
                            </p>
                          ))}
                        </div>
                        <hr className="my-2" />
                        <div className="text-sm space-y-1">
                          <p className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{(order.subtotal || 0).toLocaleString()}</span></p>
                          <p className="flex justify-between"><span className="text-gray-500">GST</span><span>₹{(order.gst || 0).toLocaleString()}</span></p>
                          <p className="flex justify-between font-semibold"><span>Total</span><span>₹{(order.grandTotal || 0).toLocaleString()}</span></p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment</h4>
                        <div className="text-sm space-y-1">
                          <p><span className="text-gray-500">Method:</span> <span className="capitalize">{order.payment?.method || 'N/A'}</span></p>
                          {order.payment?.transactionId && <p><span className="text-gray-500">Txn ID:</span> {order.payment.transactionId}</p>}
                        </div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">Actions</h4>
                        <div className="flex flex-wrap gap-2">
                          {order.status === 'pending' && (
                            <>
                              <button onClick={() => updateStatus(order._id, 'confirmed')} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-all">
                                <FiCheckCircle className="w-3 h-3" /> Confirm
                              </button>
                              <button onClick={() => updateStatus(order._id, 'cancelled')} className="flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition-all">
                                <FiXCircle className="w-3 h-3" /> Reject
                              </button>
                            </>
                          )}
                          {order.status === 'confirmed' && (
                            <button onClick={() => updateStatus(order._id, 'processing')} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-all">
                              Start Processing
                            </button>
                          )}
                          {order.status === 'processing' && (
                            <button onClick={() => updateStatus(order._id, 'shipped')} className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 transition-all">
                              Mark Shipped
                            </button>
                          )}
                          {order.status === 'shipped' && (
                            <button onClick={() => updateStatus(order._id, 'delivered')} className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-all">
                              Mark Delivered
                            </button>
                          )}
                          <button className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all">
                            <FiPrinter className="w-3 h-3" /> Print
                          </button>
                          <button className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all">
                            <FiDownload className="w-3 h-3" /> PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingOrders;
