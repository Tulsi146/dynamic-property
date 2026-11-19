import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { slugify, sanitizeRichText, normalizeKeywords, excerptFromContent } from '@/lib/blog';

function checkAuth(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) return { authorized: false, error: 'Authentication required' };
  const decoded = verifyToken(token);
  if (!decoded) return { authorized: false, error: 'Invalid or expired token' };
  return { authorized: true, admin: decoded };
}

function ensureBlogTables() {
  return Promise.all([
    pool.query(`
      CREATE TABLE IF NOT EXISTS blog_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL UNIQUE,
        slug VARCHAR(150) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `),
    pool.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        excerpt TEXT,
        content LONGTEXT,
        featured_image VARCHAR(500) NULL,
        image_alt VARCHAR(255) NULL,
        category_id INT NULL,
        author_id INT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        published_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        seo_title VARCHAR(255) NULL,
        meta_description VARCHAR(255) NULL,
        focus_keyword VARCHAR(255) NULL,
        secondary_keywords TEXT NULL,
        canonical_url VARCHAR(500) NULL,
        robots VARCHAR(64) NOT NULL DEFAULT 'index, follow',
        faq JSON NULL,
        image_caption VARCHAR(255) NULL,
        is_deleted BOOLEAN DEFAULT FALSE,
        INDEX idx_blogs_slug (slug),
        INDEX idx_blogs_status (status),
        INDEX idx_blogs_category (category_id),
        INDEX idx_blogs_published (published_at),
        FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE SET NULL
      )
    `),
  ]);
}

async function getCategoryId(name) {
  const normalized = (name || '').trim();
  if (!normalized) return null;

  const slug = slugify(normalized);
  const [existingRows] = await pool.query(
    'SELECT id FROM blog_categories WHERE name = ? OR slug = ? LIMIT 1',
    [normalized, slug]
  );

  if (existingRows.length) return existingRows[0].id;

  try {
    const [result] = await pool.query('INSERT INTO blog_categories (name, slug) VALUES (?, ?)', [normalized, slug]);
    return result.insertId;
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      const [retryRows] = await pool.query(
        'SELECT id FROM blog_categories WHERE name = ? OR slug = ? LIMIT 1',
        [normalized, slug]
      );
      return retryRows[0]?.id || null;
    }
    throw error;
  }
}

function normalizePublishedAt(value) {
  if (!value) return null;
  const cleanValue = String(value).trim();
  if (!cleanValue) return null;
  return cleanValue.replace('T', ' ').slice(0, 19);
}

export async function GET(request) {
  try {
    await ensureBlogTables();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const publicOnly = searchParams.get('public') === '1';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '9', 10);

    let sql = `
      SELECT b.*, c.name AS category_name, c.slug AS category_slug
      FROM blogs b
      LEFT JOIN blog_categories c ON c.id = b.category_id
      WHERE b.is_deleted = 0
    `;
    const params = [];

    if (publicOnly) {
      sql += ' AND b.status = ? AND b.published_at IS NOT NULL';
      params.push('published');
    }

    if (search) {
      sql += ' AND (b.title LIKE ? OR b.excerpt LIKE ? OR b.content LIKE ? OR c.name LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    if (category) {
      sql += ' AND c.slug = ?';
      params.push(category);
    }

    if (status && !publicOnly) {
      sql += ' AND b.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.published_at DESC, b.created_at DESC';

    const [rows] = await pool.query(sql, params);

    if (publicOnly) {
      const total = rows.length;
      const start = (page - 1) * limit;
      const paginated = rows.slice(start, start + limit);
      return NextResponse.json({
        blogs: paginated,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    }

    return NextResponse.json({ blogs: rows });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json({ error: 'Failed to fetch blogs' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureBlogTables();
    const auth = checkAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const title = String(body.title || '').trim();
    if (!title) return NextResponse.json({ error: 'Blog title is required' }, { status: 400 });

    let slug = String(body.slug || '').trim();
    if (!slug) slug = slugify(title);
    slug = slugify(slug);

    if (!slug) return NextResponse.json({ error: 'Invalid slug generated from title' }, { status: 400 });

    const categoryName = String(body.category || body.category_name || '').trim();
    const categoryId = categoryName ? await getCategoryId(categoryName) : null;

    const excerpt = String(body.excerpt || '').trim() || excerptFromContent(body.content || '', 180);
    const content = sanitizeRichText(body.content || '');
    const seoTitle = String(body.seo_title || body.seoTitle || body.title || '').trim();
    const metaDescription = String(body.meta_description || body.metaDescription || '').trim();
    const focusKeyword = String(body.focus_keyword || body.focusKeyword || '').trim();
    const secondaryKeywords = normalizeKeywords(body.secondary_keywords || body.secondaryKeywords || []).join(', ');
    const canonicalUrl = String(body.canonical_url || body.canonicalUrl || '').trim();
    const robots = String(body.robots || 'index, follow').trim() || 'index, follow';
    const status = String(body.status || 'draft').trim() || 'draft';
    const faq = body.faq ? JSON.stringify(body.faq) : null;

    const publishedAt = status === 'published' ? normalizePublishedAt(body.published_at || new Date().toISOString()) : null;

    const [existing] = await pool.query('SELECT id FROM blogs WHERE slug = ? AND is_deleted = 0 LIMIT 1', [slug]);
    if (existing.length) {
      return NextResponse.json({ error: 'A blog with this slug already exists' }, { status: 409 });
    }

    const [result] = await pool.query(
      `INSERT INTO blogs (
        title, slug, excerpt, content, featured_image, image_alt, category_id, author_id, status,
        published_at, seo_title, meta_description, focus_keyword, secondary_keywords, canonical_url,
        robots, faq, image_caption
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        slug,
        excerpt,
        content,
        body.featured_image || '',
        body.image_alt || '',
        categoryId,
        auth.admin?.id || null,
        status,
        publishedAt,
        seoTitle || title,
        metaDescription || excerpt,
        focusKeyword,
        secondaryKeywords,
        canonicalUrl || '',
        robots,
        faq,
        body.image_caption || ''
      ]
    );

    const [newRows] = await pool.query('SELECT * FROM blogs WHERE id = ?', [result.insertId]);
    return NextResponse.json({ blog: newRows[0], message: 'Blog created successfully' });
  } catch (error) {
    console.error('Error creating blog:', error);
    const message = process.env.NODE_ENV !== 'production' && error instanceof Error
      ? error.message
      : 'Failed to create blog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await ensureBlogTables();
    const auth = checkAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const blogId = body.id;
    if (!blogId) return NextResponse.json({ error: 'Blog ID is required' }, { status: 400 });

    const categoryName = String(body.category || body.category_name || '').trim();
    const categoryId = categoryName ? await getCategoryId(categoryName) : null;

    const title = String(body.title || '').trim();
    let slug = String(body.slug || '').trim();
    if (title && !slug) slug = slugify(title);
    slug = slugify(slug || title || '');

    const excerpt = String(body.excerpt || '').trim() || excerptFromContent(body.content || '', 180);
    const content = sanitizeRichText(body.content || '');
    const seoTitle = String(body.seo_title || body.seoTitle || title || '').trim();
    const metaDescription = String(body.meta_description || body.metaDescription || '').trim();
    const focusKeyword = String(body.focus_keyword || body.focusKeyword || '').trim();
    const secondaryKeywords = normalizeKeywords(body.secondary_keywords || body.secondaryKeywords || []).join(', ');
    const canonicalUrl = String(body.canonical_url || body.canonicalUrl || '').trim();
    const robots = String(body.robots || 'index, follow').trim() || 'index, follow';
    const status = String(body.status || 'draft').trim() || 'draft';
    const faq = body.faq ? JSON.stringify(body.faq) : null;
    const publishedAt = status === 'published' ? normalizePublishedAt(body.published_at || new Date().toISOString()) : null;

    if (slug) {
      const [existing] = await pool.query('SELECT id FROM blogs WHERE slug = ? AND id != ? AND is_deleted = 0 LIMIT 1', [slug, blogId]);
      if (existing.length) {
        return NextResponse.json({ error: 'A blog with this slug already exists' }, { status: 409 });
      }
    }

    await pool.query(
      `UPDATE blogs SET
        title = ?, slug = ?, excerpt = ?, content = ?, featured_image = ?, image_alt = ?, category_id = ?,
        status = ?, published_at = ?, seo_title = ?, meta_description = ?, focus_keyword = ?,
        secondary_keywords = ?, canonical_url = ?, robots = ?, faq = ?, image_caption = ?
      WHERE id = ? AND is_deleted = 0`,
      [
        title,
        slug,
        excerpt,
        content,
        body.featured_image || '',
        body.image_alt || '',
        categoryId,
        status,
        publishedAt,
        seoTitle || title,
        metaDescription || excerpt,
        focusKeyword,
        secondaryKeywords,
        canonicalUrl || '',
        robots,
        faq,
        body.image_caption || '',
        blogId,
      ]
    );

    const [updatedRows] = await pool.query('SELECT * FROM blogs WHERE id = ?', [blogId]);
    return NextResponse.json({ blog: updatedRows[0], message: 'Blog updated successfully' });
  } catch (error) {
    console.error('Error updating blog:', error);
    return NextResponse.json({ error: 'Failed to update blog' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await ensureBlogTables();
    const auth = checkAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || bodyToId(request);
    if (!id) return NextResponse.json({ error: 'Blog ID is required' }, { status: 400 });

    await pool.query('UPDATE blogs SET is_deleted = 1 WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    return NextResponse.json({ error: 'Failed to delete blog' }, { status: 500 });
  }
}

function bodyToId(request) {
  return null;
}
