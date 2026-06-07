import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiTrash2, FiPlus, FiMinus, FiShoppingBag, FiArrowLeft } from 'react-icons/fi';
import {
  getLocalCart,
  saveLocalCart,
  syncCartToBackend,
  getCartCount,
} from '../utils/cartSync';

const Cart = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    setCart(getLocalCart());
  }, []);

  const updateAndSync = (newCart) => {
    setCart(newCart);
    saveLocalCart(newCart);
    if (isAuthenticated) {
      syncCartToBackend();
    }
  };

  const updateQty = (productId, delta) => {
    const newCart = cart.map((item) => {
      if (item._id === productId) {
        const newQty = Math.max(1, (item.quantity || 1) + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    updateAndSync(newCart);
  };

  const removeItem = (productId) => {
    const newCart = cart.filter((item) => item._id !== productId);
    updateAndSync(newCart);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.sellingPrice || item.mrp || 0) * (item.quantity || 1), 0);
  const gst = subtotal * 0.12;
  const total = subtotal + gst;

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <FiShoppingBag className="w-20 h-20 text-gray-300" />
        <h2 className="mt-6 text-2xl font-bold text-gray-900">Your Cart is Empty</h2>
        <p className="mt-2 text-gray-500">Add healthcare products to get started.</p>
        <Link
          to="/shop"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-all"
        >
          <FiArrowLeft className="w-4 h-4" />
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Shopping Cart ({getCartCount()} items)
            {isAuthenticated && <span className="text-xs font-normal text-emerald-600 ml-2">● Synced</span>}
          </h1>
          <Link to="/shop" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            <FiArrowLeft className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div key={item._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-4">
                <div className="w-20 h-20 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-2xl overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    '💊'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/shop?product=${item._id}`}
                    className="text-sm font-semibold text-gray-900 hover:text-emerald-600 line-clamp-1"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">{item.category?.name || 'Medicine'}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm font-bold text-gray-900">₹{(item.sellingPrice || item.mrp || 0).toLocaleString()}</span>
                    {item.mrp && item.sellingPrice < item.mrp && (
                      <span className="text-xs text-gray-400 line-through">₹{item.mrp.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-gray-200 rounded-lg">
                      <button onClick={() => updateQty(item._id, -1)} className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-gray-50 rounded-l-lg transition-colors">
                        <FiMinus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-4 text-sm font-medium text-gray-900 min-w-[2rem] text-center">{item.quantity || 1}</span>
                      <button onClick={() => updateQty(item._id, 1)} className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-gray-50 rounded-r-lg transition-colors">
                        <FiPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button onClick={() => removeItem(item._id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-fit sticky top-24">
            <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST (12%)</span>
                <span>₹{gst.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-emerald-600 font-medium">{total > 500 ? 'FREE' : '₹50'}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between text-base font-bold text-gray-900">
                <span>Total</span>
                <span>₹{total.toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  navigate('/login', { state: { from: { pathname: '/checkout' } } });
                } else {
                  navigate('/checkout');
                }
              }}
              className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-all"
            >
              Proceed to Checkout
            </button>
            <Link
              to="/shop"
              className="mt-3 block text-center text-sm text-gray-500 hover:text-emerald-600 transition-colors"
            >
              Add more items
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
