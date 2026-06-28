import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ordersApi } from '../api/orders';

import { FiPackage, FiCalendar, FiDollarSign, FiMapPin, FiUser, FiPhone, FiDownload, FiArrowLeft, FiCheckCircle, FiClock, FiHome, FiTruck, FiLock } from 'react-icons/fi';

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const data = await ordersApi.getById(id);
      setOrder(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  const statusColors = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FiClock },
    confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: FiCheckCircle },
    processing: { bg: 'bg-purple-100', text: 'text-purple-800', icon: FiPackage },
    shipped: { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: FiTruck },
    delivered: { bg: 'bg-green-100', text: 'text-green-800', icon: FiCheckCircle },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: FiClock },
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <FiPackage className="w-16 h-16 text-gray-300" />
        <h2 className="mt-4 text-xl font-bold text-gray-900">Order not found</h2>
        <Link to="/profile" className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium">Go to Profile</Link>
      </div>
    );
  }

  const statusInfo = statusColors[order.status] || statusColors.pending;
  const StatusIcon = statusInfo.icon;

  return (
    <>
      {/* Main Order Detail Content — hidden during slip print */}
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/my-orders" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
              <FiArrowLeft className="w-4 h-4" /> All Orders
            </Link>
            <span className="text-gray-300">|</span>
            <Link to="/profile" className="text-sm font-medium text-gray-500 hover:text-emerald-600 flex items-center gap-1 transition-colors">
              Profile
            </Link>
          </div>

          {/* Header */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Order #{order.invoiceNumber || order._id.slice(-8).toUpperCase()}</h1>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <FiCalendar className="w-3.5 h-3.5" />
                  Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
                <StatusIcon className="w-4 h-4" />
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
              >
                <FiDownload className="w-4 h-4" /> Print Invoice
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                <FiDownload className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Order Items */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Order Items</h2>
                <div className="mt-4 divide-y divide-gray-100">
                  {(order.items || order.products || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0">
                        💊
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{item.name || item.product?.name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">₹{(item.price || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Sub: ₹{((item.price || 0) * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Order Timeline</h2>
                <div className="mt-6 space-y-4">
                  {[
                    { status: 'Order Placed', time: order.createdAt, done: true },
                    { status: 'Order Confirmed', time: order.confirmedAt, done: !!order.confirmedAt },
                    { status: 'Processing', time: order.processingAt, done: !!order.processingAt },
                    { status: 'Shipped', time: order.shippedAt, done: !!order.shippedAt },
                    { status: 'Delivered', time: order.deliveredAt, done: !!order.deliveredAt },
                  ].map((event, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          event.done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 bg-white'
                        }`}>
                          {event.done && <FiCheckCircle className="w-3 h-3" />}
                        </div>
                        {idx < 4 && <div className={`w-0.5 flex-1 ${event.done ? 'bg-emerald-200' : 'bg-gray-200'}`} />}
                      </div>
                      <div className="pb-6">
                        <p className={`text-sm font-medium ${event.done ? 'text-gray-900' : 'text-gray-400'}`}>{event.status}</p>
                        {event.time && (
                          <p className="text-xs text-gray-500">{new Date(event.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Payment Summary</h2>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₹{(order.subtotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST</span>
                    <span>₹{(order.totalGst || order.gst || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    {order.discount > 0 && (
                      <>
                        <span>Discount</span>
                        <span className="text-red-500">-₹{(order.discount || 0).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                    <hr />
                    <div className="flex justify-between font-bold text-gray-900 text-base">
                      <span>Grand Total</span>
                      <span>₹{(order.grandTotal || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  {order.payments?.length > 0 ? (
                    <div className="mt-4 p-3 rounded-lg bg-gray-50 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        {order.razorpayPaymentId ? (
                          <>
                            <FiLock className="w-3.5 h-3.5 text-emerald-600" />
                            <p className="font-medium text-gray-900">Razorpay</p>
                          </>
                        ) : (
                          <FiDollarSign className="w-3.5 h-3.5 text-gray-500" />
                        )}
                      </div>
                      <p className="text-gray-500">{order.payments.map(p => p.method).join(', ').replace(/,([^,]*)$/, ' & $1')}</p>
                      {order.razorpayPaymentId && (
                        <div className="mt-1 text-xs text-gray-400">
                          <p>Payment ID: {order.razorpayPaymentId}</p>
                          {order.razorpayOrderId && <p>Order ID: {order.razorpayOrderId}</p>}
                        </div>
                      )}
                      <p className={`text-xs font-medium mt-1 ${order.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-yellow-600'}`}>
                        {order.paymentStatus === 'paid' ? '✓ Paid' : 'Pending'}
                      </p>
                    </div>
                  ) : order.payment?.method ? (
                    <div className="mt-4 p-3 rounded-lg bg-gray-50 text-sm">
                      <div className="flex items-center gap-1">
                        <FiDollarSign className="w-3.5 h-3.5 text-gray-500" />
                        <p className="font-medium text-gray-900 capitalize">{order.payment.method}</p>
                      </div>
                      {order.payment.status && (
                        <p className={`text-xs font-medium mt-1 ${order.payment.status === 'paid' ? 'text-emerald-600' : 'text-yellow-600'}`}>
                          {order.payment.status === 'paid' ? '✓ Paid' : 'Pending'}
                        </p>
                      )}
                    </div>
                  ) : null}
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Customer Details</h2>
                <div className="mt-4 space-y-3 text-sm">
                  {order.customers?.length > 0 ? order.customers.map((c, i) => (
                    <div key={i} className={i > 0 ? 'pt-3 border-t border-gray-100' : ''}>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiUser className="w-4 h-4 shrink-0" />
                        <span className="font-medium">
                          {c.customerId || c.customer?.customerId
                            ? `${c.customerId || c.customer?.customerId} - ${c.customerName || c.customer?.name || 'N/A'}`
                            : c.customerName || c.customer?.name || 'N/A'}
                        </span>
                      </div>
                      {c.customerPhone && (
                        <div className="flex items-center gap-2 text-gray-600 mt-1">
                          <FiPhone className="w-4 h-4 shrink-0" />
                          <span>Phone: {c.customerPhone}</span>
                        </div>
                      )}
                      {c.customer?.address && (
                        <div className="flex items-center gap-2 text-gray-600 mt-1">
                          <FiMapPin className="w-4 h-4 shrink-0" />
                          <span>{c.customer.address}</span>
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="flex items-center gap-2 text-gray-600">
                      <FiUser className="w-4 h-4" />
                      <span>Walk-in</span>
                    </div>
                  )}
                </div>
              </div>

              {/* POS Host */}
              {order.orderType === 'pos' && (order.dealerName || order.dealer?.name) && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">POS Host</h2>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <FiHome className="w-4 h-4 shrink-0 text-gray-400" />
                      <span className="font-medium">{order.dealerName || order.dealer?.name}</span>
                    </div>
                    {order.dealerPhone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiPhone className="w-4 h-4 shrink-0 text-gray-400" />
                        <span>{order.dealerPhone}</span>
                      </div>
                    )}
                    {order.dealer?.address && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiMapPin className="w-4 h-4 shrink-0 text-gray-400" />
                        <span>{order.dealer.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {order.invoiceNumber && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">Invoice</h2>
                  <p className="mt-2 text-sm text-gray-500">Invoice #{order.invoiceNumber}</p>
                </div>
              )}

              {/* Shipping / Blue Dart Tracking */}
              {order.shipping && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <FiTruck className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-gray-900">Blue Dart Delivery</h2>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2 text-gray-600">
                      <FiMapPin className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p>{order.shipping.name}</p>
                        <p>{order.shipping.phone}</p>
                        <p>{[order.shipping.address, order.shipping.city, order.shipping.state, order.shipping.pincode].filter(Boolean).join(', ')}</p>
                      </div>
                    </div>
                    {order.shipping.trackingNumber && (
                      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                        <p className="text-xs text-blue-600 font-medium">Tracking Number</p>
                        <p className="text-sm font-bold text-blue-800 mt-0.5 font-mono">{order.shipping.trackingNumber}</p>
                        <p className="text-xs text-blue-500 mt-1">Courier Partner: {order.shipping.courierPartner || 'Blue Dart'}</p>
                      </div>
                    )}
                    {order.shipping.estimatedDelivery && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiCalendar className="w-4 h-4" />
                        <span>Estimated Delivery: <strong>{new Date(order.shipping.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400">
                      {order.shipping.shippingCost === 0 ? '✓ Free Shipping' : `Shipping: ₹${order.shipping.shippingCost}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderDetail;
