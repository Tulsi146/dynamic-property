export const DEFAULT_BLOG_CATEGORIES = [
  'Property Investment',
  'Mumbai Real Estate',
  'Thane Real Estate',
  'Navi Mumbai Real Estate',
  'Home Buying',
  'Home Selling',
  'Property Guide',
  'Real Estate News',
  'Market Trends',
  'Legal & Documentation',
  'Home Loan',
  'Interior & Home Tips',
];

export function slugify(value = '') {
  return String(value || '')
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function sanitizeRichText(html = '') {
  if (!html) return '';
  return String(html)
    .replace(/<script\b[^>]*>.*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>.*?<\/style>/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\//gi, '');
}

export function excerptFromContent(content = '', length = 180) {
  const plainText = String(content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return plainText.length > length ? `${plainText.slice(0, length).trim()}...` : plainText;
}

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://dynamicproperties.in';
}

export function blogCanonicalUrl(slug) {
  return `${getBaseUrl().replace(/\/$/, '')}/blog/${slug}`;
}

export function getReadingTime(content = '') {
  const words = String(content || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

export function formatDate(dateValue) {
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function normalizeKeywords(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
