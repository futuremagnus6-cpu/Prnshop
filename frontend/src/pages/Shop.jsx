import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { productApi } from '../api/products';
import { categoryApi } from '../api/categories';
import { FiSearch, FiShoppingCart, FiPackage, FiChevronLeft, FiChevronRight, FiFilter, FiX, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { addToLocalCart, syncCartToBackend } from '../utils/cartSync';

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || '';
  const inStock = searchParams.get('inStock') || '';
  const page = parseInt(searchParams.get('page')) || 1;

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [search, category, sort, inStock, page]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12, sort };
      if (search) params.search = search;
      if (category) params.category = category;
      if (inStock) params.inStock = inStock;
      const data = await productApi.getAll(params);
      setProducts(data.products);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoryApi.getAll();
      setCategories(data.categories);
    } catch {}
  };

  const updateParams = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  const { isAuthenticated } = useSelector((state) => state.auth);

  const addToCart = (product) => {
    if (product.stockQuantity <= 0) {
      toast.error('Out of stock');
      return;
    }
    addToLocalCart(product);
    if (isAuthenticated) {
      syncCartToBackend();
    }
    toast.success('Added to cart');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Our Products</h1>
          {pagination && <p className="text-gray-500 text-sm mt-1">{pagination.total} products found</p>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FiFilter className="w-4 h-4" /> Filters
          </button>
          <select
            value={sort}
            onChange={(e) => updateParams('sort', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Default Sort</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name">Name: A-Z</option>
            <option value="bestseller">Best Selling</option>
            <option value="in_stock">In Stock First</option>
          </select>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-full lg:w-64 shrink-0`}>
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              <button onClick={() => setShowFilters(false)} className="lg:hidden text-gray-400">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => updateParams('search', e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* In Stock Filter */}
            <div className="mb-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStock === 'true'}
                  onChange={(e) => updateParams('inStock', e.target.checked ? 'true' : '')}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-gray-700">In Stock Only</span>
              </label>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <button
                  onClick={() => updateParams('category', '')}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !category ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => updateParams('category', cat._id)}
                    className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      category === cat._id
                        ? 'bg-emerald-50 text-emerald-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cat.name} ({cat.productCount})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
                  <div className="h-9 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No products found</h3>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <div key={product._id} className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                    <div className="relative aspect-square bg-gray-50">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiPackage className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      {product.stockQuantity <= 0 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">Out of Stock</span>
                        </div>
                      )}
                      {product.sellingPrice < product.mrp && (
                        <span className="absolute top-2 right-2 bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[10px] font-medium">
                          {Math.round((1 - product.sellingPrice / product.mrp) * 100)}% OFF
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-400 mb-1">{product.category?.name}</p>
                      <h3 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">{product.name}</h3>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg font-bold text-emerald-600">₹{product.sellingPrice}</span>
                        {product.mrp > product.sellingPrice && (
                          <span className="text-sm text-gray-400 line-through">₹{product.mrp}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => addToCart(product)}
                          disabled={product.stockQuantity <= 0}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-white py-2 text-xs font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          <FiShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    disabled={page <= 1}
                    onClick={() => updateParams('page', String(page - 1))}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === pagination.pages || Math.abs(p - page) <= 2)
                    .map((p, i, arr) => (
                      <React.Fragment key={p}>
                        {i > 0 && arr[i - 1] !== p - 1 && <span className="text-gray-400">...</span>}
                        <button
                          onClick={() => updateParams('page', String(p))}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                            page === p
                              ? 'bg-emerald-600 text-white'
                              : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))}
                  <button
                    disabled={page >= pagination.pages}
                    onClick={() => updateParams('page', String(page + 1))}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Shop;
