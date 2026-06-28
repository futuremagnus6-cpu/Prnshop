import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { blogApi } from '../api/blogs';
import {
  FiCalendar,
  FiEye,
  FiArrowLeft,
  FiClock,
  FiShare2,
  FiTag,
  FiPlay,
  FiBookOpen,
} from 'react-icons/fi';

const BlogDetail = () => {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedBlogs, setRelatedBlogs] = useState([]);

  useEffect(() => {
    loadBlog();
    window.scrollTo(0, 0);
  }, [id]);

  const loadBlog = async () => {
    setLoading(true);
    try {
      const data = await blogApi.getById(id);
      setBlog(data.blog);
      // Load related blogs in same category
      if (data.blog.category) {
        const related = await blogApi.getAll({ category: data.blog.category, limit: 3 });
        setRelatedBlogs(related.blogs?.filter((b) => b._id !== data.blog._id).slice(0, 3) || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: blog.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
          <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
          <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded" />
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-5/6" />
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiBookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Blog not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">The blog you're looking for doesn't exist or has been removed.</p>
        <Link
          to="/blogs"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" /> Back to Blogs
        </Link>
      </div>
    );
  }

  const readingTime = blog.content ? Math.ceil(blog.content.replace(/<[^>]*>/g, '').split(' ').length / 200) : 1;
  const isYouTube = blog.videoUrl?.includes('youtube') || blog.videoUrl?.includes('youtu.be');
  const isUploadedVideo = blog.videoUrl?.startsWith('/uploads/');

  return (
    <div className="min-h-screen">
      {/* Back Button */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0">
        <Link
          to="/blogs"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group"
        >
          <FiArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to all blogs
        </Link>
      </div>

      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              blog.type === 'video'
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
            }`}>
              {blog.type === 'video' ? '🎬 Video' : '📝 Article'}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full flex items-center gap-1">
              <FiTag className="w-3 h-3" /> {blog.category || 'General'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight">
            {blog.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1.5">
              <FiCalendar className="w-4 h-4" />
              {new Date(blog.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <FiClock className="w-4 h-4" />
              {readingTime} min read
            </span>
            <span className="flex items-center gap-1.5">
              <FiEye className="w-4 h-4" />
              {blog.views} views
            </span>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors ml-auto"
            >
              <FiShare2 className="w-4 h-4" /> Share
            </button>
          </div>
        </header>

        {/* Featured Image */}
        {blog.image && blog.type !== 'video' && (
          <div className="mb-8 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 shadow-lg animate-fade-in">
            <img
              src={blog.image}
              alt={blog.title}
              className="w-full aspect-video object-cover hover:scale-[1.02] transition-transform duration-700"
            />
          </div>
        )}

        {/* Video Embed */}
        {blog.type === 'video' && blog.videoUrl && (
          <div className="mb-8 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-lg animate-fade-in">
            {isYouTube ? (
              <div className="aspect-video">
                <iframe
                  src={blog.videoUrl.replace('watch?v=', 'embed/').split('&')[0]}
                  className="w-full h-full"
                  allowFullScreen
                  title={blog.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            ) : isUploadedVideo ? (
              <video
                src={blog.videoUrl}
                controls
                className="w-full aspect-video object-contain bg-black"
                poster={blog.image || undefined}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <video src={blog.videoUrl} controls className="w-full aspect-video object-contain bg-black" poster={blog.image || undefined}>
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        )}

        {/* Excerpt */}
        {blog.excerpt && (
          <div className="mb-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
            <p className="text-lg text-gray-700 dark:text-gray-300 font-medium leading-relaxed italic">
              "{blog.excerpt}"
            </p>
          </div>
        )}

        {/* Content */}
        <div className="prose prose-lg max-w-none dark:prose-invert mb-12 animate-fade-in">
          {blog.content ? (
            <div
              dangerouslySetInnerHTML={{ __html: blog.content }}
              className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:dark:text-gray-100 [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:dark:text-gray-100 [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:dark:text-gray-400 [&_blockquote]:my-6 [&_img]:rounded-xl [&_img]:my-6 [&_a]:text-emerald-600 [&_a]:dark:text-emerald-400 [&_a]:underline [&_a]:hover:text-emerald-700"
            />
          ) : (
            <p className="text-gray-400 dark:text-gray-500 italic">No content available for this post.</p>
          )}
        </div>

        {/* Tags */}
        {blog.tags?.length > 0 && (
          <div className="mb-12 pb-8 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {blog.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 transition-colors cursor-default"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Author Section (if available) */}
        {blog.author && blog.author.name && (
          <div className="flex items-center gap-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-8">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {blog.author.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{blog.author.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Author</p>
            </div>
          </div>
        )}
      </article>

      {/* Related Blogs */}
      {relatedBlogs.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Related Articles</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedBlogs.map((rb) => (
                <Link
                  key={rb._id}
                  to={`/blogs/${rb._id}`}
                  className="group bg-white dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  {rb.image && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={rb.image}
                        alt={rb.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">{rb.category}</p>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                      {rb.title}
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {new Date(rb.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Back Link */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <Link
          to="/blogs"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" /> Back to all blogs
        </Link>
      </div>
    </div>
  );
};

export default BlogDetail;
