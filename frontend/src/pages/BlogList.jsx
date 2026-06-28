import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blogApi } from '../api/blogs';
import { categoryApi } from '../api/categories';
import {
  FiCalendar,
  FiEye,
  FiBookOpen,
  FiPlay,
  FiSearch,
  FiChevronRight,
  FiClock,
  FiUser,
  FiTag,
  FiArrowRight,
} from 'react-icons/fi';

const BlogList = () => {
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [visibleBlogs, setVisibleBlogs] = useState([]);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    loadCategories();
    loadBlogs();
  }, []);

  useEffect(() => {
    loadBlogs();
  }, [category, filterType, search]);

  useEffect(() => {
    if (!loading) {
      setAnimating(true);
      const timer = setTimeout(() => {
        setVisibleBlogs(blogs);
        setAnimating(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [blogs, loading]);

  const loadCategories = async () => {
    try {
      const data = await categoryApi.getAll();
      setCategories(data.categories || []);
    } catch {
      // fallback: extract from blogs
    }
  };

  const loadBlogs = async () => {
    setLoading(true);
    try {
      const params = { limit: 20 };
      if (category) params.category = category;
      if (filterType !== 'all') params.type = filterType;
      if (search) params.search = search;
      const data = await blogApi.getAll(params);
      setBlogs(data.blogs);
      setVisibleBlogs([]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const featuredBlog = blogs.length > 0 ? blogs[0] : null;
  const remainingBlogs = blogs.slice(1);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-400/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-emerald-200 text-sm mb-6 border border-emerald-400/20">
              <FiBookOpen className="w-4 h-4" />
              <span>Explore our knowledge hub</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              Our Blog &{' '}
              <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
                Videos
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-emerald-100/80 max-w-2xl mx-auto">
              Health tips, wellness insights, and the latest updates from Prandhara
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mt-8 max-w-lg mx-auto">
              <div className="relative group">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-300 group-focus-within:text-emerald-200 transition-colors" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search blogs & articles..."
                  className="w-full pl-12 pr-4 py-3.5 bg-white/10 backdrop-blur-md border border-emerald-400/20 rounded-xl text-white placeholder-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400/40 transition-all"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(''); setSearch(''); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-300 hover:text-emerald-200"
                  >
                    ✕
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filters */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <button
                onClick={() => setCategory('')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  !category
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 scale-105'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setCategory(category === c.name ? '' : c.name)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    category === c.name
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 scale-105'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterType === 'all'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                All Types
              </button>
              <button
                onClick={() => setFilterType('blog')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterType === 'blog'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Articles
              </button>
              <button
                onClick={() => setFilterType('video')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterType === 'video'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Videos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Blog Grid Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 overflow-hidden animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="aspect-video bg-gray-100 dark:bg-gray-700" />
                <div className="p-5 space-y-3">
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-gray-100 dark:bg-gray-700 rounded-full" />
                    <div className="h-5 w-20 bg-gray-100 dark:bg-gray-700 rounded-full" />
                  </div>
                  <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-full" />
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiBookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No blogs found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {search ? 'Try a different search term' : 'No blogs have been published yet'}
            </p>
            {(category || search || filterType !== 'all') && (
              <button
                onClick={() => { setCategory(''); setSearch(''); setSearchInput(''); setFilterType('all'); }}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Featured Blog */}
            {featuredBlog && !category && !search && filterType === 'all' && (
              <Link
                key={featuredBlog._id}
                to={`/blogs/${featuredBlog._id}`}
                className="group block mb-8 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl overflow-hidden border border-emerald-100 dark:border-emerald-800/30 hover:shadow-xl transition-all duration-500 animate-slide-up"
              >
                <div className="grid md:grid-cols-2 gap-0">
                  {featuredBlog.image && (
                    <div className="aspect-[4/3] md:aspect-auto overflow-hidden">
                      <img
                        src={featuredBlog.image}
                        alt={featuredBlog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  )}
                  <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        featuredBlog.type === 'video'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      }`}>
                        {featuredBlog.type === 'video' ? '🎬 Video' : '📝 Article'}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <FiTag className="w-3 h-3" /> {featuredBlog.category}
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {featuredBlog.title}
                    </h2>
                    {featuredBlog.excerpt && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">{featuredBlog.excerpt}</p>
                    )}
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-1"><FiCalendar className="w-3.5 h-3.5" /> {new Date(featuredBlog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="flex items-center gap-1"><FiEye className="w-3.5 h-3.5" /> {featuredBlog.views || 0} views</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 group-hover:gap-2 transition-all">
                        Read More <FiArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Blog Grid with Animation */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {remainingBlogs.map((blog, index) => (
                <Link
                  key={blog._id}
                  to={`/blogs/${blog._id}`}
                  className="group bg-white dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden hover:-translate-y-1"
                  style={{
                    animation: animating ? 'none' : `slideUp 0.5s ease-out ${index * 0.08}s forwards`,
                    opacity: animating ? 1 : 0,
                    transform: animating ? 'translateY(0)' : 'translateY(30px)',
                  }}
                >
                  {/* Media Section */}
                  <div className="relative aspect-video bg-gray-50 dark:bg-gray-800 overflow-hidden">
                    {blog.image ? (
                      <img
                        src={blog.image}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiBookOpen className="w-12 h-12 text-gray-200 dark:text-gray-700" />
                      </div>
                    )}
                    {/* Overlay badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm ${
                        blog.type === 'video'
                          ? 'bg-purple-500/80 text-white'
                          : 'bg-blue-500/80 text-white'
                      }`}>
                        {blog.type === 'video' ? '🎬 Video' : '📝 Article'}
                      </span>
                    </div>
                    {blog.type === 'video' && blog.image && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <FiPlay className="w-6 h-6 text-purple-600 ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        {blog.category}
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                      {blog.title}
                    </h3>

                    {blog.excerpt && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                        {blog.excerpt}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700/30">
                      <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <FiCalendar className="w-3 h-3" />
                          {new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiEye className="w-3 h-3" />
                          {blog.views || 0}
                        </span>
                      </div>
                      <span className="text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform duration-300">
                        <FiArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>


    </div>
  );
};

export default BlogList;
