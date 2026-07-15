import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    const sql = `
      SELECT r.*, u.full_name as user_name 
      FROM reviews r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.book_id = $1 
      ORDER BY r.created_at DESC
    `;
    const result = await query(sql, [bookId]);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookId, userId, rating, comment } = body;

    const sql = `
      INSERT INTO reviews (book_id, user_id, rating, comment, points_awarded)
      VALUES ($1, $2, $3, $4, 10)
      RETURNING *
    `;
    const result = await query(sql, [bookId, userId, rating, comment]);
    const review = result.rows[0];

    // Award +10 points
    await query('UPDATE users SET points = points + 10 WHERE id = $1', [userId]);

    return NextResponse.json(review, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
