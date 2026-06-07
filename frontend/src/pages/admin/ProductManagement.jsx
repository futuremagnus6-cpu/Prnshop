import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../../api/products';
import { categoryApi } from '../../api/categories';
import toast from 'react-hot-toast';
import { clearRequestCache } from '../../api/client';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiPackage, FiChevronLeft, FiChevronRight, FiGrid, FiImage, FiLink, FiX, FiUpload, FiRefreshCw } from 'react-icons/fi';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', category: '', mrp: '', sellingPrice: '', stockQuantity: '',
    batchNumber: '', barcode: '', expiryDate: '', gst: '', lowStockThreshold: 10,
    description: '', manufacturer: '', prescriptionRequired: false, isFeatured: false,
    images: [],
    imageUrlInput: '',
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [page, search, filter]);

  const loadProducts = async (forceRefresh) => {
    setLoading(true);
    try {
      if (forceRefresh) clearRequestCache('/products');
      const params = { page, limit: 15 };
      if (search) params.search = search;
      
      let data;
      if (filter === 'low-stock') data = await productApi.getLowStock();
      else if (filter === 'expiring') data = await productApi.getExpiring();
      else data = await productApi.getAll(params);

      if (filter === 'low-stock' || filter === 'expiring') {
        setProducts(data.products);
        setPagination(null);
      } else {
        setProducts(data.products);
        setPagination(data.pagination);
      }
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

  const openCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '', category: categories[0]?._id || '', mrp: '', sellingPrice: '',
      stockQuantity: '', batchNumber: Date.now().toString(), barcode: '',
      expiryDate: '', gst: '0', lowStockThreshold: 10, description: '',
      manufacturer: '', prescriptionRequired: false, isFeatured: false,
      images: [],
      imageUrlInput: '',
    });
    setImageFiles([]);
    setImagePreviewUrls([]);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category?._id || product.category || '',
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      stockQuantity: product.stockQuantity,
      batchNumber: product.batchNumber,
      barcode: product.barcode || '',
      expiryDate: product.expiryDate ? product.expiryDate.split('T')[0] : '',
      gst: product.gst || 0,
      lowStockThreshold: product.lowStockThreshold || 10,
      description: product.description || '',
      manufacturer: product.manufacturer || '',
      prescriptionRequired: product.prescriptionRequired || false,
      isFeatured: product.isFeatured || false,
      images: product.images || [],
      imageUrlInput: '',
    });
    setImageFiles([]);
    setImagePreviewUrls([]);
    setShowModal(true);
  };

  const addImageUrl = () => {
    const url = formData.imageUrlInput?.trim();
    if (!url) return;
    setFormData((prev) => ({
      ...prev,
      images: [...(prev.images || []), url],
      imageUrlInput: '',
    }));
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
    }));
  };

  const handleImageFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...files]);
    setImagePreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const removeImageFile = (index) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formPayload = new FormData();
      formPayload.append('name', formData.name);
      formPayload.append('category', formData.category);
      formPayload.append('mrp', formData.mrp);
      formPayload.append('sellingPrice', formData.sellingPrice);
      formPayload.append('stockQuantity', formData.stockQuantity);
      formPayload.append('batchNumber', formData.batchNumber);
      formPayload.append('barcode', formData.barcode);
      formPayload.append('expiryDate', formData.expiryDate);
      formPayload.append('gst', formData.gst);
      formPayload.append('lowStockThreshold', formData.lowStockThreshold);
      formPayload.append('description', formData.description);
      formPayload.append('manufacturer', formData.manufacturer);
      formPayload.append('prescriptionRequired', formData.prescriptionRequired);
      formPayload.append('isFeatured', formData.isFeatured);

      // Append image URLs as JSON string
      if (formData.images?.length > 0) {
        formPayload.append('images', JSON.stringify(formData.images));
      }

      // Append uploaded files
      imageFiles.forEach((file) => formPayload.append('images', file));

      if (editingProduct) {
        await productApi.update(editingProduct._id, formPayload);
        toast.success('Product updated');
      } else {
        await productApi.create(formPayload);
        toast.success('Product created');
      }
      setShowModal(false);
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await productApi.delete(id);
      toast.success('Product deleted');
      loadProducts();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleStockUpdate = async (product) => {
    const qty = prompt('Enter new stock quantity:', product.stockQuantity);
    if (qty === null || qty === '') return;
    try {
      await productApi.updateStock(product._id, parseInt(qty), 'Manual update');
      toast.success('Stock updated');
      loadProducts();
    } catch {
      toast.error('Failed to update stock');
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
          <p className="text-gray-500 text-sm mt-1">{pagination?.total || products.length} products</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => loadProducts(true)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link
            to="/admin/categories"
            className="flex items-center gap-2 border border-gray-300 hover:border-emerald-500 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <FiGrid className="w-4 h-4" /> Categories
          </Link>
          <button onClick={openCreate} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <FiPlus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {['all', 'low-stock', 'expiring'].map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All' : f === 'low-stock' ? 'Low Stock' : 'Expiring'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Image</th>
                <th className="text-left px-4 py-3 font-medium">Product</th>
                <th className="text-center px-4 py-3 font-medium">Stock</th>
                <th className="text-right px-4 py-3 font-medium">MRP</th>
                <th className="text-right px-4 py-3 font-medium">SP</th>
                <th className="text-center px-4 py-3 font-medium">Expiry</th>
                <th className="text-center px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                    </td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <FiPackage className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No products found</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0].startsWith('http') ? product.images[0] : `/uploads/${product.images[0]}`}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <FiImage className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-400">{product.category?.name} | Batch: {product.batchNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                          product.stockQuantity <= product.lowStockThreshold
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                        onClick={() => handleStockUpdate(product)}
                      >
                        {product.stockQuantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">₹{product.mrp}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">₹{product.sellingPrice}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs ${new Date(product.expiryDate) < new Date() ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {new Date(product.expiryDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(product)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(product._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <FiChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">Page {page} of {pagination.pages}</span>
          <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)} className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Image Section */}
              <div className="border border-gray-200 rounded-xl p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <FiImage className="w-4 h-4 inline mr-1" /> Product Images
                </label>

                {/* Image URL Input */}
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="url"
                      value={formData.imageUrlInput || ''}
                      onChange={(e) => setFormData({ ...formData, imageUrlInput: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
                      placeholder="Add image by URL..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button type="button" onClick={addImageUrl} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                    Add URL
                  </button>
                </div>

                {/* File Upload */}
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-emerald-400 hover:text-emerald-600 transition-colors w-full justify-center"
                  >
                    <FiUpload className="w-4 h-4" /> Upload images from computer
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageFiles}
                    className="hidden"
                  />
                </div>

                {/* Image Previews */}
                <div className="flex flex-wrap gap-2">
                  {/* URL images */}
                  {(formData.images || []).map((img, i) => (
                    <div key={`url-${i}`} className="relative group">
                      <img
                        src={img}
                        alt={`Image ${i + 1}`}
                        className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/64?text=Error'; }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {/* Uploaded file previews */}
                  {imagePreviewUrls.map((url, i) => (
                    <div key={`file-${i}`} className="relative group">
                      <img
                        src={url}
                        alt={`Upload ${i + 1}`}
                        className="w-16 h-16 rounded-lg object-cover border border-emerald-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImageFile(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(formData.images || []).length === 0 && imagePreviewUrls.length === 0 && (
                    <p className="text-xs text-gray-400">No images added yet</p>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">Select category</option>
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MRP *</label>
                  <input type="number" step="0.01" value={formData.mrp} onChange={(e) => setFormData({ ...formData, mrp: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price *</label>
                  <input type="number" step="0.01" value={formData.sellingPrice} onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
                  <input type="number" value={formData.stockQuantity} onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number *</label>
                  <input type="text" value={formData.batchNumber} onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                  <input type="text" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
                  <input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST (%)</label>
                  <input type="number" value={formData.gst} onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert</label>
                  <input type="number" value={formData.lowStockThreshold} onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <input type="text" value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.prescriptionRequired} onChange={(e) => setFormData({ ...formData, prescriptionRequired: e.target.checked })}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-sm text-gray-700">Prescription Required</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.isFeatured} onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-sm text-gray-700">Featured Product</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
