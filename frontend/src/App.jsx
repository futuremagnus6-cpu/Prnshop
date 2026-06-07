import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchProfile } from './store/slices/authSlice';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { Agentation } from 'agentation';


// Lazy-loaded page components for code splitting
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Shop = lazy(() => import('./pages/Shop'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Contact = lazy(() => import('./pages/Contact'));
const About = lazy(() => import('./pages/About'));
const Profile = lazy(() => import('./pages/Profile'));
const BlogList = lazy(() => import('./pages/BlogList'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const MyOrders = lazy(() => import('./pages/MyOrders'));

// Lazy-loaded admin pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const POSBilling = lazy(() => import('./pages/admin/POSBilling'));
const ProductManagement = lazy(() => import('./pages/admin/ProductManagement'));
const OrderManagement = lazy(() => import('./pages/admin/OrderManagement'));
const DealerManagement = lazy(() => import('./pages/admin/DealerManagement'));
const CustomerManagement = lazy(() => import('./pages/admin/CustomerManagement'));
const AdminBlogs = lazy(() => import('./pages/admin/AdminBlogs'));
const CategoryManagement = lazy(() => import('./pages/admin/CategoryManagement'));
const FeedbackManagement = lazy(() => import('./pages/admin/FeedbackManagement'));
const AlertManagement = lazy(() => import('./pages/admin/AlertManagement'));
const PreOrderHistory = lazy(() => import('./pages/admin/PreOrderHistory'));
const Earnings = lazy(() => import('./pages/admin/Earnings'));
const MonitoringDashboard = lazy(() => import('./pages/admin/MonitoringDashboard'));
const FundRequests = lazy(() => import('./pages/admin/FundRequests'));
const ManagerManagement = lazy(() => import('./pages/admin/ManagerManagement'));

// Minimal loading fallback — just a subtle spinner
const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(fetchProfile());
    }
  }, [dispatch]);

  return (
    <Suspense fallback={<PageFallback />}>
       <Agentation />
      <Routes>
        <Route element={<Layout />}>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<About />} />
          <Route path="/blogs" element={<BlogList />} />
          <Route path="/blogs/:id" element={<BlogDetail />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />

            {/* Admin routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/pos" element={<POSBilling />} />
              <Route path="/admin/products" element={<ProductManagement />} />
              <Route path="/admin/orders" element={<OrderManagement />} />
              <Route path="/admin/dealers" element={<DealerManagement />} />
              <Route path="/admin/customers" element={<CustomerManagement />} />
              <Route path="/admin/blogs" element={<AdminBlogs />} />
              <Route path="/admin/categories" element={<CategoryManagement />} />
              <Route path="/admin/feedback" element={<FeedbackManagement />} />
              <Route path="/admin/alerts" element={<AlertManagement />} />
              <Route path="/admin/earnings" element={<Earnings />} />
              <Route path="/admin/monitoring" element={<MonitoringDashboard />} />
              <Route path="/admin/fund-requests" element={<FundRequests />} />
              <Route path="/admin/pre-orders" element={<PreOrderHistory />} />
              <Route path="/admin/managers" element={<ManagerManagement />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
    
  );
};

export default App;
