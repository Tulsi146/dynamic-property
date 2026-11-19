import Link from 'next/link';
import Header from '@/components/Header';
import MobileMenu from '@/components/MobileMenu';
import Footer from '@/components/Footer';
import ScrollUp from '@/components/ScrollUp';
import SocialFloating from '@/components/SocialFloating';
import pool from '@/lib/db';

async function getBlogBySlug(slug) {
  try {
    const [rows] = await pool.query(`
      SELECT b.*, c.name AS category_name, c.slug AS category_slug
      FROM blogs b
      LEFT JOIN blog_categories c ON c.id = b.category_id
      WHERE b.slug = ? AND b.is_deleted = 0 AND b.status = 'published'
      LIMIT 1
    `, [slug]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching blog details:', error);
    return null;
  }
}

async function getRelatedBlogs(blog) {
  try {
    const [rows] = await pool.query(`
      SELECT b.*, c.name AS category_name
      FROM blogs b
      LEFT JOIN blog_categories c ON c.id = b.category_id
      WHERE b.is_deleted = 0 AND b.status = 'published' AND b.id != ?
      ORDER BY b.published_at DESC
      LIMIT 4
    `, [blog.id]);
    return rows;
  } catch (error) {
    return [];
  }
}

function renderArticleContent(content) {
  if (!content) return '<p>Content not available.</p>';

  const safe = String(content)
    .replace(/<script\b[^>]*>.*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>.*?<\/style>/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/javascript:/gi, '');

  if (/<\/?[a-z][\s\S]*>/i.test(safe)) {
    return safe;
  }

  return safe
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    return {
      title: 'Blog Not Found | Dynamic Properties',
      description: 'The requested article could not be found.',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dynamicproperties.in';
  const canonical = `${baseUrl}/blog/${slug}`;

  return {
    title: blog.seo_title || blog.title,
    description: blog.meta_description || blog.excerpt,
    alternates: { canonical },
    openGraph: {
      title: blog.seo_title || blog.title,
      description: blog.meta_description || blog.excerpt,
      url: canonical,
      type: 'article',
      siteName: 'Dynamic Properties',
      images: [{ url: blog.featured_image || '/assets/images/latest-properties/properties1.jpg', alt: blog.image_alt || blog.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.seo_title || blog.title,
      description: blog.meta_description || blog.excerpt,
      images: [blog.featured_image || '/assets/images/latest-properties/properties1.jpg'],
    },
    robots: blog.robots || 'index, follow',
  };
}

export default async function BlogDetailPage({ params }) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) {
    return (
      <>
        <Header />
        <MobileMenu />
        <main className="container px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-[#02333B] mb-4">Blog not found</h1>
          <Link href="/blog" className="inline-flex px-5 py-3 rounded-md text-white" style={{ backgroundColor: '#B39359' }}>Back to blog</Link>
        </main>
        <Footer />
        <ScrollUp />
        <SocialFloating />
      </>
    );
  }

  const relatedBlogs = await getRelatedBlogs(blog);
  const articleWords = (blog.content || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const readMinutes = Math.max(1, Math.ceil(articleWords / 200));

  return (
    <>
      <Header />
      <MobileMenu />

      <div className="relative w-full bg-[#03333B] font-lora overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-[#B39359] rounded-full filter blur-3xl animate-float"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#B39359] rounded-full filter blur-3xl animate-float delay-500"></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="pt-28 sm:pt-32 md:pt-36 lg:pt-40 pb-14 sm:pb-18 md:pb-22 lg:pb-24 text-center max-w-5xl mx-auto">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-4 sm:mb-5 animate-slide-up">
              {blog.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-3 text-white/90 text-xs sm:text-sm md:text-base animate-slide-up delay-200">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white/90">
                {blog.category_name || 'Property Guide'}
              </span>
              <span>{new Date(blog.published_at || blog.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>•</span>
              <span>{readMinutes} min read</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-[60px] sm:h-[80px] md:h-[100px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-white"></path>
          </svg>
        </div>
      </div>

      <div className="bg-[#02333B] border-t border-white/10">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 font-lora text-xs sm:text-sm text-white/70">
            <Link href="/" className="hover:text-white transition duration-300">
              Home
            </Link>
            <span className="text-[#B39359]">/</span>
            <Link href="/blog" className="hover:text-white transition duration-300">
              Blog
            </Link>
            <span className="text-[#B39359]">/</span>
            <span className="text-white font-medium whitespace-nowrap max-w-[260px] truncate">{blog.title}</span>
          </div>
        </div>
      </div>

      <main className="bg-white pb-16">
        <article className="container px-4 sm:px-6 lg:px-8 pt-10">
          <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
            <div className="max-w-4xl mx-auto w-full lg:mx-0">
              <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-y border-gray-200 py-4 text-sm text-gray-600">
                <div>By Dynamic Properties</div>
                <div className="flex items-center gap-4">
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://dynamicproperties.in'}/blog/${blog.slug}`)}`} target="_blank" rel="noreferrer" className="hover:text-[#B39359]">Facebook</a>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`${blog.title} ${process.env.NEXT_PUBLIC_BASE_URL || 'https://dynamicproperties.in'}/blog/${blog.slug}`)}`} target="_blank" rel="noreferrer" className="hover:text-[#B39359]">WhatsApp</a>
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://dynamicproperties.in'}/blog/${blog.slug}`)}`} target="_blank" rel="noreferrer" className="hover:text-[#B39359]">X</a>
                </div>
              </div>

              {blog.featured_image && (
                <div className="mb-10 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                  <img src={blog.featured_image} alt={blog.image_alt || blog.title} className="w-full h-auto max-h-[560px] object-cover" />
                  {blog.image_caption && <div className="px-4 py-3 text-sm text-gray-600 italic border-t">{blog.image_caption}</div>}
                </div>
              )}

              <div className="prose max-w-none prose-lg prose-headings:font-lora prose-headings:text-[#02333B] prose-a:text-[#B39359] prose-blockquote:border-l-[#B39359] prose-table:border prose-table:border-gray-200 prose-th:p-3 prose-td:p-3 text-gray-700" dangerouslySetInnerHTML={{ __html: renderArticleContent(blog.content) }} />

              <div className="mt-12 rounded-2xl border border-[#E7D7B5] bg-[#F9F5EE] p-6 sm:p-8">
                <h3 className="font-lora text-2xl font-bold text-[#02333B] mb-3">Need expert guidance for your next move?</h3>
                <p className="mb-5 text-gray-700">Speak with our team about buying, selling, or investing in the right property.</p>
                <div className="flex flex-wrap gap-3">
                  <a href="/contact" className="inline-flex items-center justify-center rounded-md px-5 py-3 text-white font-medium" style={{ backgroundColor: '#02333B' }}>Contact Us</a>
                  <a href="https://wa.me/917317241999?text=Hi%20Dynamic%20Properties%2C%20I%20want%20to%20know%20more%20about%20your%20properties" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-md px-5 py-3 text-white font-medium" style={{ backgroundColor: '#25D366' }}>WhatsApp</a>
                </div>
              </div>
            </div>

            <aside className="mt-8 lg:mt-0">
              <div className="rounded-2xl border border-gray-200 bg-[#F9F5EE] p-5 shadow-sm lg:sticky lg:top-24">
                <h3 className="mb-4 text-lg font-bold text-[#02333B]">Read This</h3>
                <div className="space-y-4">
                  {relatedBlogs.slice(0, 3).map((item) => (
                    <Link key={item.id} href={`/blog/${item.slug}`} className="group block rounded-xl border border-[#E7D7B5] bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-sm">
                      <div className="mb-2 overflow-hidden rounded-lg">
                        <img src={item.featured_image || '/assets/images/latest-properties/properties1.jpg'} alt={item.title} className="h-24 w-full object-cover transition group-hover:scale-105" />
                      </div>
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">{item.category_name || 'Property Guide'}</div>
                      <div className="mt-1 text-sm font-semibold text-[#02333B] leading-snug">{item.title}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </article>

        {relatedBlogs.length > 0 && (
          <section className="container px-4 sm:px-6 lg:px-8 mt-20">
            <div className="max-w-4xl mx-auto">
              <h3 className="font-lora text-3xl font-bold text-[#02333B] mb-8">Related Articles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {relatedBlogs.map((item) => (
                  <article key={item.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <img src={item.featured_image || '/assets/images/latest-properties/properties1.jpg'} alt={item.title} className="h-48 w-full object-cover" />
                    <div className="p-4">
                      <div className="text-xs text-gray-500 mb-2">{item.category_name || 'Property Guide'}</div>
                      <h4 className="font-lora text-xl font-bold text-[#02333B] mb-3">{item.title}</h4>
                      <Link href={`/blog/${item.slug}`} className="text-sm font-medium" style={{ color: '#B39359' }}>Read article →</Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
      <ScrollUp />
      <SocialFloating />
    </>
  );
}
