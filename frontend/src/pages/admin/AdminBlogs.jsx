import React, { useState, useEffect, useRef } from 'react';
import { blogApi } from '../../api/blogs';
import { clearRequestCache } from '../../api/client';
import { categoryApi } from '../../api/categories';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiSettings,
  FiImage,
  FiVideo,
  FiLink,
  FiUploadCloud,
  FiX,
  FiFileText,
  FiPlay,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiCalendar,
  FiType,
  FiList,
  FiRefreshCw,
} from 'react-icons/fi';

const AdminBlogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});

  // Form state
  const [form, setForm] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'general',
    type: 'blog',
    videoUrl: '',
    tags: '',
    isPublished: true,
    image: '',
    imageSource: 'link', // 'link' or 'upload'
    videoSource: 'link', // 'link' or 'upload'
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [uploading, setUploading] = useState(false);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    loadBlogs();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await categoryApi.getAll();
      setCategories(data.categories || []);
    } catch {
      // silent
    }
  };

  const loadBlogs = async (forceRefresh) => {
    setLoading(true);
    try {
      if (forceRefresh) clearRequestCache('/blogs');
      const data = await blogApi.getAdmin({ limit: 50 });
      setBlogs(data.blogs);
    } catch {
      toast.error('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      content: '',
      excerpt: '',
      category: 'general',
      type: 'blog',
      videoUrl: '',
      tags: '',
      isPublished: true,
      image: '',
      imageSource: 'link',
      videoSource: 'link',
    });
    setImageFile(null);
    setImagePreview('');
    setVideoFile(null);
    setVideoPreview('');
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      title: b.title,
      content: b.content,
      excerpt: b.excerpt || '',
      category: b.category || 'general',
      type: b.type,
      videoUrl: b.videoUrl || '',
      tags: b.tags?.join(', ') || '',
      isPublished: b.isPublished,
      image: b.image || '',
      imageSource: b.image?.startsWith('/uploads/') ? 'upload' : 'link',
      videoSource: b.videoUrl?.startsWith('/uploads/') ? 'upload' : 'link',
    });
    if (b.image) setImagePreview(b.image);
    if (b.videoUrl) setVideoPreview(b.videoUrl);
    setShowModal(true);
  };

  const handleImageUpload = async (file) => {
    setUploading(true);
    try {
      const result = await blogApi.uploadMedia(file);
      setForm({ ...form, image: result.url, imageSource: 'upload' });
      setImagePreview(result.url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (file) => {
    setUploading(true);
    try {
      const result = await blogApi.uploadMedia(file);
      setForm({ ...form, videoUrl: result.url, videoSource: 'upload', type: 'video' });
      setVideoPreview(result.url);
      toast.success('Video uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    handleImageUpload(file);
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    handleVideoUpload(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      const payload = {
        title: form.title,
        content: form.content,
        excerpt: form.excerpt,
        category: form.category,
        type: form.type,
        isPublished: form.isPublished,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      // Always send image as string URL
      if (form.image) payload.image = form.image;
      if (form.videoUrl) payload.videoUrl = form.videoUrl;

      if (editing) {
        await blogApi.update(editing._id, payload);
        toast.success('Blog updated successfully');
      } else {
        await blogApi.create(payload);
        toast.success('Blog created successfully');
      }
      setShowModal(false);
      resetForm();
      loadBlogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save blog');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this blog? This action cannot be undone.')) return;
    try {
      await blogApi.delete(id);
      toast.success('Blog deleted');
      loadBlogs();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredBlogs = blogs.filter(
    (b) =>
      b.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const uniqueCategories = [...new Set(blogs.map((b) => b.category).filter(Boolean))];

  return (
    <div className="p-4 lg:p-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Blog & Video Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create and manage your blog posts, articles, and video content
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadBlogs(true)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link
            to="/admin/content"
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/30 rounded-xl text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all"
          >
            <FiSettings className="w-4 h-4" /> Site Content
          </Link>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            <FiPlus className="w-4 h-4" /> Add Blog
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{blogs.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Posts</p>
        </div>
        <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{blogs.filter((b) => b.type === 'blog').length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Articles</p>
        </div>
        <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{blogs.filter((b) => b.type === 'video').length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Videos</p>
        </div>
        <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{blogs.filter((b) => b.isPublished).length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Published</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-4">
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search blogs by title or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400/30 transition-all"
          />
        </div>
      </div>

      {/* Blog Cards / List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700/50 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiFileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No blogs match your search' : 'No blogs yet. Create your first one!'}
            </p>
          </div>
        ) : (
          filteredBlogs.map((b) => (
            <div
              key={b._id}
              className="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600/50 transition-all"
            >
              <div className="flex items-center gap-4 p-4">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800 shrink-0 relative">
                  {b.image ? (
                    <img src={b.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {b.type === 'video' ? (
                        <FiVideo className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                      ) : (
                        <FiFileText className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                      )}
                    </div>
                  )}
                  {b.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <FiPlay className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      b.type === 'video'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}>
                      {b.type}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      b.isPublished
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {b.isPublished ? 'Published' : 'Draft'}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {b.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{b.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mt-1">
                    <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3" /> {new Date(b.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><FiEye className="w-3 h-3" /> {b.views || 0} views</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => window.open(`/blogs/${b._id}`, '_blank')}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all"
                    title="Preview"
                  >
                    <FiEye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEdit(b)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                    title="Edit"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(b._id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    title="Delete"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleRow(b._id)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all"
                  >
                    {expandedRows[b._id] ? (
                      <FiChevronUp className="w-4 h-4" />
                    ) : (
                      <FiChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Content Preview */}
              {expandedRows[b._id] && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-50 dark:border-gray-700/30 mt-0">
                  {b.excerpt && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 line-clamp-2">{b.excerpt}</p>
                  )}
                  {b.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {b.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-50 dark:bg-gray-800 rounded-full text-[10px] text-gray-500 dark:text-gray-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {b.content && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {b.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl mx-4 my-auto shadow-2xl animate-slide-down">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {editing ? 'Edit Blog / Video' : 'Create New Blog / Video'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {editing ? 'Update your content' : 'Share your knowledge with the world'}
                </p>
              </div>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Title & Category Row */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <FiType className="w-3.5 h-3.5 inline mr-1" /> Title *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Enter blog title..."
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400/30 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400/30 transition-all"
                    >
                      <option value="general">General</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                      {uniqueCategories.filter((c) => !categories.find((cat) => cat.name === c)).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Type & Published Row */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Content Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'blog' })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        form.type === 'blog'
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-700'
                          : 'bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                      }`}
                    >
                      <FiFileText className="w-4 h-4" /> Article
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'video' })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        form.type === 'video'
                          ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-700'
                          : 'bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                      }`}
                    >
                      <FiVideo className="w-4 h-4" /> Video
                    </button>
                  </div>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 w-full cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-700 transition-all">
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Published</span>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Visible to visitors</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Image Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <FiImage className="w-3.5 h-3.5 inline mr-1" /> Featured Image
                </label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, imageSource: 'link' })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      form.imageSource === 'link'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <FiLink className="w-3.5 h-3.5" /> From Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, imageSource: 'upload' })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      form.imageSource === 'upload'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <FiUploadCloud className="w-3.5 h-3.5" /> From Device
                  </button>
                </div>

                {form.imageSource === 'link' ? (
                  <div className="relative">
                    <FiLink className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="url"
                      value={form.image}
                      onChange={(e) => {
                        setForm({ ...form, image: e.target.value });
                        setImagePreview(e.target.value);
                      }}
                      placeholder="https://example.com/image.jpg"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400/30 transition-all"
                    />
                  </div>
                ) : (
                  <div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-gray-50 dark:bg-gray-900/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all disabled:opacity-50"
                    >
                      <FiUploadCloud className="w-5 h-5" />
                      {uploading ? 'Uploading...' : 'Click to upload an image'}
                    </button>
                  </div>
                )}

                {/* Image Preview */}
                {imagePreview && (
                  <div className="relative mt-3 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImagePreview(''); setForm({ ...form, image: '' }); setImageFile(null); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Video Section (shown when type is video) */}
              {form.type === 'video' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <FiVideo className="w-3.5 h-3.5 inline mr-1" /> Video URL / File
                  </label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, videoSource: 'link' })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        form.videoSource === 'link'
                          ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <FiLink className="w-3.5 h-3.5" /> From Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, videoSource: 'upload' })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        form.videoSource === 'upload'
                          ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <FiUploadCloud className="w-3.5 h-3.5" /> From Device
                    </button>
                  </div>

                  {form.videoSource === 'link' ? (
                    <div className="relative">
                      <FiLink className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        value={form.videoUrl}
                        onChange={(e) => {
                          setForm({ ...form, videoUrl: e.target.value });
                          setVideoPreview(e.target.value);
                        }}
                        placeholder="YouTube URL or direct video link"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400/30 transition-all"
                      />
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-gray-50 dark:bg-gray-900/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-purple-300 dark:hover:border-purple-700 hover:text-purple-600 dark:hover:text-purple-400 transition-all disabled:opacity-50"
                      >
                        <FiUploadCloud className="w-5 h-5" />
                        {uploading ? 'Uploading...' : 'Click to upload a video (MP4, WebM, MOV)'}
                      </button>
                    </div>
                  )}

                  {/* Video Preview */}
                  {videoPreview && (
                    <div className="relative mt-3 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                      {videoPreview.includes('youtube') || videoPreview.includes('youtu.be') ? (
                        <div className="aspect-video">
                          <iframe
                            src={videoPreview.replace('watch?v=', 'embed/')}
                            className="w-full h-full"
                            allowFullScreen
                            title="Video preview"
                          />
                        </div>
                      ) : (
                        <video src={videoPreview} controls className="w-full h-48 object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => { setVideoPreview(''); setForm({ ...form, videoUrl: '' }); setVideoFile(null); }}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Excerpt / Summary</label>
                <textarea
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  placeholder="A short summary of your blog post..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400/30 transition-all resize-none"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Content (HTML supported)</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Write your blog content here. HTML tags are supported for formatting."
                  rows={8}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400/30 transition-all font-mono resize-y"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <FiList className="w-3.5 h-3.5 inline mr-1" /> Tags
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="health, wellness, tips (comma separated)"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400/30 transition-all"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Separate tags with commas</p>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !form.title.trim()}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : editing ? 'Update Blog' : 'Create Blog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBlogs;
