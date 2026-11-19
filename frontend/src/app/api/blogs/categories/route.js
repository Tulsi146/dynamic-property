import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { slugify } from '@/lib/blog';

function checkAuth(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return { authorized: false };
  const decoded = verifyToken(token);
  if (!decoded) return { authorized: false };
  return { authorized: true, admin: decoded };
}

const fallbackCategories = [
  { id: 1, name: 'Residential', slug: 'residential' },
  { id: 2, name: 'Commercial', slug: 'commercial' },
  { id: 3, name: 'Luxury Homes', slug: 'luxury-homes' },
  { id: 4, name: 'Rentals', slug: 'rentals' },
  { id: 5, name: 'Investment', slug: 'investment' },
  { id: 6, name: 'New Launches', slug: 'new-launches' },
];

export async function GET() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS blog_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL UNIQUE,
      slug VARCHAR(150) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);

    const [rows] = await pool.query('SELECT * FROM blog_categories ORDER BY name ASC');

    if (!rows.length) {
      for (const category of fallbackCategories) {
        await pool.query('INSERT IGNORE INTO blog_categories (name, slug) VALUES (?, ?)', [category.name, category.slug]);
      }

      const [seededRows] = await pool.query('SELECT * FROM blog_categories ORDER BY name ASC');
      return NextResponse.json({ categories: seededRows });
    }

    return NextResponse.json({ categories: rows });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ categories: fallbackCategories, message: 'Using fallback categories' });
  }
}

export async function POST(request) {
  try {
    const auth = checkAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });

    const slug = slugify(name);
    const [result] = await pool.query('INSERT INTO blog_categories (name, slug) VALUES (?, ?)', [name, slug]);
    const [rows] = await pool.query('SELECT * FROM blog_categories WHERE id = ?', [result.insertId]);
    return NextResponse.json({ category: rows[0], message: 'Category created successfully' });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const auth = checkAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const id = body.id;
    const name = String(body.name || '').trim();
    if (!id || !name) return NextResponse.json({ error: 'Invalid category data' }, { status: 400 });

    const slug = slugify(name);
    await pool.query('UPDATE blog_categories SET name = ?, slug = ? WHERE id = ?', [name, slug, id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = checkAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });

    await pool.query('DELETE FROM blog_categories WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
