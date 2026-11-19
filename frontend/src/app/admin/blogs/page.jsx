"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/blog';

const fallbackCategories = [
  { id: 'fallback-1', name: 'Residential', slug: 'residential' },
  { id: 'fallback-2', name: 'Commercial', slug: 'commercial' },
  { id: 'fallback-3', name: 'Luxury Homes', slug: 'luxury-homes' },
  { id: 'fallback-4', name: 'Rentals', slug: 'rentals' },
  { id: 'fallback-5', name: 'Investment', slug: 'investment' },
  { id: 'fallback-6', name: 'New Launches', slug: 'new-launches' },
];

const defaultForm = {
  id: '',
  title: '',
  slug: '',
  category: '',
  excerpt: '',
  content: '',
  featured_image: '',
  image_alt: '',
  image_caption: '',
  seo_title: '',
  meta_description: '',
  focus_keyword: '',
  secondary_keywords: '',
  canonical_url: '',
  robots: 'index, follow',
  status: 'draft',
  published_at: '',
  tags: [],
};

const editorTools = [
  { label: 'H1', command: 'formatBlock', value: 'h1' },
  { label: 'H2', command: 'formatBlock', value: 'h2' },
  { label: 'H3', command: 'formatBlock', value: 'h3' },
  { label: 'Bold', command: 'bold' },
  { label: 'Italic', command: 'italic' },
  { label: 'Underline', command: 'underline' },
  { label: 'Strike', command: 'strikeThrough' },
  { label: 'UL', command: 'insertUnorderedList' },
  { label: 'OL', command: 'insertOrderedList' },
  { label: 'Quote', command: 'formatBlock', value: 'blockquote' },
  { label: 'Link', command: 'createLink', value: 'https://dynamicproperties.in' },
  { label: 'Clear', command: 'removeFormat' },
  { label: 'Undo', command: 'undo' },
  { label: 'Redo', command: 'redo' },
];

