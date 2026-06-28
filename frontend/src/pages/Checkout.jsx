import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ordersApi } from '../api/orders';
import { paymentApi, openRazorpayCheckout } from '../api/payments';
import { saveLocalCart } from '../utils/cartSync';
import toast from 'react-hot-toast';
import {
  FiCreditCard, FiDollarSign, FiSmartphone, FiShield, FiCheckCircle,
  FiArrowLeft, FiMapPin, FiTruck, FiPackage, FiLock, FiInfo,
} from 'react-icons/fi';

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [cart, setCart] = useState([]);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    customerId: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    prescription: null,
    paymentMethod: 'razorpay',
  });

  const subtotal = cart.reduce((sum, item) => sum + (item.sellingPrice || item.mrp || 0) * (item.quantity || 1), 0);
  const gst = subtotal * 0.12;
  const shippingCost = 499;
  const total = subtotal + gst + shippingCost;

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('prandhara_cart') || '[]');
    if (stored.length === 0) {
      navigate('/cart');
      return;
    }
    setCart(stored);
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '',
      }));
    }
    // Fetch Razorpay key
    paymentApi.getKey().then((data) => setRazorpayKey(data.key)).catch(() => {});
  }, [navigate, user]);

  const handleRazorpayPayment = async () => {
    if (!razorpayKey) {
      toast.error('Payment system not configured. Please contact support.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create a Razorpay order on our server
      const razorpayOrder = await paymentApi.createOrder({
        amount: total,
        receipt: `order_${Date.now()}`,
      });

      // 2. Open Razorpay checkout modal
      const paymentResponse = await openRazorpayCheckout({
        key: razorpayKey,
        amount: razorpayOrder.amount,
        orderId: razorpayOrder.id,
        name: 'Prandhara Medical Store',
        description: `Order of ${cart.length} item${cart.length > 1 ? 's' : ''}`,
        prefill: {
          name: form.name,
          phone: form.phone,
          email: user?.email || '',
        },
        theme: '#059669',
      });

      // 3. Verify payment signature on server
      const verifyRes = await paymentApi.verifyPayment({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
      });

      if (!verifyRes.verified) {
        throw new Error('Payment verification failed');
      }

      // 4. Create the order with verified payment details
      await placeOrder({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
      });
    } catch (err) {
      if (err?.error?.description) {
        toast.error(err.error.description);
      } else if (err?.message) {
        toast.error(err.message);
      } else {
        toast.error('Payment failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const placeOrder = async (razorpayData = {}) => {
    setSubmitting(true);
    try {
      const orderData = {
        items: cart.map((item) => ({
          product: item._id,
          name: item.name,
          quantity: item.quantity || 1,
          price: item.sellingPrice || item.mrp || 0,
        })),
        customer: {
          name: form.name,
          phone: form.phone,
          customerId: form.customerId,
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
        },
        payment: {
          method: 'razorpay',
          amount: total,
        },
        razorpay: razorpayData,
        prescription: form.prescription,
        subtotal,
        gst,
        grandTotal: total,
        shipping: {
          name: form.name,
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          courierPartner: 'Blue Dart',
          shippingCost,
        },
      };

      const order = await ordersApi.create(orderData);
      localStorage.removeItem('prandhara_cart');
      window.dispatchEvent(new Event('cartUpdated'));
      toast.success('Order placed successfully! 🎉');
      navigate('/my-orders');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCashOnDelivery = async () => {
    if (!form.name || !form.phone) {
      toast.error('Please fill in your contact details');
      setStep(1);
      return;
    }
    if (!form.address) {
      toast.error('Please enter your delivery address');
      setStep(1);
      return;
    }
    await placeOrder();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/cart" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 mb-6 transition-colors">
          <FiArrowLeft className="w-4 h-4" /> Back to Cart
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Checkout</h1>

        {/* Steps Progress */}
        <div className="mt-6 flex items-center gap-2 text-sm">
          {['Delivery', 'Payment', 'Confirm'].map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 ${step >= i + 1 ? 'text-emerald-600' : 'text-gray-400'}`}>
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step > i + 1 ? 'bg-emerald-600 text-white' : step === i + 1 ? 'border-2 border-emerald-600 text-emerald-600' : 'border-2 border-gray-300'
                }`}>
                  {step > i + 1 ? <FiCheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className="font-medium hidden sm:inline">{s}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-px ${step > i + 1 ? 'bg-emerald-400' : 'bg-gray-300'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Delivery Details */}
            {step === 1 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <FiTruck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Delivery Details</h2>
                    <p className="text-xs text-gray-500">Delivered via <span className="font-semibold text-blue-600">Blue Dart</span> Courier</p>
                  </div>
                </div>

                {/* Blue Dart badge */}
                <div className="mb-6 flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <FiPackage className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="text-xs text-blue-800">
                    <p className="font-semibold">Blue Dart Express Delivery</p>
                    <p className="text-blue-600">
                      Shipping: ₹{shippingCost}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Delivery Address *</label>
                    <textarea
                      rows={2}
                      value={form.address}
                      onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                      placeholder="House / Shop No., Street, Landmark"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">City</label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">State</label>
                      <input
                        type="text"
                        value={form.state}
                        onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Pincode</label>
                      <input
                        type="text"
                        value={form.pincode}
                        onChange={(e) => setForm((p) => ({ ...p, pincode: e.target.value }))}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        placeholder="6-digit pincode"
                        maxLength={6}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Customer ID <span className="text-gray-400 font-normal">(optional — helps admin identify you)</span>
                    </label>
                    <input
                      type="text"
                      value={form.customerId}
                      onChange={(e) => setForm((p) => ({ ...p, customerId: e.target.value }))}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                      placeholder="e.g. CUST-001 or leave blank"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Upload Prescription (optional)</label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setForm((p) => ({ ...p, prescription: e.target.files[0] }))}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
                    />
                    <p className="mt-1 text-xs text-gray-400">Upload a valid prescription (image or PDF)</p>
                  </div>
                </div>                  <button
                    onClick={() => {
                      if (!form.name || !form.phone) {
                        toast.error('Please fill in your name and phone');
                        return;
                      }
                      const cleanPhone = form.phone.replace(/\D/g, '');
                      if (cleanPhone.length !== 10) {
                        toast.error('Phone number must be exactly 10 digits');
                        return;
                      }
                      if (!form.address) {
                        toast.error('Please enter your delivery address');
                        return;
                      }
                      setStep(2);
                    }}
                    className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-all"
                >
                  Continue to Payment
                </button>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <FiLock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Payment Method</h2>
                    <p className="text-xs text-gray-500">Secured with <span className="font-semibold text-emerald-600">Razorpay</span></p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Razorpay - Primary */}
                  <button
                    onClick={() => setForm((p) => ({ ...p, paymentMethod: 'razorpay' }))}
                    className={`flex items-center gap-4 w-full p-4 rounded-xl border-2 transition-all ${
                      form.paymentMethod === 'razorpay' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                      form.paymentMethod === 'razorpay' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <FiCreditCard className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">Razorpay</p>
                      <p className="text-xs text-gray-500">Credit/Debit Card, UPI, Net Banking, Wallet</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src="https://razorpay.com/assets/razorpay-logo.svg" alt="Razorpay" className="h-6 w-auto opacity-60" />
                      {form.paymentMethod === 'razorpay' && <FiCheckCircle className="w-5 h-5 text-emerald-600" />}
                    </div>
                  </button>

                  {/* Cash on Delivery */}
                  <button
                    onClick={() => setForm((p) => ({ ...p, paymentMethod: 'cod' }))}
                    className={`flex items-center gap-4 w-full p-4 rounded-xl border-2 transition-all ${
                      form.paymentMethod === 'cod' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                      form.paymentMethod === 'cod' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <FiDollarSign className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">Cash on Delivery</p>
                      <p className="text-xs text-gray-500">Pay when you receive your order</p>
                    </div>
                    {form.paymentMethod === 'cod' && <FiCheckCircle className="w-5 h-5 text-emerald-600" />}
                  </button>
                </div>

                {/* Security assurance */}
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
                  <FiLock className="w-3.5 h-3.5 shrink-0" />
                  Your payment information is processed securely. We never store your card details.
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                    Back
                  </button>
                  <button onClick={() => setStep(3)} className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-all">
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirm & Place */}
            {step === 3 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Review Your Order</h2>

                <div className="mt-6 space-y-4">
                  {/* Delivery Info */}
                  <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <FiTruck className="w-4 h-4 text-blue-600" />
                      <span>Delivery via <span className="text-blue-600">Blue Dart</span></span>
                    </div>
                    <p className="text-sm text-gray-600">{form.name}</p>
                    <p className="text-sm text-gray-600">{form.phone}</p>
                    {form.address && <p className="text-sm text-gray-600">{form.address}</p>}
                    {(form.city || form.state || form.pincode) && (
                      <p className="text-sm text-gray-600">{[form.city, form.state, form.pincode].filter(Boolean).join(', ')}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Shipping: ₹{shippingCost}
                    </p>
                  </div>

                  {/* Payment Info */}
                  <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                      {form.paymentMethod === 'razorpay' ? (
                        <><FiCreditCard className="w-4 h-4 text-emerald-600" /><span>Pay with <span className="text-emerald-600">Razorpay</span></span></>
                      ) : (
                        <><FiDollarSign className="w-4 h-4 text-emerald-600" /><span>Cash on Delivery</span></>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {form.paymentMethod === 'razorpay'
                        ? 'You will be redirected to Razorpay secure checkout after placing the order.'
                        : 'Pay with cash when your order arrives.'}
                    </p>
                  </div>

                  {/* Items */}
                  <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Order Items ({cart.length})</p>
                    <ul className="space-y-2">
                      {cart.map((item) => (
                        <li key={item._id} className="text-sm text-gray-600 flex justify-between">
                          <span className="flex-1 min-w-0 mr-2">
                            <span className="truncate block">{item.name}</span>
                            <span className="text-xs text-gray-400">×{item.quantity || 1}</span>
                          </span>
                          <span className="font-medium whitespace-nowrap">₹{((item.sellingPrice || item.mrp || 0) * (item.quantity || 1)).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(2)} className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                    Back
                  </button>
                  <button
                    onClick={form.paymentMethod === 'razorpay' ? handleRazorpayPayment : handleCashOnDelivery}
                    disabled={submitting}
                    className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FiShield className="w-4 h-4" />
                        {form.paymentMethod === 'razorpay' ? `Pay ₹${total.toLocaleString()}` : `Place Order · ₹${total.toLocaleString()}`}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-fit sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FiPackage className="w-5 h-5 text-gray-400" />
              Order Summary
            </h2>
            <div className="mt-4 space-y-2">
              {cart.slice(0, 5).map((item) => (
                <div key={item._id} className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-sm overflow-hidden shrink-0">
                    {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : '💊'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 truncate text-sm font-medium">{item.name}</p>
                    <p className="text-gray-400 text-xs">Qty: {item.quantity || 1}</p>
                  </div>
                  <span className="font-medium text-sm">₹{((item.sellingPrice || item.mrp || 0) * (item.quantity || 1)).toLocaleString()}</span>
                </div>
              ))}
              {cart.length > 5 && <p className="text-xs text-gray-400">+{cart.length - 5} more items</p>}
            </div>
            <hr className="my-4" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST (12%)</span>
                <span>₹{gst.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <div className="flex items-center gap-1">
                  <FiTruck className="w-3.5 h-3.5 text-blue-500" />
                  <span>Delivery (Blue Dart)</span>
                </div>
                <span className="text-gray-600">₹{shippingCost}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between text-base font-bold text-gray-900">
                <span>Total</span>
                <span className="text-emerald-600">₹{total.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700">
              <FiShield className="w-3.5 h-3.5 shrink-0" />
              Secure checkout with Razorpay
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
