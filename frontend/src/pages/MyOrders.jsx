import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import { storeSettingsApi } from '../api/storeSettings';
import { printSlipContent } from '../utils/printSlip';
import {
  FiPackage, FiCalendar, FiDollarSign, FiMapPin, FiUser, FiPhone,
  FiPrinter, FiCheckCircle, FiClock, FiHome, FiTruck,
  FiSearch, FiChevronDown, FiChevronUp,
  FiX, FiShoppingBag, FiEye,
} from 'react-icons/fi';

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FiClock,      order: 0 },
  confirmed:  { label: 'Confirmed',  bg: 'bg-blue-100',   text: 'text-blue-800',   icon: FiCheckCircle, order: 1 },
  processing: { label: 'Processing', bg: 'bg-purple-100', text: 'text-purple-800', icon: FiPackage,    order: 2 },
  shipped:    { label: 'Shipped',    bg: 'bg-indigo-100', text: 'text-indigo-800', icon: FiTruck,      order: 3 },
  delivered:  { label: 'Delivered',  bg: 'bg-green-100',  text: 'text-green-800',  icon: FiCheckCircle, order: 4 },
  cancelled:  { label: 'Cancelled',  bg: 'bg-red-100',    text: 'text-red-800',    icon: FiX,          order: -1 },
  rejected:   { label: 'Rejected',   bg: 'bg-red-100',    text: 'text-red-800',    icon: FiX,          order: -1 },
  preorder:   { label: 'Pre-order',  bg: 'bg-orange-100', text: 'text-orange-800', icon: FiClock,      order: 0 },
};

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [showPrintSlip, setShowPrintSlip] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);
  const [slipLoading, setSlipLoading] = useState(false);
  const [printOrder, setPrintOrder] = useState(null);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await ordersApi.getMyOrders();
      setOrders(data.orders || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handlePrintSlip = async (order) => {
    setSlipLoading(true);
    setPrintOrder(order);
    try {
      const data = await storeSettingsApi.get();
      setStoreInfo(data?.settings || null);
    } catch {
      setStoreInfo(null);
    } finally {
      setSlipLoading(false);
      setShowPrintSlip(true);
    }
  };

  // When print modal becomes visible, trigger print via useEffect
  useEffect(() => {
    if (!showPrintSlip || !printOrder) return;
    const timer = setTimeout(() => {
      const slipEl = document.getElementById('print-slip-content');
      if (slipEl) printSlipContent(slipEl);
    }, 200);
    return () => clearTimeout(timer);
  }, [showPrintSlip, printOrder]);

  const dismissPrintSlip = () => {
    setShowPrintSlip(false);
    setPrintOrder(null);
    loadOrders(); // Auto-refresh when dismissed
  };

  // Filter & search
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = !statusFilter || o.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q
      || (o.invoiceNumber && o.invoiceNumber.toLowerCase().includes(q))
      || (o.customers || []).some((c) =>
          (c.customerName || '').toLowerCase().includes(q)
          || (c.customerPhone || '').includes(q)
          || (c.customerId || '').toLowerCase().includes(q)
        );
    return matchesStatus && matchesSearch;
  });

  const totalOrders = orders.length;
  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      {/* Main content — hidden during print */}
      <div className="min-h-screen bg-gray-50 print:hidden">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FiShoppingBag className="w-7 h-7 text-emerald-600" />
                My Orders
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {totalOrders > 0
                  ? `${totalOrders} order${totalOrders > 1 ? 's' : ''} placed`
                  : 'Track and manage your orders'}
              </p>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm"
            >
              <FiShoppingBag className="w-4 h-4" />
              Continue Shopping
            </Link>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'All', count: totalOrders, filter: '', color: 'bg-gray-100 text-gray-700' },
              { label: 'Pending', count: statusCounts.pending || 0, filter: 'pending', color: 'bg-yellow-100 text-yellow-700' },
              { label: 'Confirmed', count: (statusCounts.confirmed || 0) + (statusCounts.shipped || 0), filter: 'confirmed', color: 'bg-blue-100 text-blue-700' },
              { label: 'Delivered', count: statusCounts.delivered || 0, filter: 'delivered', color: 'bg-green-100 text-green-700' },
            ].map((s) => (
              <button
                key={s.filter}
                onClick={() => setStatusFilter(s.filter)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  statusFilter === s.filter
                    ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <p className={`text-2xl font-bold ${s.color.split(' ')[1]}`}>{s.count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by invoice, customer, phone..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                  <div className="h-5 bg-gray-100 rounded w-48 mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-32 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-64" />
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <FiPackage className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery || statusFilter ? 'No orders match your filters' : 'No orders yet'}
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                {searchQuery || statusFilter
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Start shopping and your orders will appear here.'}
              </p>
              {!searchQuery && !statusFilter && (
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all"
                >
                  <FiShoppingBag className="w-4 h-4" />
                  Browse Products
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusCfg.icon;
                const isExpanded = expandedOrder === order._id;

                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all hover:shadow-sm"
                  >
                    {/* Order Header — clickable to expand */}
                    <button
                      onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${statusCfg.bg} ${statusCfg.text}`}>
                          <StatusIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            Order #{order.invoiceNumber || order._id.slice(-8).toUpperCase()}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <FiCalendar className="w-3 h-3" />
                              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <FiDollarSign className="w-3 h-3" />
                              ₹{(order.grandTotal || 0).toLocaleString()}
                            </span>
                            <span className={`hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`sm:hidden px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
                          {statusCfg.label}
                        </span>
                        {isExpanded ? <FiChevronUp className="w-5 h-5 text-gray-400" /> : <FiChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-5 pb-5">
                        {/* Quick actions row */}
                        <div className="flex flex-wrap gap-2 pt-4 pb-4 border-b border-gray-100">
                          <Link
                            to={`/orders/${order._id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"
                          >
                            <FiEye className="w-3.5 h-3.5" /> View Full Details
                          </Link>
                          <button
                            onClick={() => handlePrintSlip(order)}
                            disabled={slipLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                          >
                            <FiPrinter className="w-3.5 h-3.5" /> Print Slip
                          </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                          {/* Left Column: Items & Timeline */}
                          <div className="lg:col-span-2 space-y-5">
                            {/* Order Items */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <FiPackage className="w-4 h-4 text-gray-400" />
                                Items ({(order.items || []).length})
                              </h4>
                              <div className="space-y-2">
                                {(order.items || []).slice(0, 5).map((item, i) => (
                                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {item.productName || item.name || 'Item'}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Qty: {item.quantity} × ₹{Number(item.sellingPrice || item.price || 0).toLocaleString()}
                                      </p>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900 ml-3">
                                      ₹{(Number(item.totalPrice || (item.sellingPrice || item.price || 0) * (item.quantity || 1))).toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                                {(order.items || []).length > 5 && (
                                  <p className="text-xs text-gray-400 text-center">
                                    +{order.items.length - 5} more items
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Order Timeline */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <FiClock className="w-4 h-4 text-gray-400" />
                                Order Timeline
                              </h4>
                              <div className="space-y-3">
                                {[
                                  { label: 'Order Placed', time: order.createdAt, done: true },
                                  { label: 'Confirmed', time: order.confirmedAt, done: !!order.confirmedAt },
                                  { label: 'Shipped', time: order.shipping?.shippedAt || order.shippedAt, done: !!(order.shipping?.shippedAt || order.shippedAt) },
                                  { label: 'Delivered', time: order.shipping?.deliveredAt || order.deliveredAt, done: !!(order.shipping?.deliveredAt || order.deliveredAt) },
                                ].map((event, idx) => (
                                  <div key={idx} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                      <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                                        event.done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 bg-white'
                                      }`}>
                                        {event.done && <FiCheckCircle className="w-2.5 h-2.5" />}
                                      </div>
                                      {idx < 3 && <div className={`w-0.5 flex-1 min-h-[16px] ${event.done ? 'bg-emerald-200' : 'bg-gray-200'}`} />}
                                    </div>
                                    <div className="pb-2">
                                      <p className={`text-xs font-medium ${event.done ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {event.label}
                                      </p>
                                      {event.time && (
                                        <p className="text-[10px] text-gray-500">
                                          {new Date(event.time).toLocaleDateString('en-IN', {
                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                                          })}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Customer & Payment Info */}
                          <div className="space-y-4">
                            {/* Payment Summary */}
                            <div className="bg-gray-50 rounded-xl p-4">
                              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                                Payment Summary
                              </h4>
                              <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between text-gray-600">
                                  <span>Subtotal</span>
                                  <span>₹{(order.subtotal || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span>GST</span>
                                  <span>₹{(order.totalGst || 0).toLocaleString()}</span>
                                </div>
                                {order.discount > 0 && (
                                  <div className="flex justify-between text-red-500">
                                    <span>Discount</span>
                                    <span>-₹{order.discount.toLocaleString()}</span>
                                  </div>
                                )}
                                <hr className="border-gray-200" />
                                <div className="flex justify-between font-bold text-gray-900 text-base">
                                  <span>Total</span>
                                  <span className="text-emerald-600">₹{(order.grandTotal || 0).toLocaleString()}</span>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center gap-2 text-xs">
                                {order.paymentStatus === 'paid' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                                    <FiCheckCircle className="w-3 h-3" /> Paid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                                    <FiClock className="w-3 h-3" /> {order.paymentStatus === 'pending' ? 'Pending' : 'Partial'}
                                  </span>
                                )}
                                {order.payments?.length > 0 && (
                                  <span className="text-gray-400 capitalize">
                                    via {order.payments[0].method}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Customer Info */}
                            {(order.customers?.length > 0) && (
                              <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                                  Customer
                                </h4>
                                {order.customers.map((c, i) => (
                                  <div key={i} className={`text-sm ${i > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}`}>
                                    <p className="flex items-center gap-1.5 text-gray-900 font-medium">
                                      <FiUser className="w-3.5 h-3.5 text-gray-400" />
                                      {c.customerName || 'Walk-in'}
                                    </p>
                                    {c.customerPhone && (
                                      <p className="flex items-center gap-1.5 text-gray-500 mt-0.5 ml-5 text-xs">
                                        <FiPhone className="w-3 h-3" />
                                        {c.customerPhone}
                                      </p>
                                    )}
                                    {c.customerId && (
                                      <p className="text-gray-400 ml-5 text-[10px]">ID: {c.customerId}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Shipping Info */}
                            {order.shipping?.address && (
                              <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                  <FiTruck className="w-3.5 h-3.5 text-blue-500" />
                                  Delivery
                                </h4>
                                <div className="text-xs text-gray-600 space-y-0.5">
                                  <p className="font-medium text-gray-800">{order.shipping.name}</p>
                                  <p>{order.shipping.phone}</p>
                                  <p>{order.shipping.address}</p>
                                  {order.shipping.city && (
                                    <p>{[order.shipping.city, order.shipping.state, order.shipping.pincode].filter(Boolean).join(', ')}</p>
                                  )}
                                  {order.shipping.courierPartner && (
                                    <p className="text-blue-600 mt-1">via {order.shipping.courierPartner}</p>
                                  )}
                                  {order.shipping.trackingNumber && (
                                    <p className="mt-1 font-mono text-blue-800 font-semibold">
                                      Tracking: {order.shipping.trackingNumber}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Dealers (POS) */}
                            {(order.dealerName || order.dealer?.name) && (
                              <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                  <FiHome className="w-3.5 h-3.5 text-gray-400" />
                                  POS Host
                                </h4>
                                <p className="text-sm font-medium text-gray-900">{order.dealerName || order.dealer?.name}</p>
                                {order.dealerPhone && <p className="text-xs text-gray-500">{order.dealerPhone}</p>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Print Slip Modal — prints only the selected order slip */}
      {showPrintSlip && printOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 print:bg-white print:inset-auto print:relative print:z-0 flex items-center justify-center print:block">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] mx-4 print:w-[80mm] print:rounded-none print:shadow-none print:mx-auto print:p-2 overflow-y-auto max-h-[90vh] print:max-h-none">
            {/* Close button — hidden in print */}
            <div className="flex justify-end p-3 print:hidden">
              <button
                onClick={dismissPrintSlip}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Slip — this is what gets printed */}
            <div id="print-slip-content" className="px-4 pb-6 print:p-0">
              {/* Shop Header */}
              <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {storeInfo?.shopName || 'Prandhara Pharmacy & Healthcare'}
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  {storeInfo?.shopAddress || '123, Medical Complex, Main Road, City - 123456'}
                </p>
                <p className="text-xs text-gray-600">📞 {storeInfo?.shopPhone || '+91 98765 43210'}</p>
                {storeInfo?.shopEmail && <p className="text-xs text-gray-500">✉️ {storeInfo.shopEmail}</p>}
                {storeInfo?.shopGstin && <p className="text-xs text-gray-500">GST: {storeInfo.shopGstin}</p>}
                {storeInfo?.shopLicense && <p className="text-xs text-gray-500">Lic: {storeInfo.shopLicense}</p>}
              </div>

              {/* Invoice Info */}
              <div className="text-center mb-4">
                <h3 className="text-base font-bold text-gray-900">INVOICE</h3>
                <p className="text-xs text-gray-600">
                  #{printOrder.invoiceNumber || printOrder._id.slice(-8).toUpperCase()}
                </p>
                <p className="text-xs text-gray-500">
                  Date: {new Date(printOrder.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold capitalize bg-gray-100 text-gray-700">
                  {printOrder.status}
                </span>
              </div>

              {/* Customers */}
              {printOrder.customers?.length > 0 && (
                <div className="mb-3 text-xs border-b border-dashed border-gray-200 pb-3">
                  <p className="font-semibold text-gray-700">Customer(s):</p>
                  {printOrder.customers.map((c, i) => (
                    <p key={i} className="text-gray-600">
                      {c.customerName || 'Walk-in'}
                      {c.customerPhone ? ` (${c.customerPhone})` : ''}
                    </p>
                  ))}
                </div>
              )}

              {/* Items Table */}
              <table className="w-full text-xs mb-4">
                <thead>
                  <tr className="border-b border-dashed border-gray-300">
                    <th className="text-left py-1.5 font-semibold text-gray-700">#</th>
                    <th className="text-left py-1.5 font-semibold text-gray-700">Product</th>
                    <th className="text-center py-1.5 font-semibold text-gray-700">Qty</th>
                    <th className="text-right py-1.5 font-semibold text-gray-700">Rate</th>
                    <th className="text-right py-1.5 font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(printOrder.items || []).map((item, idx) => {
                    const price = item.sellingPrice || item.price || 0;
                    const qty = item.quantity || 1;
                    const total = item.totalPrice || (price * qty);
                    return (
                      <tr key={idx} className="border-b border-dashed border-gray-100">
                        <td className="py-1.5 text-gray-500">{idx + 1}</td>
                        <td className="py-1.5 text-gray-700">{item.productName || item.name}</td>
                        <td className="py-1.5 text-center text-gray-700">{qty}</td>
                        <td className="py-1.5 text-right text-gray-700">₹{Number(price).toLocaleString()}</td>
                        <td className="py-1.5 text-right text-gray-700 font-medium">₹{Number(total).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-dashed border-gray-300 pt-2 text-xs space-y-1 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{(printOrder.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST</span>
                  <span>₹{(printOrder.totalGst || 0).toLocaleString()}</span>
                </div>
                {printOrder.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount</span>
                    <span>-₹{printOrder.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-sm border-t border-gray-300 pt-1 mt-1">
                  <span>Grand Total</span>
                  <span>₹{(printOrder.grandTotal || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-gray-500 border-t border-dashed border-gray-300 pt-3">
                <p className="italic">{storeInfo?.footerMessage || 'Thank you for your business!'}</p>
                <p className="mt-1 text-[10px] text-gray-400">Powered by Prandhara ERP</p>
              </div>
            </div>

            {/* Action buttons - hidden in print */}
            <div className="flex gap-3 p-4 border-t border-gray-100 print:hidden">
              <button
                onClick={dismissPrintSlip}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const slipEl = document.getElementById('print-slip-content');
                  if (slipEl) printSlipContent(slipEl);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 transition-all shadow-sm"
              >
                <FiPrinter className="w-4 h-4 inline mr-1" /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MyOrders;
