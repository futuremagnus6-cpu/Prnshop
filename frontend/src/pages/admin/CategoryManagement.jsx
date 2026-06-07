import React, { useState, useEffect } from 'react';
import { categoriesApi } from '../../api/categories';
import { clearRequestCache } from '../../api/client';
import toast from 'react-hot-toast';
import { FiGrid, FiPlus, FiEdit2, FiTrash2, FiPackage, FiSearch, FiX, FiSave, FiRefreshCw } from 'react-icons/fi';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', icon: '📦' });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async (forceRefresh) => {
    try {
      if (forceRefresh) clearRequestCache('/categories');
      const data = await categoriesApi.getAll({ limit: 100 });
      setCategories(data.categories || data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', icon: '📦' });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (cat) => {
    setForm({ name: cat.name, description: cat.description || '', icon: cat.icon || '📦' });
    setEditing(cat);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      if (editing) {
        await categoriesApi.update(editing._id, form);
        toast.success('Category updated');
      } else {
        await categoriesApi.create(form);
        toast.success('Category created');
      }
      resetForm();
      clearRequestCache('/categories');
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await categoriesApi.delete(id);
      setCategories((prev) => prev.filter((c) => c._id !== id));
      clearRequestCache('/categories');
      toast.success('Category deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const icons = ['💊', '💉', '🩹', '🧴', '🫙', '🧪', '🩺', '🏥', '🍃', '💧', '🧬', '🦷', '👁️', '❤️', '🧠', '🦴', '🔬', '📦'];

  const filtered = categories.filter((c) => !search || c.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => loadCategories(true)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-48"
            />
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-all"
          >
            <FiPlus className="w-4 h-4" /> Add Category
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category List */}
          <div className={`${showForm ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {filtered.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
                <FiGrid className="mx-auto w-16 h-16 text-gray-300" />
                <p className="mt-4 text-gray-500">No categories found</p>
                <button
                  onClick={() => { resetForm(); setShowForm(true); }}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <FiPlus className="w-4 h-4" /> Create First Category
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map((cat) => (
                  <div key={cat._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 group hover:shadow-md transition-all">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-2xl">
                      {cat.icon || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{cat.name}</p>
                      {cat.description && <p className="text-xs text-gray-500 truncate">{cat.description}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{cat.productCount || 0} products</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(cat)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(cat._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-fit sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">{editing ? 'Edit Category' : 'New Category'}</h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="e.g. Pain Relief"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Brief description of this category"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Icon</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {icons.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, icon: ic }))}
                        className={`h-9 w-9 flex items-center justify-center rounded-lg border-2 text-lg transition-all ${
                          form.icon === ic ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-all"
                >
                  <FiSave className="w-4 h-4" />
                  {editing ? 'Update Category' : 'Create Category'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
