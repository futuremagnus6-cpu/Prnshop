import React, { useState, useEffect } from 'react';
import { feedbackApi } from '../../api/feedback';
import { clearRequestCache } from '../../api/client';
import toast from 'react-hot-toast';
import { FiMessageSquare, FiStar, FiTrash2, FiCheckCircle, FiUser, FiMail, FiPhone, FiCalendar, FiSearch, FiEye, FiX, FiRefreshCw } from 'react-icons/fi';

const FeedbackManagement = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async (forceRefresh) => {
    try {
      if (forceRefresh) clearRequestCache('/feedback');
      const data = await feedbackApi.getAll({ limit: 100 });
      setFeedbacks(data.feedback || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await feedbackApi.markRead(id);
      setFeedbacks((prev) => prev.map((f) => (f._id === id ? { ...f, isRead: true } : f)));
    } catch {}
  };

  const deleteFeedback = async (id) => {
    try {
      await feedbackApi.delete(id);
      setFeedbacks((prev) => prev.filter((f) => f._id !== id));
      toast.success('Feedback deleted');
      if (selected?._id === id) setSelected(null);
    } catch {}
  };

  const filtered = feedbacks.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.name?.toLowerCase().includes(q) || f.email?.toLowerCase().includes(q) || f.message?.toLowerCase().includes(q);
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Feedback</h1>
          <p className="text-sm text-gray-500 mt-1">{feedbacks.filter((f) => !f.isRead).length} unread messages</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => loadFeedbacks(true)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search feedback..."
              className="rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-64"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FiMessageSquare className="mx-auto w-16 h-16 text-gray-300" />
          <p className="mt-4 text-gray-500">No feedback found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-2 space-y-2">
            {filtered.map((fb) => (
              <div
                key={fb._id}
                onClick={() => { setSelected(fb); if (!fb.isRead) markRead(fb._id); }}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  !fb.isRead ? 'bg-emerald-50/30 border-emerald-200' : 'bg-white border-gray-100 hover:border-gray-200'
                } ${selected?._id === fb._id ? 'ring-2 ring-emerald-500' : ''}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 font-semibold">
                  {fb.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{fb.name}</p>
                    {!fb.isRead && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{fb.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(fb.createdAt).toLocaleString()}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteFeedback(fb._id); }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Detail */}
          <div className="lg:col-span-1">
            {selected ? (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Message Details</h3>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700 mx-auto">
                  {selected.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <h2 className="mt-4 text-center text-lg font-bold text-gray-900">{selected.name}</h2>
                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiMail className="w-4 h-4" />
                    <span>{selected.email}</span>
                  </div>
                  {selected.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <FiPhone className="w-4 h-4" />
                      <span>{selected.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiCalendar className="w-4 h-4" />
                    <span>{new Date(selected.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <hr className="my-4" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Message</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{selected.message}</p>
                </div>
                <div className="flex gap-2 mt-6">
                  <a
                    href={`mailto:${selected.email}`}
                    className="flex-1 text-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-all"
                  >
                    Reply via Email
                  </a>
                  <button
                    onClick={() => deleteFeedback(selected._id)}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center py-12">
                <FiEye className="mx-auto w-12 h-12 text-gray-300" />
                <p className="mt-3 text-gray-500 text-sm">Select a message to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackManagement;
