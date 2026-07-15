import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const collegeId = searchParams.get('collegeId');
    const search = searchParams.get('search');

    let sql = 'SELECT * FROM books WHERE 1=1';
    const params: any[] = [];

    if (category && category !== 'All') {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }
    if (collegeId && collegeId !== 'All') {
      params.push(collegeId);
      sql += ` AND college_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (title ILIKE $${params.length} OR author ILIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, author, category, isbn, cover_image_url, college_id, total_copies } = body;

    const sql = `
      INSERT INTO books (title, author, category, isbn, cover_image_url, college_id, total_copies, available_copies, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 'Available')
      RETURNING *
    `;
    const params = [title, author, category, isbn, cover_image_url, college_id, total_copies];

    const result = await query(sql, params);
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
