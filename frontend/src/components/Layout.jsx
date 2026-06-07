import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../store/slices/authSlice';
import { alertApi } from '../api/alerts';
import ThemeToggle from './ThemeToggle';
import { FiMenu, FiX, FiBell, FiPackage, FiShoppingCart, FiGrid, FiFileText, FiUsers, FiDollarSign, FiBarChart2, FiSettings, FiLogOut, FiHome, FiMessageSquare, FiBookOpen, FiInfo, FiMail, FiClock, FiShoppingBag, FiTrendingUp } from 'react-icons/fi';

const ALERT_NAV_PATHS = {
  low_stock: '/admin/products',
  expiry: '/admin/products',
  new_order: '/admin/orders',
  missing_customer_id: '/admin/customers',
  new_feedback: '/admin/feedback',
  payment_pending: '/admin/orders',
  preorder_created: '/admin/pre-orders',
  system: '/admin/alerts',
};

const Layout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alerts, setAlerts] = useState({ unreadCount: 0, items: [] });
  const [showAlerts, setShowAlerts] = useState(false);
  const alertRef = useRef(null);
  const [cartCount, setCartCount] = useState(0);

  const closeAlerts = useCallback(() => {
    setShowAlerts(false);
  }, []);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isManager = user?.role === 'manager';

  useEffect(() => {
    if (isAuthenticated && (isAdmin || isManager)) {
      fetchAlerts();
      const interval = setInterval(fetchAlerts, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isAdmin, isManager]);

  // Auto-close after 5 seconds
  useEffect(() => {
    if (!showAlerts) return;
    const timer = setTimeout(closeAlerts, 5000);
    return () => clearTimeout(timer);
  }, [showAlerts, closeAlerts]);

  // Close on click outside
  useEffect(() => {
    if (!showAlerts) return;
    const handleClickOutside = (e) => {
      if (alertRef.current && !alertRef.current.contains(e.target)) {
        closeAlerts();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAlerts, closeAlerts]);

  const fetchAlerts = async () => {
    try {
      const data = await alertApi.getAll({ limit: 5 });
      setAlerts({ unreadCount: data.unreadCount, items: data.alerts });
    } catch {}
  };

  const updateCartCount = () => {
    try {
      const cart = JSON.parse(localStorage.getItem('prandhara_cart') || '[]');
      const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    updateCartCount();
    const handleCartUpdate = () => updateCartCount();
    const handleStorage = (e) => {
      if (e.key === 'prandhara_cart') updateCartCount();
    };
    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navLinks = [
    { to: '/', label: 'Home', icon: FiHome, public: true },
    { to: '/shop', label: 'Shop', icon: FiShoppingCart, public: true },
    { to: '/blogs', label: 'Blogs', icon: FiBookOpen, public: true },
    { to: '/contact', label: 'Contact', icon: FiMail, public: true },
    { to: '/about', label: 'About', icon: FiInfo, public: true },
  ];

  const adminLinks = isManager
    ? [
        { to: '/admin/pos', label: 'POS Billing', icon: FiDollarSign },
        { to: '/admin/pre-orders', label: 'Pre-Orders', icon: FiClock },
      ]
    : [
        { to: '/admin', label: 'Dashboard', icon: FiBarChart2 },
        { to: '/admin/earnings', label: 'Earnings', icon: FiDollarSign },
        { to: '/admin/pos', label: 'POS Billing', icon: FiDollarSign },
        { to: '/admin/pre-orders', label: 'Pre-Orders', icon: FiClock },
        { to: '/admin/products', label: 'Products', icon: FiPackage },
        { to: '/admin/orders', label: 'Orders', icon: FiFileText },
        { to: '/admin/fund-requests', label: 'Fund Requests', icon: FiTrendingUp },
        { to: '/admin/dealers', label: 'Dealers', icon: FiUsers },
        { to: '/admin/customers', label: 'Customers', icon: FiUsers },
        { to: '/admin/categories', label: 'Categories', icon: FiGrid },
        { to: '/admin/blogs', label: 'Blogs', icon: FiBookOpen },
        { to: '/admin/feedback', label: 'Feedback', icon: FiMessageSquare },
        { to: '/admin/alerts', label: 'Alerts', icon: FiBell },
        { to: '/admin/managers', label: 'Managers', icon: FiUsers },
      ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Prandhara
              </span>
              <span className="hidden sm:inline text-xs text-gray-400 font-medium">Riyansh Store</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? 'text-emerald-600'
                      : 'text-gray-600 hover:text-emerald-600'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Cart Icon - always visible */}
              <Link
                to="/cart"
                className="relative p-2 text-gray-500 hover:text-emerald-600 transition-colors"
              >
                <FiShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              {isAuthenticated && isAdmin && (
                <div ref={alertRef} className="relative">
                  {/* Alerts */}
                  <button
                    onClick={() => setShowAlerts(!showAlerts)}
                    className="relative p-2 text-gray-500 hover:text-emerald-600 transition-colors"
                  >
                    <FiBell className="w-5 h-5" />
                    {alerts.unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {alerts.unreadCount > 9 ? '9+' : alerts.unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Alert dropdown */}
                  {showAlerts && (
                    <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                      <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-semibold text-sm">Notifications</h3>
                        <button
                          onClick={async () => {
                            await alertApi.markAllRead();
                            setAlerts({ ...alerts, unreadCount: 0 });
                          }}
                          className="text-xs text-emerald-600 hover:text-emerald-700"
                        >
                          Mark all read
                        </button>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {alerts.items.length === 0 ? (
                          <p className="p-4 text-center text-sm text-gray-400">No alerts</p>
                        ) : (
                          alerts.items.map((alert) => (
                            <div
                              key={alert._id}
                              className={`p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${
                                !alert.isRead ? 'bg-emerald-50/50' : ''
                              }`}
                              onClick={() => {
                                alertApi.markRead(alert._id).catch(() => {});
                                setAlerts((prev) => ({
                                  ...prev,
                                  items: prev.items.map((a) =>
                                    a._id === alert._id ? { ...a, isRead: true } : a
                                  ),
                                  unreadCount: Math.max(0, prev.unreadCount - (alert.isRead ? 0 : 1)),
                                }));
                                const path = ALERT_NAV_PATHS[alert.type];
                                if (path) {
                                  setShowAlerts(false);
                                  navigate(path);
                                }
                              }}
                            >
                              <div className="flex gap-2">
                                <span className="text-xs mt-0.5">
                                  {alert.type === 'low_stock' ? '⚠️' : alert.type === 'new_order' ? '📦' : alert.type === 'expiry' ? '⏰' : alert.type === 'preorder_created' ? '⏳' : '📌'}
                                </span>
                                <div>
                                  <p className="text-xs text-gray-700">{alert.message}</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">
                                    {new Date(alert.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <Link
                        to="/admin/alerts"
                        className="block p-3 text-center text-xs font-medium text-emerald-600 hover:bg-gray-50 border-t border-gray-100"
                        onClick={closeAlerts}
                      >
                        View all alerts
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {isAuthenticated && (
                <>
                  {user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager' ? (
                    <Link
                      to="/admin/pos"
                      className={`text-sm font-medium transition-colors ${
                        isActive('/admin/pos') ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'
                      }`}
                    >
                      POS Billing
                    </Link>
                  ) : (
                    <Link
                      to="/my-orders"
                      className={`text-sm font-medium transition-colors ${
                        isActive('/my-orders') ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'
                      }`}
                    >
                      My Orders
                    </Link>
                  )}
                  {(user?.role === 'admin' || user?.role === 'superadmin') && (
                    <Link
                      to="/admin"
                      className={`text-sm font-medium transition-colors ${
                        isActive('/admin') ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'
                      }`}
                    >
                      Admin
                    </Link>
                  )}

                  <div className="flex items-center gap-3">
                    <Link
                      to="/profile"
                      className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors"
                    >
                      {user?.name}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <FiLogOut className="w-3.5 h-3.5" /> Logout
                    </button>
                  </div>
                </>
              )}

              {!isAuthenticated && (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}

              <ThemeToggle />
            </div>

            {/* Mobile: Theme toggle + menu button */}
            <div className="flex items-center gap-1 md:hidden">
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-500 hover:text-emerald-600"
              >
                {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
              {/* Cart in mobile menu */}
              <Link
                to="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                <div className="relative">
                  <FiShoppingCart className="w-4 h-4" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-[8px] font-bold text-white">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </div>
                Cart ({cartCount})
              </Link>
              {isAuthenticated && (
                <>
                  {user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager' ? (
                    <Link
                      to="/admin/pos"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                    >
                      <FiDollarSign className="w-4 h-4" />
                      POS Billing
                    </Link>
                  ) : (
                    <Link
                      to="/my-orders"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                    >
                      <FiShoppingBag className="w-4 h-4" />
                      My Orders
                    </Link>
                  )}
                  {(user?.role === 'admin' || user?.role === 'superadmin') && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                    >
                      <FiSettings className="w-4 h-4" />
                      Admin Panel
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                  >
                    <FiUsers className="w-4 h-4" />
                    Profile
                  </Link>
                  <hr className="my-2" />
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <FiLogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              )}
              {!isAuthenticated && (
                <div className="flex gap-2 pt-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Admin Sidebar for admin pages */}
      {isAuthenticated && (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') && location.pathname.startsWith('/admin') && (
        <div className="flex">
          <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] p-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Management</p>
              {adminLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
            </div>
          </aside>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      )}

      {/* Regular layout (non-admin pages) */}
      {(!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'superadmin' && user?.role !== 'manager') || !location.pathname.startsWith('/admin')) && (
        <main className="flex-1">
          <Outlet />
        </main>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Prandhara</h3>
              <p className="text-sm text-gray-400">
                Your trusted store for quality healthcare products and medicines.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/shop" className="hover:text-emerald-400 transition-colors">Shop</Link></li>
                <li><Link to="/blogs" className="hover:text-emerald-400 transition-colors">Blogs</Link></li>
                <li><Link to="/about" className="hover:text-emerald-400 transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-emerald-400 transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>📞 +91 9028 406729</li>
                <li>📧 prandhar11@gmail.com</li>
                <li>📍 Grand Centrel Pune-Nashik Highway Chakan.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Follow Us</h4>
              <div className="flex gap-3">
                <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-emerald-600 transition-colors">
                  <span className="sr-only">Facebook</span>📘
                </a>
                <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-emerald-600 transition-colors">
                  <span className="sr-only">Instagram</span>📷
                </a>
                <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-emerald-600 transition-colors">
                  <span className="sr-only">YouTube</span>▶️
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Prandhara Riyansh Store. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
