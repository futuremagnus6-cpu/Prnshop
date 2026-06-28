import React, { useState, useEffect } from 'react';
import { productApi } from '../../api/products';
import { dealerApi } from '../../api/dealers';
import { customerApi } from '../../api/customers';
import { categoryApi } from '../../api/categories';
import { orderApi } from '../../api/orders';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiPlus, FiTrash2, FiPrinter, FiUser, FiUsers, FiDollarSign, FiPackage, FiShoppingCart } from 'react-icons/fi';

// Helper to validate 10-digit phone number
const isValidPhone = (phone) => /^\d{10}$/.test(phone);

const POSBilling = () => {
  const txnCheckTimers = React.useRef({});
  const navigate = useNavigate();
  const [dealer, setDealer] = useState({ name: '', phone: '', address: '' });
  const [dealerSearch, setDealerSearch] = useState('');
  const [dealers, setDealers] = useState([]);
  const [showDealerDropdown, setShowDealerDropdown] = useState(false);
  const [showNewDealerForm, setShowNewDealerForm] = useState(false);
  const [newDealerPhone, setNewDealerPhone] = useState('');
  const [newDealerAddress, setNewDealerAddress] = useState('');

  const [cartItems, setCartItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', customerId: '' });

  const [payments, setPayments] = useState([{ method: 'cash', amount: 0, transactionId: '', reference: '' }]);
  const [discount, setDiscount] = useState(0);
  const [receiptOrder, setReceiptOrder] = useState(null);

    const [txnValidationStatus, setTxnValidationStatus] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingStep, setBillingStep] = useState('items');
  const [allProducts, setAllProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productCategory, setProductCategory] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadDealers();
    loadAllProducts();
    loadCategories();
    const interval = setInterval(loadAllProducts, 30000);
    return () => {
      clearInterval(interval);
      // Clear any pending transaction ID check timers
      Object.values(txnCheckTimers.current).forEach(clearTimeout);
      txnCheckTimers.current = {};
      setTxnValidationStatus({});
    };
  }, []);

  const loadAllProducts = async () => {
    try {
      const data = await productApi.getAll({ limit: 1000 });
      setAllProducts(data.products || []);
    } catch {}
  };

  const loadCategories = async () => {
    try {
      const data = await categoryApi.getAll();
      setCategories(data.categories || []);
    } catch {}
  };

  const loadDealers = async () => {
    try {
      const data = await dealerApi.getAll({ limit: 20 });
      setDealers(data.dealers);
    } catch {}
  };

  const searchDealers = async (q) => {
    setDealerSearch(q);
    if (q.length > 1) {
      try {
        const data = await dealerApi.getAll({ search: q, limit: 5 });
        setDealers(data.dealers);
        setShowDealerDropdown(true);
      } catch {}
    }
  };

  const selectDealer = (d) => {
    setDealer({ _id: d._id, name: d.name, phone: d.phone, address: `${d.address?.street || ''}, ${d.address?.city || ''}` });
    setDealerSearch(d.name);
    setShowDealerDropdown(false);
  };

  const searchProducts = async (q) => {
    setProductSearch(q);
    if (q.length > 1) {
      try {
        const data = await productApi.getAll({ search: q, limit: 5 });
        setSearchResults(data.products);
        setShowSearch(true);
      } catch {}
    } else {
      setShowSearch(false);
    }
  };

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product === product._id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          toast.error('Insufficient stock');
          return prev;
        }
        return prev.map((item) =>
          item.product === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          product: product._id,
          name: product.name,
          batchNumber: product.batchNumber,
          mrp: product.mrp,
          sellingPrice: product.sellingPrice,
          gst: product.gst || 0,
          quantity: 1,
          stock: product.stockQuantity,
        },
      ];
    });
    setShowSearch(false);
    setProductSearch('');
  };

  const updateQuantity = (index, qty) => {
    setCartItems((prev) => {
      if (qty <= 0) return prev.filter((_, i) => i !== index);
      if (qty > prev[index].stock) {
        toast.error('Insufficient stock');
        return prev;
      }
      return prev.map((item, i) => (i === index ? { ...item, quantity: qty } : item));
    });
  };

  const removeItem = (index) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Customer management
  const addCustomer = () => {
    if (newCustomer.phone && !isValidPhone(newCustomer.phone.replace(/\D/g, ''))) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }
    setCustomers((prev) => [...prev, { ...newCustomer, key: Date.now() }]);
    setNewCustomer({ name: '', phone: '', customerId: '' });
    setShowCustomerModal(false);
  };

  const removeCustomer = (index) => {
    setCustomers((prev) => prev.filter((_, i) => i !== index));
  };

  const lookupCustomerId = async (customerId) => {
    try {
      const data = await customerApi.getByCustomerId(customerId);
      if (data.customer) {
        setNewCustomer((prev) => ({ ...prev, name: data.customer.name, phone: data.customer.phone }));
      }
    } catch {
      toast.error('Customer ID not found. They will be added without ID.');
    }
  };

  // Payment management
  const addPaymentMethod = () => {
    setPayments((prev) => [...prev, { method: 'cash', amount: 0, transactionId: '', reference: '' }]);
  };

  const updatePayment = (index, field, value) => {
    setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

    // Check transaction ID uniqueness when it changes
    if (field === 'transactionId') {
      if (!value || !value.trim()) {
        setTxnValidationStatus((prev) => ({ ...prev, [index]: null }));
        return;
      }

      // Mark as checking
      setTxnValidationStatus((prev) => ({ ...prev, [index]: 'checking' }));

      // Clear any existing timer for this index
      if (txnCheckTimers.current[index]) clearTimeout(txnCheckTimers.current[index]);

      txnCheckTimers.current[index] = setTimeout(async () => {
        try {
          const result = await orderApi.checkTransactionId(value.trim());
          setTxnValidationStatus((prev) => ({
            ...prev,
            [index]: result.exists ? 'duplicate' : 'unique',
          }));
          if (result.exists) {
            toast.error(`Transaction ID "${value}" already exists in the system! Please use a unique ID.`);
          }
        } catch {
          setTxnValidationStatus((prev) => ({ ...prev, [index]: null }));
        }
      }, 600);
    }
  };

  const removePayment = (index) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  const totalGst = cartItems.reduce((sum, item) => {
    const price = item.sellingPrice * item.quantity;
    return sum + price * (item.gst / 100);
  }, 0);
  const grandTotal = subtotal + totalGst - discount;
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBalance = grandTotal - totalPaid;

  const hasDuplicateTxn = Object.values(txnValidationStatus).some(s => s === 'duplicate');
  const hasCheckingTxn = Object.values(txnValidationStatus).some(s => s === 'checking');

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }

    // Validate dealer phone (must be 10 digits if dealer is selected)
    if (dealer.name) {
      if (!dealer.phone || !isValidPhone(dealer.phone.replace(/\D/g, ''))) {
        toast.error('Dealer phone number must be exactly 10 digits');
        return;
      }
    }

    // Validate customer phone numbers (must be 10 digits if provided)
    for (const c of customers) {
      if (c.phone && c.phone.replace(/\D/g, '').length !== 10) {
        toast.error(`Phone number for "${c.name}" must be exactly 10 digits`);
        return;
      }
    }

    // Check for duplicate transaction IDs before submitting (parallel check)
    const txnPayments = payments.filter(p => p.transactionId?.trim());
    if (txnPayments.length > 0) {
      setIsSubmitting(true);
      try {
        const txnResults = await Promise.all(
          txnPayments.map(async (p) => {
            const result = await orderApi.checkTransactionId(p.transactionId.trim());
            return { transactionId: p.transactionId, exists: result.exists };
          })
        );
        const duplicate = txnResults.find(r => r.exists);
        if (duplicate) {
          toast.error(`Transaction ID "${duplicate.transactionId}" already exists! Cannot place order with duplicate ID.`);
          setIsSubmitting(false);
          return;
        }
      } catch {
        // If check fails, continue - backend will validate
      } finally {
        setIsSubmitting(false);
      }
    }

    try {
      const payload = {
        dealer: dealer._id || undefined,
        dealerName: dealer.name,
        dealerPhone: dealer.phone,
        dealerAddress: dealer.address,
        items: cartItems.map((item) => ({
          product: item.product,
          quantity: item.quantity,
        })),
        customers: customers.map((c) => ({
          name: c.name,
          phone: c.phone,
          customerId: c.customerId || undefined,
        })),
        payments: payments
          .filter((p) => Number(p.amount) > 0)
          .map((p) => ({
            method: p.method,
            amount: Number(p.amount),
            transactionId: p.transactionId,
            reference: p.reference,
          })),
        discount,
      };

      const res = await orderApi.createPOS(payload);

      // Show different messages based on payment status
      const orderStatus = res.order?.paymentStatus;
      if (orderStatus === 'partial') {
        const due = (grandTotal - totalPaid).toFixed(2);
        toast.success(`Order placed with partial payment of ₹${totalPaid.toFixed(2)}. ₹${due} still due.`);
      } else if (orderStatus === 'pending') {
        toast.success('Order placed. Payment is pending — no amount was received.');
      } else {
        toast.success('Order placed successfully!');
      }

      // Warn about customers missing Customer ID
      const missingIdCustomers = customers.filter(c => !c.customerId);
      if (missingIdCustomers.length > 0) {
        const names = missingIdCustomers.map(c => `"${c.name}"`).join(', ');
        toast(`⚠ Customer ID not provided for ${names}. They will need confirmation in Pre-Orders.`, {
          duration: 5000,
        });
      }

      setReceiptOrder(res.order);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    }
  };

  return (
    <>
      {/* Billing UI - hidden during printing */}
      <div className="max-w-7xl mx-auto px-4 py-6 print:hidden">
      <h1 className="text-2xl font-bold mb-6">POS Billing</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search Products */}
          <div className="relative">
            {/* Category filter */}
            <div className="flex gap-2 mb-3">
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => searchProducts(e.target.value)}
                  placeholder="Search products by name or scan barcode..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Quick product grid - scrollable */}
            <div className="max-h-80 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 mb-4 p-1">
              {allProducts
                .filter((p) => !productCategory || p.category?._id === productCategory || p.category === productCategory)
                .map((product) => (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    disabled={product.stockQuantity <= 0}
                    className="flex flex-col items-center p-2 rounded-xl border border-gray-100 bg-white hover:border-emerald-300 hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-10 h-10 object-cover rounded-lg mb-1" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center mb-1">
                        <FiPackage className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                    <span className="text-[10px] text-gray-600 text-center leading-tight line-clamp-2">{product.name}</span>
                    <span className="text-[10px] font-semibold text-emerald-600 mt-0.5">₹{product.sellingPrice}</span>
                  </button>
                ))}
            </div>

            {/* Search Results Dropdown */}
            {showSearch && (
              <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-60 overflow-y-auto">
                {searchResults.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    disabled={product.stockQuantity <= 0}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-left disabled:opacity-40"
                  >
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                        <FiPackage className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-400">Batch: {product.batchNumber || 'N/A'} | Stock: {product.stockQuantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">₹{product.sellingPrice}</p>
                      {product.mrp > product.sellingPrice && (
                        <p className="text-xs text-gray-400 line-through">₹{product.mrp}</p>
                      )}
                    </div>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">No products found</div>
                )}
              </div>
            )}
          </div>

          {/* Cart Items Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Cart Items ({cartItems.length})</h2>
              {cartItems.length > 0 && (
                <button
                  onClick={() => setCartItems([])}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FiShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Cart is empty. Search and add products above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">Product</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">Batch</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase">Qty</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase">Price</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase">GST</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase">Total</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cartItems.map((item, index) => {
                      const lineTotal = item.sellingPrice * item.quantity;
                      const lineGst = lineTotal * (item.gst / 100);
                      return (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{item.name}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{item.batchNumber || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => updateQuantity(index, item.quantity - 1)}
                                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 0)}
                                className="w-14 text-center border border-gray-200 rounded-lg py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                min="1"
                                max={item.stock}
                              />
                              <button
                                onClick={() => updateQuantity(index, item.quantity + 1)}
                                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">₹{item.sellingPrice}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{item.gst}%</td>
                          <td className="px-4 py-3 text-right font-semibold">₹{(lineTotal + lineGst).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => removeItem(index)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Billing Summary */}
        <div className="space-y-6">
          {/* Dealer Selection */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Dealer / Supplier</h3>
            <div className="relative">
              <input
                type="text"
                value={dealerSearch}
                onChange={(e) => {
                  searchDealers(e.target.value);
                  setShowNewDealerForm(false);
                }}
                placeholder="Search or add new dealer..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {showDealerDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-50 overflow-y-auto">
                  {dealers.length > 0 && dealers.map((d) => (
                    <button
                      key={d._id}
                      onClick={() => selectDealer(d)}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    >
                      <p className="font-medium text-gray-900">{d.name}</p>
                      <p className="text-xs text-gray-400">{d.phone} • {d.address?.city || ''}</p>
                    </button>
                  ))}
                  {dealerSearch.length >= 2 && (
                    <button
                      onClick={() => {
                        setShowDealerDropdown(false);
                        setNewDealerPhone('');
                        setNewDealerAddress('');
                        setShowNewDealerForm(true);
                      }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-emerald-50 border-t border-gray-100 flex items-center gap-2 text-emerald-700 font-medium"
                    >
                      <FiPlus className="w-4 h-4" />
                      Add new dealer "{dealerSearch}"
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Inline new dealer form */}
            {showNewDealerForm && (
              <div className="mt-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                <p className="text-sm font-semibold text-emerald-800">New Dealer</p>
                <input
                  type="text"
                  value={dealerSearch}
                  onChange={(e) => setDealerSearch(e.target.value)}
                  placeholder="Dealer Name *"
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  value={newDealerPhone}
                  onChange={(e) => setNewDealerPhone(e.target.value)}
                  placeholder="Phone *"
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  value={newDealerAddress}
                  onChange={(e) => setNewDealerAddress(e.target.value)}
                  placeholder="Address (optional)"
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowNewDealerForm(false);
                      setNewDealerPhone('');
                      setNewDealerAddress('');
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!dealerSearch.trim() || !newDealerPhone.trim()) {
                        toast.error('Dealer name and phone are required');
                        return;
                      }
                      const cleanPhone = newDealerPhone.replace(/\D/g, '');
                      if (!isValidPhone(cleanPhone)) {
                        toast.error('Phone number must be exactly 10 digits');
                        return;
                      }
                      try {
                        const res = await dealerApi.create({
                          name: dealerSearch.trim(),
                          phone: newDealerPhone.trim(),
                          address: { street: newDealerAddress.trim() },
                        });
                        const newDealer = res.dealer;
                        setDealer({
                          _id: newDealer._id,
                          name: newDealer.name,
                          phone: newDealer.phone,
                          address: newDealer.address?.street || '',
                        });
                        setDealerSearch(newDealer.name);
                        setShowNewDealerForm(false);
                        setNewDealerPhone('');
                        setNewDealerAddress('');
                        toast.success('Dealer created successfully');
                        loadDealers();
                      } catch (err) {
                        toast.error(err.response?.data?.message || 'Failed to create dealer');
                      }
                    }}
                    disabled={!dealerSearch.trim() || !newDealerPhone.trim()}
                    className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40"
                  >
                    Save Dealer
                  </button>
                </div>
              </div>
            )}

            {dealer.name && !showDealerDropdown && !showNewDealerForm && (
              <div className="mt-2 p-3 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium text-gray-900">{dealer.name}</p>
                <p className="text-xs text-gray-400">{dealer.phone}{dealer.address ? ` • ${dealer.address}` : ''}</p>
                {dealer.phone && !isValidPhone(dealer.phone.replace(/\D/g, '')) && (
                  <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
                    <span>⚠</span> Phone must be exactly 10 digits
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Customers */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Customers</h3>
              <button
                onClick={() => setShowCustomerModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-100 hover:text-emerald-800 transition-all shadow-sm"
              >
                <FiUser className="w-4 h-4" /> Add Customer
              </button>
            </div>
            {customers.length === 0 ? (
              <p className="text-xs text-gray-400">No customers added yet</p>
            ) : (
              <div className="space-y-2">
                {customers.map((c, i) => {
                  const missingId = !c.customerId;
                  return (
                    <div key={c.key || i} className={`flex items-center justify-between p-2.5 rounded-xl ${missingId ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                      <div>
                        <p className={`text-sm font-medium ${missingId ? 'text-amber-900' : 'text-gray-900'}`}>
                          {c.name || <span className="italic text-gray-400">No name</span>}
                        </p>
                        <p className="text-xs text-gray-400">
                          {c.phone}{c.customerId ? ` • ID: ${c.customerId}` : ''}
                        </p>
                        {missingId && (
                          <p className="text-[11px] text-amber-600 mt-0.5 flex items-center gap-1">
                            <span>⚠</span> No Customer ID entered
                          </p>
                        )}
                      </div>
                      <button onClick={() => removeCustomer(i)} className="text-gray-300 hover:text-red-500">
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment</h3>
            <div className="space-y-3">
              {payments.map((payment, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={payment.method}
                      onChange={(e) => updatePayment(index, 'method', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="credit">Credit</option>
                      <option value="company">Company Billing</option>
                    </select>
                    {payments.length > 1 && (
                      <button
                        onClick={() => removePayment(index)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={payment.amount}
                      onChange={(e) => updatePayment(index, 'amount', e.target.value)}
                      placeholder="Amount"
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {payment.method === 'company' ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={payment.transactionId}
                          onChange={(e) => updatePayment(index, 'transactionId', e.target.value)}
                          placeholder="Order ID *"
                          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                        />
                        {txnValidationStatus[index] === 'duplicate' && (
                          <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                            <span>⚠</span> Already exists in system
                          </p>
                        )}
                        {txnValidationStatus[index] === 'unique' && (
                          <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                            <span>✓</span> Available
                          </p>
                        )}
                        {txnValidationStatus[index] === 'checking' && (
                          <p className="text-[11px] text-amber-500 mt-1 flex items-center gap-1">
                            <span>⟳</span> Checking...
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={payment.transactionId}
                          onChange={(e) => updatePayment(index, 'transactionId', e.target.value)}
                          placeholder="Txn ID (optional)"
                          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                        />
                        {txnValidationStatus[index] === 'duplicate' && (
                          <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                            <span>⚠</span> Already exists in system
                          </p>
                        )}
                        {txnValidationStatus[index] === 'unique' && (
                          <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                            <span>✓</span> Available
                          </p>
                        )}
                        {txnValidationStatus[index] === 'checking' && (
                          <p className="text-[11px] text-amber-500 mt-1 flex items-center gap-1">
                            <span>⟳</span> Checking...
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {payment.method === 'company' && (
                    <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl bg-white">
                      <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Order Date:</span>
                      <input
                        type="date"
                        value={payment.reference}
                        onChange={(e) => updatePayment(index, 'reference', e.target.value)}
                        className="flex-1 text-sm focus:outline-none bg-transparent"
                      />
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={addPaymentMethod}
                className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-emerald-300 hover:text-emerald-600 transition-colors"
              >
                + Add Payment Method
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            {/* Payment Warning Banner */}
            {remainingBalance > 0 && (
              <div className="mb-4 bg-red-50 border-2 border-red-300 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 text-lg">⚠</span>
                  <div>
                    <p className="text-sm font-bold text-red-700">Payment Not Complete</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      {totalPaid === 0
                        ? `No payment received yet. ₹${grandTotal.toFixed(2)} is due.`
                        : `Only ₹${totalPaid.toFixed(2)} paid. ₹${remainingBalance.toFixed(2)} still due.`}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-red-500 mt-1.5 ml-7">
                  This order will be placed as a <strong>Pre-Order</strong> and won't be confirmed until payment is complete.
                </p>
              </div>
            )}

            {/* Customer ID Warning Banner */}
            {customers.some(c => !c.customerId) && (
              <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className="text-amber-600 text-lg">⚠</span>
                  <div>
                    <p className="text-sm font-bold text-amber-700">Customer ID Required</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      {customers.filter(c => !c.customerId).map(c => `"${c.name}"`).join(', ')} {customers.filter(c => !c.customerId).length === 1 ? 'has' : 'have'} no Customer ID.
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-amber-500 mt-1.5 ml-7">
                  Orders without Customer IDs remain in Pre-Order and cannot be confirmed until an ID is provided.
                </p>
              </div>
            )}

            <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">GST</span>
                <span className="font-medium">₹{totalGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Discount</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-24 text-right px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between text-base font-bold">
                <span>Grand Total</span>
                <span className="text-emerald-600">₹{grandTotal.toFixed(2)}</span>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between">
                <span className="text-gray-500">Paid</span>
                <span className="font-medium text-green-600">₹{totalPaid.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between ${remainingBalance > 0 ? 'text-red-500 font-bold' : 'text-green-600'}`}>
                <span className="font-medium">{remainingBalance > 0 ? 'Balance Due' : 'Change'}</span>
                <span className="font-bold">₹{Math.abs(remainingBalance).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={cartItems.length === 0 || hasDuplicateTxn || hasCheckingTxn || isSubmitting}
              className={`w-full mt-5 font-semibold py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                remainingBalance > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isSubmitting ? (
                <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Checking...</>
              ) : hasDuplicateTxn ? (
                <>⚠ Fix duplicate TXN IDs</>
              ) : hasCheckingTxn ? (
                <>⟳ Verifying IDs...</>
              ) : remainingBalance > 0 ? (
                <><span>⚠</span> Place Pre-Order (₹{remainingBalance.toFixed(2)} due)</>
              ) : (
                'Place Order'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Add Customer</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newCustomer.customerId}
                onChange={(e) => {
                  setNewCustomer((prev) => ({ ...prev, customerId: e.target.value }));
                  if (e.target.value.length >= 4) lookupCustomerId(e.target.value);
                }}
                placeholder="Customer ID (optional)"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="text"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Customer Name *"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="text"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone (optional)"
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${newCustomer.phone && !isValidPhone(newCustomer.phone.replace(/\D/g, '')) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
              />
              {newCustomer.phone && !isValidPhone(newCustomer.phone.replace(/\D/g, '')) && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <span>⚠</span> Phone must be exactly 10 digits
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addCustomer}
                disabled={!newCustomer.name}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {receiptOrder && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 print:bg-white print:p-0 print:inset-auto print:relative print:z-0">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto print:shadow-none print:max-h-none print:rounded-none">
            {/* Receipt Content */}
            <div className="p-6 print:p-4">
              {/* Receipt Header */}
              <div className="text-center border-b-2 border-dashed border-gray-200 pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-900">Prandhara</h2>
                <p className="text-xs text-gray-400 mt-0.5">Pharmacy & Healthcare</p>
                <div className="mt-3 space-y-0.5">
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold">Invoice:</span> {receiptOrder.invoiceNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold">Date:</span>{' '}
                    {new Date(receiptOrder.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold">Status:</span>{' '}
                    <span className="capitalize">{receiptOrder.status}</span>
                  </p>
                </div>
              </div>

              {/* Dealer / Supplier Info */}
              {(receiptOrder.dealerName || receiptOrder.dealerPhone) && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dealer / Supplier</p>
                  {receiptOrder.dealerName && (
                    <p className="text-sm font-medium text-gray-900 mt-1">{receiptOrder.dealerName}</p>
                  )}
                  {receiptOrder.dealerPhone && (
                    <p className="text-xs text-gray-500">{receiptOrder.dealerPhone}</p>
                  )}
                  {receiptOrder.dealerAddress && (
                    <p className="text-xs text-gray-500">{receiptOrder.dealerAddress}</p>
                  )}
                </div>
              )}

              {/* Customers */}
              {receiptOrder.customers && receiptOrder.customers.length > 0 && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Customers</p>
                  {receiptOrder.customers.map((c, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium text-gray-900">{c.customerName}</span>
                      {(c.customerPhone || c.customerId) && (
                        <span className="text-gray-500 ml-2">
                          {c.customerPhone}{c.customerId ? ` • ID: ${c.customerId}` : ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Items Table */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Items</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-1.5 font-medium text-gray-400">#</th>
                      <th className="text-left py-1.5 font-medium text-gray-400">Product</th>
                      <th className="text-center py-1.5 font-medium text-gray-400">Qty</th>
                      <th className="text-right py-1.5 font-medium text-gray-400">Price</th>
                      <th className="text-right py-1.5 font-medium text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptOrder.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1.5 text-gray-400">{i + 1}</td>
                        <td className="py-1.5 font-medium text-gray-900">
                          {item.productName}
                          {item.batchNumber && (
                            <span className="text-gray-400 ml-1">({item.batchNumber})</span>
                          )}
                        </td>
                        <td className="py-1.5 text-center text-gray-700">{item.quantity}</td>
                        <td className="py-1.5 text-right text-gray-700">₹{Number(item.sellingPrice).toFixed(2)}</td>
                        <td className="py-1.5 text-right font-semibold text-gray-900">₹{Number(item.totalPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t-2 border-dashed border-gray-200 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-700">₹{Number(receiptOrder.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">GST</span>
                  <span className="text-gray-700">₹{Number(receiptOrder.totalGst || 0).toFixed(2)}</span>
                </div>
                {Number(receiptOrder.discount) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-red-500">-₹{Number(receiptOrder.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1.5">
                  <span className="text-gray-900">Grand Total</span>
                  <span className="text-emerald-600">₹{Number(receiptOrder.grandTotal).toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Methods */}
              {receiptOrder.payments && receiptOrder.payments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Payments</p>
                  {receiptOrder.payments.map((p, i) => (
                    <div key={i} className="flex justify-between text-xs mb-1 last:mb-0">
                      <span className="font-medium text-gray-700 capitalize">
                        {p.method === 'company' ? 'Company Billing' : p.method === 'cod' ? 'COD' : p.method === 'upi' ? 'UPI' : p.method}
                        {p.transactionId && <span className="text-gray-400 ml-1">({p.transactionId})</span>}
                      </span>
                      <span className="text-gray-900 font-medium">₹{Number(p.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="mt-5 pt-4 border-t-2 border-dashed border-gray-200 text-center">
                <p className="text-xs text-gray-400">Thank you for your business!</p>
                <p className="text-[10px] text-gray-300 mt-1">This is a computer-generated receipt.</p>
              </div>
            </div>

            {/* Action Buttons - hidden when printing */}
            <div className="px-6 pb-6 pt-2 flex gap-3 print:hidden">
              <button
                onClick={() => {
                  setReceiptOrder(null);
                  navigate('/admin/pre-orders');
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <FiPrinter className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* Receipt Preview Modal - visible when printing */}
      {receiptOrder && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 print:bg-white print:p-0 print:fixed print:inset-0 print:z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto print:shadow-none print:max-h-none print:rounded-none print:mx-auto print:my-0 print:w-[80mm]">
            {/* Receipt Content */}
            <div className="p-6 print:p-4">
              {/* Receipt Header */}
              <div className="text-center border-b-2 border-dashed border-gray-200 pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-900">Prandhara</h2>
                <p className="text-xs text-gray-400 mt-0.5">Pharmacy & Healthcare</p>
                <div className="mt-3 space-y-0.5">
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold">Invoice:</span> {receiptOrder.invoiceNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold">Date:</span>{' '}
                    {new Date(receiptOrder.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold">Status:</span>{' '}
                    <span className="capitalize">{receiptOrder.status}</span>
                  </p>
                </div>
              </div>

              {/* Dealer / Supplier Info */}
              {(receiptOrder.dealerName || receiptOrder.dealerPhone) && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dealer / Supplier</p>
                  {receiptOrder.dealerName && (
                    <p className="text-sm font-medium text-gray-900 mt-1">{receiptOrder.dealerName}</p>
                  )}
                  {receiptOrder.dealerPhone && (
                    <p className="text-xs text-gray-500">{receiptOrder.dealerPhone}</p>
                  )}
                  {receiptOrder.dealerAddress && (
                    <p className="text-xs text-gray-500">{receiptOrder.dealerAddress}</p>
                  )}
                </div>
              )}

              {/* Customers */}
              {receiptOrder.customers && receiptOrder.customers.length > 0 && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Customers</p>
                  {receiptOrder.customers.map((c, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium text-gray-900">{c.customerName}</span>
                      {(c.customerPhone || c.customerId) && (
                        <span className="text-gray-500 ml-2">
                          {c.customerPhone}{c.customerId ? ` • ID: ${c.customerId}` : ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Items Table */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Items</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-1.5 font-medium text-gray-400">#</th>
                      <th className="text-left py-1.5 font-medium text-gray-400">Product</th>
                      <th className="text-center py-1.5 font-medium text-gray-400">Qty</th>
                      <th className="text-right py-1.5 font-medium text-gray-400">Price</th>
                      <th className="text-right py-1.5 font-medium text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptOrder.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1.5 text-gray-400">{i + 1}</td>
                        <td className="py-1.5 font-medium text-gray-900">
                          {item.productName}
                          {item.batchNumber && (
                            <span className="text-gray-400 ml-1">({item.batchNumber})</span>
                          )}
                        </td>
                        <td className="py-1.5 text-center text-gray-700">{item.quantity}</td>
                        <td className="py-1.5 text-right text-gray-700">₹{Number(item.sellingPrice).toFixed(2)}</td>
                        <td className="py-1.5 text-right font-semibold text-gray-900">₹{Number(item.totalPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t-2 border-dashed border-gray-200 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-700">₹{Number(receiptOrder.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">GST</span>
                  <span className="text-gray-700">₹{Number(receiptOrder.totalGst || 0).toFixed(2)}</span>
                </div>
                {Number(receiptOrder.discount) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-red-500">-₹{Number(receiptOrder.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1.5">
                  <span className="text-gray-900">Grand Total</span>
                  <span className="text-emerald-600">₹{Number(receiptOrder.grandTotal).toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Methods */}
              {receiptOrder.payments && receiptOrder.payments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Payments</p>
                  {receiptOrder.payments.map((p, i) => (
                    <div key={i} className="flex justify-between text-xs mb-1 last:mb-0">
                      <span className="font-medium text-gray-700 capitalize">
                        {p.method === 'company' ? 'Company Billing' : p.method === 'cod' ? 'COD' : p.method === 'upi' ? 'UPI' : p.method}
                        {p.transactionId && <span className="text-gray-400 ml-1">({p.transactionId})</span>}
                      </span>
                      <span className="text-gray-900 font-medium">₹{Number(p.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="mt-5 pt-4 border-t-2 border-dashed border-gray-200 text-center">
                <p className="text-xs text-gray-400">Thank you for your business!</p>
                <p className="text-[10px] text-gray-300 mt-1">This is a computer-generated receipt.</p>
              </div>
            </div>

            {/* Action Buttons - hidden when printing */}
            <div className="px-6 pb-6 pt-2 flex gap-3 print:hidden">
              <button
                onClick={() => {
                  setReceiptOrder(null);
                  navigate('/admin/pre-orders');
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <FiPrinter className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default POSBilling;