export default function AdminBlogsPage() {
  const router = useRouter();
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const insertImageInputRef = useRef(null);

  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    const admin = localStorage.getItem('admin');
    if (!admin) {
      router.push('/admin/login');
      return;
    }

    fetchBlogs();
    fetchCategories();
  }, [router]);

  useEffect(() => {
    if (!showForm || !editorRef.current) return;
    if (editorRef.current.innerHTML !== form.content) {
      editorRef.current.innerHTML = form.content || '';
    }
  }, [showForm, form.content]);

  useEffect(() => {
    if (!showForm || !isDirty) return;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [showForm, isDirty]);

  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      const text = [blog.title, blog.excerpt, blog.category_name, blog.slug].join(' ').toLowerCase();
      const matchesSearch = !search || text.includes(search.toLowerCase());
      const matchesStatus = !statusFilter || blog.status === statusFilter;
      const matchesCategory = !categoryFilter || blog.category_name === categoryFilter || blog.category_slug === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [blogs, search, statusFilter, categoryFilter]);

  const fetchBlogs = async () => {
    try {
      const response = await fetch('/api/blogs');
      const data = await response.json();
      if (response.ok) setBlogs(data.blogs || []);
    } catch (error) {
      console.error('fetchBlogs error', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/blogs/categories');
      const data = await response.json();
      const nextCategories = Array.isArray(data?.categories) && data.categories.length > 0 ? data.categories : fallbackCategories;
      setCategories(nextCategories);
    } catch (error) {
      console.error('fetchCategories error', error);
      setCategories(fallbackCategories);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const generateSlug = (title) => slugify(title || '');

  const handleTitleChange = (value) => {
    const generated = generateSlug(value);
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: prev.slug && prev.slug !== generateSlug(prev.title) ? prev.slug : generated,
    }));
    setErrors((prev) => ({ ...prev, title: '', slug: '' }));
    setIsDirty(true);
  };

  const addTag = () => {
    const clean = tagInput.trim();
    if (!clean) return;
    setForm((prev) => ({ ...prev, tags: [...(prev.tags || []), clean] }));
    setTagInput('');
    setIsDirty(true);
  };

  const removeTag = (tagToRemove) => {
    setForm((prev) => ({ ...prev, tags: (prev.tags || []).filter((tag) => tag !== tagToRemove) }));
    setIsDirty(true);
  };

  const applyEditorCommand = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    const html = editorRef.current?.innerHTML || '';
    updateField('content', html);
  };

  const insertHtmlAtCursor = (html) => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return;

    if (selection.rangeCount === 0) {
      editorRef.current.insertAdjacentHTML('beforeend', html);
      updateField('content', editorRef.current.innerHTML);
      return;
    }

    const range = selection.getRangeAt(0);
    const fragment = range.createContextualFragment(html);
    range.insertNode(fragment);
    range.collapse(false);
    updateField('content', editorRef.current.innerHTML);
  };

  const handleEditorInput = () => {
    const html = editorRef.current?.innerHTML || '';
    updateField('content', html);
  };

  const handleInlineImageUpload = async (file) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Unsupported image type. Use JPG, PNG, WEBP, GIF or SVG.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be smaller than 5MB.' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();

      if (response.ok && data.url) {
        const imageHtml = `
          <figure style="margin: 1.75rem 0;">
            <img src="${data.url}" alt="Inserted blog image" style="width: 100%; max-height: 520px; object-fit: cover; border-radius: 1rem;" />
            <figcaption style="margin-top: 0.5rem; color: #6b7280; font-size: 0.875rem; font-style: italic; text-align: center;">Inserted image</figcaption>
          </figure>
        `;
        insertHtmlAtCursor(imageHtml);
        setMessage({ type: 'success', text: 'Image inserted into the article.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Image upload failed.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Image upload failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.title?.trim()) nextErrors.title = 'Blog title is required.';
    if (!form.slug?.trim()) nextErrors.slug = 'Slug is required.';
    if (!form.category?.trim()) nextErrors.category = 'Category is required.';
    if (!form.featured_image) nextErrors.featured_image = 'Featured image is required.';
    if (!String(form.content || '').replace(/<[^>]+>/g, '').trim()) nextErrors.content = 'Blog content is required.';
    if (!form.seo_title?.trim()) nextErrors.seo_title = 'SEO title is required.';
    if (!form.meta_description?.trim()) nextErrors.meta_description = 'Meta description is required.';

    return nextErrors;
  };

  const submitBlog = async (finalStatus = null) => {
    const validation = validateForm();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      setMessage({ type: 'error', text: 'Please fix the highlighted fields before saving.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...form,
        category: form.category,
        secondary_keywords: form.tags.join(', '),
        status: finalStatus || form.status,
        published_at: finalStatus === 'published' || form.status === 'published'
          ? (form.published_at || new Date().toISOString().slice(0, 19).replace('T', ' '))
          : (form.published_at || null),
      };

      const response = await fetch('/api/blogs', {
        method: editingId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...payload, id: editingId || undefined }),
      });

      const data = await response.json();
      if (response.ok) {
        const successMessage = finalStatus === 'published' ? 'Blog published successfully.' : editingId ? 'Blog updated successfully.' : 'Blog saved successfully.';
        setMessage({ type: 'success', text: successMessage });
        setIsDirty(false);
        setShowForm(false);
        setEditingId(null);
        setForm(defaultForm);
        setTagInput('');
        fetchBlogs();
        fetchCategories();
      } else {
        const backendMessage = data?.error || 'Failed to save blog.';
        setMessage({ type: 'error', text: backendMessage });
        console.error('Blog save failed:', backendMessage);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong while saving the blog.';
      setMessage({ type: 'error', text: message });
      console.error('Blog save exception:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Unsupported image type. Use JPG, PNG, WEBP, GIF or SVG.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be smaller than 5MB.' });
      return;
    }

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();

      if (response.ok && data.url) {
        updateField('featured_image', data.url);
        setMessage({ type: 'success', text: 'Image uploaded successfully.' });
        setErrors((prev) => ({ ...prev, featured_image: '' }));
      } else {
        setMessage({ type: 'error', text: data.error || 'Image upload failed.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Image upload failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this blog?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/blogs?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        setBlogs((prev) => prev.filter((blog) => blog.id !== id));
        setMessage({ type: 'success', text: data.message || 'Blog deleted successfully.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Delete failed.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Delete failed.' });
    }
  };

  const togglePublish = async (blog) => {
    const nextStatus = blog.status === 'published' ? 'draft' : 'published';
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/blogs', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: blog.id,
          title: blog.title,
          slug: blog.slug,
          excerpt: blog.excerpt,
          content: blog.content,
          featured_image: blog.featured_image,
          image_alt: blog.image_alt,
          category: blog.category_name || '',
          seo_title: blog.seo_title,
          meta_description: blog.meta_description,
          focus_keyword: blog.focus_keyword,
          secondary_keywords: blog.secondary_keywords,
          canonical_url: blog.canonical_url,
          robots: blog.robots,
          status: nextStatus,
          published_at: nextStatus === 'published' ? (blog.published_at || new Date().toISOString().slice(0, 19).replace('T', ' ')) : null,
        }),
      });

      if (response.ok) {
        setBlogs((prev) => prev.map((item) => item.id === blog.id ? { ...item, status: nextStatus } : item));
        setMessage({ type: 'success', text: `Blog moved to ${nextStatus}.` });
      }
    } catch (error) {
      console.error('togglePublish error', error);
    }
  };

  const startEdit = (blog) => {
    setEditingId(blog.id);
    setForm({
      id: blog.id,
      title: blog.title || '',
      slug: blog.slug || '',
      category: blog.category_name || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      featured_image: blog.featured_image || '',
      image_alt: blog.image_alt || '',
      image_caption: blog.image_caption || '',
      seo_title: blog.seo_title || '',
      meta_description: blog.meta_description || '',
      focus_keyword: blog.focus_keyword || '',
      secondary_keywords: blog.secondary_keywords || '',
      canonical_url: blog.canonical_url || '',
      robots: blog.robots || 'index, follow',
      status: blog.status || 'draft',
      published_at: blog.published_at ? blog.published_at.slice(0, 16) : '',
      tags: String(blog.secondary_keywords || '').split(',').map((tag) => tag.trim()).filter(Boolean),
    });
    setTagInput('');
    setShowForm(true);
    setIsDirty(false);
    setErrors({});
  };

  const openNewForm = async () => {
    await fetchCategories();
    setEditingId(null);
    setForm(defaultForm);
    setTagInput('');
    setShowForm(true);
    setIsDirty(false);
    setErrors({});
  };

  const closeForm = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm);
    setTagInput('');
    setIsDirty(false);
    setErrors({});
  };

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setMessage({ type: 'error', text: 'Category name is required.' });
      return;
    }

    try {
      setCreatingCategory(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/blogs/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await response.json();

      if (response.ok) {
        const categoryName = data.category?.name || trimmed;
        setForm((prev) => ({ ...prev, category: categoryName }));
        setNewCategoryName('');
        await fetchCategories();
        setMessage({ type: 'success', text: 'Category added successfully.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Category could not be created.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Category could not be created.' });
    } finally {
      setCreatingCategory(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-lg text-[#02333B]">
        Loading blogs...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <button type="button" onClick={() => router.push('/admin/dashboard')} className="text-sm font-medium mb-2 inline-flex items-center gap-2" style={{ color: '#B39359' }}>
                ← Back to Blogs
              </button>
              <h1 className="text-2xl font-bold text-[#02333B] font-lora">
                {editingId ? 'Edit Blog' : 'Add New Blog'}
              </h1>
              <p className="text-sm text-gray-500">Dashboard / Blogs / {editingId ? 'Edit Blog' : 'Add New Blog'}</p>
            </div>

            {!showForm ? (
              <button onClick={openNewForm} className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white" style={{ background: '#B39359' }}>
                + New Blog
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => window.open(`/blog/${form.slug || 'preview'}`, '_blank')} className="px-3 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-[#02333B]">
                  Preview
                </button>
                <button type="button" onClick={() => submitBlog('draft')} disabled={saving} className="px-3 py-2 rounded-md text-sm font-medium text-white" style={{ background: '#02333B', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
                <button type="button" onClick={() => submitBlog('published')} disabled={saving} className="px-3 py-2 rounded-md text-sm font-medium text-white" style={{ background: '#B39359', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Publishing...' : editingId ? 'Update / Publish' : 'Publish'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
        {message.text && (
          <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {!showForm ? (
          <>
            <div className="mb-6 rounded-xl bg-white p-4 shadow-sm border border-gray-200">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search blogs" className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#B39359] focus:outline-none" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#B39359] focus:outline-none">
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#B39359] focus:outline-none">
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#02333B] text-white">
                  <tr>
                    <th className="px-4 py-3">Image</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Published</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBlogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-500">No blogs found.</td>
                    </tr>
                  ) : (
                    filteredBlogs.map((blog) => (
                      <tr key={blog.id} className="border-b border-gray-200 last:border-b-0">
                        <td className="px-4 py-3">
                          {blog.featured_image ? (
                            <img src={blog.featured_image} alt={blog.title} className="h-14 w-20 rounded-md object-cover border border-gray-200" />
                          ) : (
                            <div className="h-14 w-20 rounded-md bg-gray-200" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#02333B]">{blog.title}</div>
                          <div className="text-xs text-gray-500">{blog.slug}</div>
                        </td>
                        <td className="px-4 py-3">{blog.category_name || 'Uncategorized'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${blog.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {blog.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">{blog.published_at ? new Date(blog.published_at).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="px-4 py-3">{blog.updated_at ? new Date(blog.updated_at).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => startEdit(blog)} className="font-medium text-[#B39359]">Edit</button>
                            <button onClick={() => togglePublish(blog)} className="font-medium text-[#02333B]">{blog.status === 'published' ? 'Draft' : 'Publish'}</button>
                            <button onClick={() => handleDelete(blog.id)} className="font-medium text-red-600">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="pb-24">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.8fr)]">
              <div className="space-y-6">
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#02333B]">Basic Information</h2>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#02333B]">Blog Title *</label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className={`w-full rounded-md border px-3 py-3 text-base focus:border-[#B39359] focus:outline-none ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Best Areas to Buy Property in Mumbai in 2026"
                      />
                      {errors.title && <p className="mt-2 text-xs text-red-600">{errors.title}</p>}
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="text-sm font-semibold text-[#02333B]">Slug</label>
                        <button type="button" onClick={() => updateField('slug', generateSlug(form.title))} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-[#02333B]">
                          Edit slug
                        </button>
                      </div>
                      <input
                        type="text"
                        value={form.slug}
                        onChange={(e) => updateField('slug', slugify(e.target.value))}
                        className={`w-full rounded-md border px-3 py-2.5 focus:border-[#B39359] focus:outline-none ${errors.slug ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="best-areas-to-buy-property-in-mumbai-in-2026"
                      />
                      <p className="mt-2 text-xs text-gray-500">This will be the public URL of your blog.</p>
                      {errors.slug && <p className="mt-2 text-xs text-red-600">{errors.slug}</p>}
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#02333B]">Excerpt</h2>
                    <span className="text-xs text-gray-500">{form.excerpt.length} / 160</span>
                  </div>
                  <textarea
                    value={form.excerpt}
                    onChange={(e) => updateField('excerpt', e.target.value.slice(0, 160))}
                    rows={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-3 focus:border-[#B39359] focus:outline-none"
                    placeholder="A concise summary of the article for cards and previews."
                  />
                  <p className="mt-2 text-xs text-gray-500">This excerpt will be used on the blog listing page and social previews.</p>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#02333B]">Featured Image</h2>
                    {form.featured_image && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-medium text-[#B39359]">
                          Change Image
                        </button>
                        <button type="button" onClick={() => updateField('featured_image', '')} className="text-xs font-medium text-red-600">
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {!form.featured_image ? (
                    <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center transition hover:border-[#B39359] hover:bg-[#F9F5EE]">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e.target.files?.[0])}
                      />
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5EEE3] text-2xl text-[#B39359]">⬆</div>
                      <div className="text-base font-semibold text-[#02333B]">Upload Image</div>
                      <p className="mt-2 text-sm text-gray-500">Drag & drop your image here or browse files</p>
                      <p className="mt-4 text-xs text-gray-500">JPG, PNG, WEBP • Max 5 MB</p>
                    </label>
                  ) : (
                    <div className="space-y-4">
                      <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                        <img src={form.featured_image} alt={form.image_alt || form.title} className="h-72 w-full object-cover" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-md bg-[#F5EEE3] px-3 py-2 text-sm font-medium text-[#02333B]">
                          Change Image
                        </button>
                        <button type="button" onClick={() => updateField('featured_image', '')} className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                          Remove Image
                        </button>
                      </div>
                    </div>
                  )}

                  {errors.featured_image && <p className="mt-3 text-xs text-red-600">{errors.featured_image}</p>}

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#02333B]">Image Alt Text *</label>
                      <input
                        type="text"
                        value={form.image_alt}
                        onChange={(e) => updateField('image_alt', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:border-[#B39359] focus:outline-none"
                        placeholder="Luxury home in Mumbai"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#02333B]">Image Caption</label>
                      <input
                        type="text"
                        value={form.image_caption}
                        onChange={(e) => updateField('image_caption', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:border-[#B39359] focus:outline-none"
                        placeholder="Modern apartment living room"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#02333B]">Blog Content</h2>
                    <span className="text-xs text-gray-500">Rich text editor</span>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-gray-300">
                    <div className="flex flex-wrap gap-2 border-b border-gray-200 bg-gray-50 p-2">
                      {editorTools.map((tool) => (
                        <button
                          key={tool.label}
                          type="button"
                          onClick={() => applyEditorCommand(tool.command, tool.value)}
                          className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-[#02333B] hover:border-[#B39359] hover:text-[#B39359]"
                        >
                          {tool.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => insertImageInputRef.current?.click()}
                        className="rounded border border-gray-200 bg-[#F5EEE3] px-2 py-1 text-xs font-medium text-[#02333B] hover:border-[#B39359] hover:text-[#B39359]"
                      >
                        Insert Image
                      </button>
                    </div>
                    <input
                      ref={insertImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleInlineImageUpload(e.target.files?.[0])}
                    />
                    <div
                      ref={editorRef}
                      onInput={handleEditorInput}
                      contentEditable
                      suppressContentEditableWarning
                      className="min-h-[500px] bg-white p-4 text-[15px] leading-8 text-gray-700 outline-none"
                    />
                  </div>

                  {errors.content && <p className="mt-3 text-xs text-red-600">{errors.content}</p>}
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-[#02333B]">Publish</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#02333B]">Status</label>
                      <div className="space-y-2">
                        {['draft', 'published', 'scheduled'].map((status) => (
                          <label key={status} className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="radio" name="status" checked={form.status === status} onChange={() => updateField('status', status)} />
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#02333B]">Publication Date</label>
                      <input type="datetime-local" value={form.published_at} onChange={(e) => updateField('published_at', e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:border-[#B39359] focus:outline-none" />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#02333B]">Author</label>
                      <input type="text" value="Admin" readOnly className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2.5 text-gray-600" />
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-[#02333B]">Category</h2>
                  <select value={form.category} onChange={(e) => updateField('category', e.target.value)} className={`w-full rounded-md border px-3 py-2.5 focus:border-[#B39359] focus:outline-none ${errors.category ? 'border-red-500' : 'border-gray-300'}`}>
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>{category.name}</option>
                    ))}
                  </select>

                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Add new category"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2.5 focus:border-[#B39359] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={creatingCategory}
                      className="rounded-md bg-[#02333B] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {creatingCategory ? 'Adding...' : 'Add'}
                    </button>
                  </div>

                  {errors.category && <p className="mt-2 text-xs text-red-600">{errors.category}</p>}
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-[#02333B]">Tags / Keywords</h2>
                  <div className="flex gap-2">
                    <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addTag(); }
                    }} placeholder="Add tag" className="flex-1 rounded-md border border-gray-300 px-3 py-2.5 focus:border-[#B39359] focus:outline-none" />
                    <button type="button" onClick={addTag} className="rounded-md bg-[#02333B] px-3 py-2 text-sm font-medium text-white">Add</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(form.tags || []).map((tag) => (
                      <button key={tag} type="button" onClick={() => removeTag(tag)} className="rounded-full bg-[#F5EEE3] px-2.5 py-1 text-xs font-medium text-[#02333B]">
                        {tag} ×
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-[#02333B]">SEO Settings</h2>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                        <label className="font-semibold text-[#02333B]">SEO Title</label>
                        <span>{(form.seo_title || '').length} / 60</span>
                      </div>
                      <input value={form.seo_title} onChange={(e) => updateField('seo_title', e.target.value.slice(0, 60))} className={`w-full rounded-md border px-3 py-2.5 focus:border-[#B39359] focus:outline-none ${errors.seo_title ? 'border-red-500' : 'border-gray-300'}`} placeholder="Best Areas to Buy Property in Mumbai" />
                      {errors.seo_title && <p className="mt-2 text-xs text-red-600">{errors.seo_title}</p>}
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                        <label className="font-semibold text-[#02333B]">Meta Description</label>
                        <span>{(form.meta_description || '').length} / 160</span>
                      </div>
                      <textarea value={form.meta_description} onChange={(e) => updateField('meta_description', e.target.value.slice(0, 160))} rows={3} className={`w-full rounded-md border px-3 py-2.5 focus:border-[#B39359] focus:outline-none ${errors.meta_description ? 'border-red-500' : 'border-gray-300'}`} />
                      {errors.meta_description && <p className="mt-2 text-xs text-red-600">{errors.meta_description}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#02333B]">Focus Keyword</label>
                      <input value={form.focus_keyword} onChange={(e) => updateField('focus_keyword', e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:border-[#B39359] focus:outline-none" />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#02333B]">Secondary Keywords</label>
                      <input value={form.secondary_keywords} onChange={(e) => updateField('secondary_keywords', e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:border-[#B39359] focus:outline-none" />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#02333B]">Canonical URL</label>
                      <input value={form.canonical_url} onChange={(e) => updateField('canonical_url', e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:border-[#B39359] focus:outline-none" placeholder="https://dynamicproperties.in/blog/..." />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#02333B]">Robots</label>
                      <select value={form.robots} onChange={(e) => updateField('robots', e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:border-[#B39359] focus:outline-none">
                        <option value="index, follow">index, follow</option>
                        <option value="noindex, follow">noindex, follow</option>
                        <option value="index, nofollow">index, nofollow</option>
                        <option value="noindex, nofollow">noindex, nofollow</option>
                      </select>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Search Preview</p>
                      <div className="space-y-1">
                        <div className="text-sm text-blue-700">{form.seo_title || 'Blog title'} </div>
                        <div className="text-xs text-gray-500">dynamicproperties.in › blog › {form.slug || 'your-blog-slug'}</div>
                        <div className="text-sm text-gray-600">{form.meta_description || 'Add a meta description to improve how your article appears in search results.'}</div>
                      </div>
                    </div>
                  </div>
                </section>
              </aside>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur sm:px-6">
              <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-600">{isDirty ? 'Unsaved changes' : 'All changes saved'}</div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => window.open(`/blog/${form.slug || 'preview'}`, '_blank')} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-[#02333B]">
                    Preview
                  </button>
                  <button type="button" onClick={() => submitBlog('draft')} disabled={saving} className="rounded-md bg-[#02333B] px-4 py-2 text-sm font-medium text-white" style={{ opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button type="button" onClick={() => submitBlog('published')} disabled={saving} className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ background: '#B39359', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Publishing...' : editingId ? 'Update / Publish' : 'Publish'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
