import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let sql = 'SELECT t.*, b.title, b.author, b.cover_image_url FROM transactions t JOIN books b ON t.book_id = b.id WHERE 1=1';
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      sql += ` AND t.user_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND t.status = $${params.length}`;
    }

    sql += ' ORDER BY t.borrowed_at DESC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId, bookId, transactionId } = body;

    if (action === 'borrow') {
      // 1. Check book availability
      const bookRes = await query('SELECT available_copies, status FROM books WHERE id = $1', [bookId]);
      if (bookRes.rows.length === 0) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 });
      }
      const book = bookRes.rows[0];
      if (book.available_copies <= 0) {
        return NextResponse.json({ error: 'Book has no available copies' }, { status: 400 });
      }

      // 2. Decrement available copies
      await query(
        `UPDATE books 
         SET available_copies = available_copies - 1, 
             status = CASE WHEN available_copies - 1 = 0 THEN 'Borrowed'::book_status ELSE status END 
         WHERE id = $1`, 
        [bookId]
      );

      // 3. Create transaction record
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14); // 14 days checkout period
      
      const insertTxSql = `
        INSERT INTO transactions (user_id, book_id, due_date, status)
        VALUES ($1, $2, $3, 'borrowed')
        RETURNING *
      `;
      const txRes = await query(insertTxSql, [userId, bookId, dueDate.toISOString()]);
      
      return NextResponse.json(txRes.rows[0], { status: 201 });

    } else if (action === 'return') {
      // 1. Fetch active transaction details
      const txRes = await query('SELECT * FROM transactions WHERE id = $1', [transactionId]);
      if (txRes.rows.length === 0) {
        return NextResponse.json({ error: 'Transaction record not found' }, { status: 404 });
      }
      const transaction = txRes.rows[0];
      if (transaction.returned_at) {
        return NextResponse.json({ error: 'Book already marked returned' }, { status: 400 });
      }

      // 2. Calculate late penalty (10 INR per day)
      const now = new Date();
      const dueDate = new Date(transaction.due_date);
      let penalty = 0.00;
      if (now > dueDate) {
        const diffTime = Math.abs(now.getTime() - dueDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        penalty = diffDays * 10.00;
      }

      // 3. Settle transaction record
      const updatedTxRes = await query(
        `UPDATE transactions 
         SET returned_at = $1, status = 'returned', penalty_amount = $2
         WHERE id = $3 
         RETURNING *`, 
        [now.toISOString(), penalty, transactionId]
      );

      // 4. Update book catalog & check waitlist
      const waitlistRes = await query(
        "SELECT id, user_id FROM waitlists WHERE book_id = $1 AND status = 'waiting' ORDER BY queue_position ASC LIMIT 1",
        [transaction.book_id]
      );

      if (waitlistRes.rows.length > 0) {
        const nextInQueue = waitlistRes.rows[0];
        
        // Notify next user in queue waitlist status to 'notified'
        await query(
          "UPDATE waitlists SET status = 'notified', notified_at = $1 WHERE id = $2",
          [now.toISOString(), nextInQueue.id]
        );

        // Add Notification Alert
        const bookMeta = await query('SELECT title FROM books WHERE id = $1', [transaction.book_id]);
        const bookTitle = bookMeta.rows[0]?.title || 'Waitlisted Book';
        await query(
          `INSERT INTO notifications (user_id, type, title, message)
           VALUES ($1, 'waitlist_alert', 'Waitlist Fulfilled!', $2)`,
          [nextInQueue.user_id, `"${bookTitle}" is returned. You have 24 hours to borrow it.`]
        );
      } else {
        // Increment book copies
        await query(
          `UPDATE books 
           SET available_copies = available_copies + 1, 
               status = 'Available'::book_status
           WHERE id = $1`,
          [transaction.book_id]
        );
      }

      // 5. Award Points (+5 points for returns)
      if (penalty === 0) {
        await query('UPDATE users SET points = points + 5 WHERE id = $1', [userId]);
      }

      return NextResponse.json(updatedTxRes.rows[0]);
    }

    return NextResponse.json({ error: 'Invalid transaction request action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
