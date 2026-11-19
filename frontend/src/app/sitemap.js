import pool from '@/lib/db';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dynamicproperties.in';

  try {
    const [rows] = await pool.query(`
      SELECT slug, updated_at
      FROM blogs
      WHERE status = 'published' AND is_deleted = 0
      ORDER BY updated_at DESC
    `);

    const blogEntries = rows.map((blog) => ({
      url: `${baseUrl}/blog/${blog.slug}`,
      lastModified: blog.updated_at || new Date(),
    }));

    return [
      { url: `${baseUrl}/`, lastModified: new Date() },
      { url: `${baseUrl}/about`, lastModified: new Date() },
      { url: `${baseUrl}/contact`, lastModified: new Date() },
      { url: `${baseUrl}/properties`, lastModified: new Date() },
      { url: `${baseUrl}/blog`, lastModified: new Date() },
      ...blogEntries,
    ];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return [
      { url: `${baseUrl}/`, lastModified: new Date() },
      { url: `${baseUrl}/about`, lastModified: new Date() },
      { url: `${baseUrl}/contact`, lastModified: new Date() },
      { url: `${baseUrl}/properties`, lastModified: new Date() },
      { url: `${baseUrl}/blog`, lastModified: new Date() },
    ];
  }
}
