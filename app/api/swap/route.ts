import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const sql = `
      SELECT s.*, 
             u_send.full_name as sender_name, 
             u_recv.full_name as receiver_name,
             b_send.title as sender_book_title,
             b_recv.title as receiver_book_title
      FROM swap_requests s
      JOIN users u_send ON s.sender_id = u_send.id
      JOIN users u_recv ON s.receiver_id = u_recv.id
      JOIN books b_send ON s.sender_book_id = b_send.id
      JOIN books b_recv ON s.receiver_book_id = b_recv.id
      WHERE s.sender_id = $1 OR s.receiver_id = $1
      ORDER BY s.created_at DESC
    `;
    const result = await query(sql, [userId]);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, swapId, senderId, receiverId, senderBookId, receiverBookId, status } = body;

    if (action === 'propose') {
      const sql = `
        INSERT INTO swap_requests (sender_id, receiver_id, sender_book_id, receiver_book_id, status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING *
      `;
      const res = await query(sql, [senderId, receiverId, senderBookId, receiverBookId]);
      const newSwap = res.rows[0];

      // Add a notification to the recipient
      const senderMeta = await query('SELECT full_name FROM users WHERE id = $1', [senderId]);
      const senderName = senderMeta.rows[0]?.full_name || 'A peer';
      await query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, 'swap_alert', 'Swap Request Proposed', $2)`,
        [receiverId, `${senderName} wants to swap a book with you. Visit the Swap Lounge.`]
      );

      return NextResponse.json(newSwap, { status: 201 });

    } else if (action === 'respond') {
      const res = await query('SELECT * FROM swap_requests WHERE id = $1', [swapId]);
      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'Swap request not found' }, { status: 404 });
      }
      const swap = res.rows[0];

      // Update swap status
      const updatedRes = await query(
        'UPDATE swap_requests SET status = $1 WHERE id = $2 RETURNING *',
        [status, swapId]
      );
      const updatedSwap = updatedRes.rows[0];

      // Notify the sender
      const receiverMeta = await query('SELECT full_name FROM users WHERE id = $1', [swap.receiver_id]);
      const receiverName = receiverMeta.rows[0]?.full_name || 'A peer';
      await query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, 'swap_alert', 'Swap Request Update', $2)`,
        [swap.sender_id, `Your trade proposal to swap books was ${status} by ${receiverName}.`]
      );

      // If completed, execute inventory ownership transfer and reward points (+20)
      if (status === 'completed') {
        // Swap college ownership values
        const senderBookRes = await query('SELECT college_id FROM books WHERE id = $1', [swap.sender_book_id]);
        const receiverBookRes = await query('SELECT college_id FROM books WHERE id = $1', [swap.receiver_book_id]);

        if (senderBookRes.rows.length > 0 && receiverBookRes.rows.length > 0) {
          const senderColl = senderBookRes.rows[0].college_id;
          const receiverColl = receiverBookRes.rows[0].college_id;

          await query('UPDATE books SET college_id = $1 WHERE id = $2', [receiverColl, swap.sender_book_id]);
          await query('UPDATE books SET college_id = $1 WHERE id = $2', [senderColl, swap.receiver_book_id]);
        }

        // Award +20 points to both users
        await query('UPDATE users SET points = points + 20 WHERE id = $1', [swap.sender_id]);
        await query('UPDATE users SET points = points + 20 WHERE id = $2', [swap.receiver_id]);
      }

      return NextResponse.json(updatedSwap);
    }

    return NextResponse.json({ error: 'Invalid swap request action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
