import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const [rows] = await pool.query(
      `SELECT b.*, c.name AS category_name, c.slug AS category_slug
       FROM blogs b
       LEFT JOIN blog_categories c ON c.id = b.category_id
       WHERE b.slug = ? AND b.is_deleted = 0 AND b.status = 'published' LIMIT 1`,
      [slug]
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }

    return NextResponse.json({ blog: rows[0] });
  } catch (error) {
    console.error('Error fetching blog by slug:', error);
    return NextResponse.json({ error: 'Failed to fetch blog' }, { status: 500 });
  }
}
