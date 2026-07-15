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
      SELECT d.*, u.full_name as user_name, u.avatar_url as user_avatar 
      FROM discussions d 
      JOIN users u ON d.user_id = u.id 
      WHERE d.book_id = $1 
      ORDER BY d.created_at ASC
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
    const { bookId, userId, content, parentId } = body;

    const sql = `
      INSERT INTO discussions (book_id, user_id, content, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await query(sql, [bookId, userId, content, parentId || null]);
    const comment = result.rows[0];

    // Award points
    if (parentId) {
      await query('UPDATE users SET points = points + 15 WHERE id = $1', [userId]); // Answerer
    } else {
      await query('UPDATE users SET points = points + 5 WHERE id = $1', [userId]); // Questioner
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
