import { NextResponse } from 'next/server';
import { getDbSafe, mapId } from '../../../lib/mongodb';
import { mockDb } from '../../../lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    const db = await getDbSafe();
    if (!db) {
      let transactions = mockDb.getTransactions();
      const books = mockDb.getBooks();

      if (userId) {
        transactions = transactions.filter(t => t.user_id === userId);
      }
      if (status) {
        transactions = transactions.filter(t => t.status === status);
      }

      const result = transactions.map(t => {
        const book = books.find(b => b.id === t.book_id);
        return {
          ...t,
          title: book ? book.title : 'Unknown Book',
          author: book ? book.author : 'Unknown Author',
          cover_image_url: book ? book.cover_image_url : ''
        };
      });

      result.sort((a, b) => new Date(b.borrowed_at).getTime() - new Date(a.borrowed_at).getTime());
      return NextResponse.json(result);
    }

    const filter: any = {};
    if (userId) {
      filter.user_id = userId;
    }
    if (status) {
      filter.status = status;
    }

    const result = await db.collection('transactions').aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'books',
          localField: 'book_id',
          foreignField: '_id',
          as: 'book'
        }
      },
      { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          user_id: 1,
          book_id: 1,
          borrowed_at: 1,
          due_date: 1,
          returned_at: 1,
          status: 1,
          penalty_amount: 1,
          created_at: 1,
          title: { $ifNull: ['$book.title', 'Unknown Book'] },
          author: { $ifNull: ['$book.author', 'Unknown Author'] },
          cover_image_url: { $ifNull: ['$book.cover_image_url', ''] }
        }
      },
      { $sort: { borrowed_at: -1 } }
    ]).toArray();

    return NextResponse.json(result.map(mapId));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId, bookId, transactionId } = body;

    const db = await getDbSafe();
    if (!db) {
      const books = mockDb.getBooks();
      const transactions = mockDb.getTransactions();
      const users = mockDb.getUsers();
      const notifications = mockDb.getNotifications();
      const waitlists = mockDb.getWaitlist();

      if (action === 'borrow') {
        const bookIndex = books.findIndex(b => b.id === bookId);
        if (bookIndex === -1) {
          return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }
        const book = books[bookIndex];
        if (book.available_copies <= 0) {
          return NextResponse.json({ error: 'Book has no available copies' }, { status: 400 });
        }

        book.available_copies -= 1;
        if (book.available_copies === 0) {
          book.status = 'Borrowed';
        }
        mockDb.saveBooks(books);

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);

        const newTx = {
          id: `t_${Date.now()}`,
          user_id: userId,
          book_id: bookId,
          borrowed_at: new Date().toISOString(),
          due_date: dueDate.toISOString(),
          returned_at: null,
          status: 'borrowed' as const,
          penalty_amount: 0
        };

        mockDb.saveTransactions([...transactions, newTx]);
        return NextResponse.json(newTx, { status: 201 });

      } else if (action === 'return') {
        const txIndex = transactions.findIndex(t => t.id === transactionId);
        if (txIndex === -1) {
          return NextResponse.json({ error: 'Transaction record not found' }, { status: 404 });
        }
        const transaction = transactions[txIndex];
        if (transaction.returned_at) {
          return NextResponse.json({ error: 'Book already marked returned' }, { status: 400 });
        }

        const now = new Date();
        const dueDate = new Date(transaction.due_date);
        let penalty = 0.00;
        if (now > dueDate) {
          const diffTime = Math.abs(now.getTime() - dueDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          penalty = diffDays * 10.00;
        }

        const updatedTx = {
          ...transaction,
          returned_at: now.toISOString(),
          status: 'returned' as const,
          penalty_amount: penalty
        };
        transactions[txIndex] = updatedTx;
        mockDb.saveTransactions(transactions);

        const bookWaitlist = waitlists
          .filter(w => w.book_id === transaction.book_id && w.status === 'waiting')
          .sort((a, b) => a.queue_position - b.queue_position);

        if (bookWaitlist.length > 0) {
          const nextInQueue = bookWaitlist[0];
          nextInQueue.status = 'notified';
          nextInQueue.notified_at = now.toISOString();
          mockDb.saveWaitlist(waitlists);

          const book = books.find(b => b.id === transaction.book_id);
          const bookTitle = book ? book.title : 'Waitlisted Book';
          const newNotif = {
            id: `n_${Date.now()}`,
            user_id: nextInQueue.user_id,
            type: 'waitlist_alert' as const,
            title: 'Waitlist Fulfilled!',
            message: `"${bookTitle}" is returned. You have 24 hours to borrow it.`,
            is_read: false,
            created_at: now.toISOString()
          };
          mockDb.saveNotifications([...notifications, newNotif]);
        } else {
          const book = books.find(b => b.id === transaction.book_id);
          if (book) {
            book.available_copies += 1;
            book.status = 'Available';
            mockDb.saveBooks(books);
          }
        }

        if (penalty === 0) {
          const updatedUsers = users.map(u => {
            if (u.id === userId) {
              return { ...u, points: u.points + 5 };
            }
            return u;
          });
          mockDb.saveUsers(updatedUsers);
        }

        return NextResponse.json(updatedTx);
      }
      return NextResponse.json({ error: 'Invalid transaction request action' }, { status: 400 });
    }

    if (action === 'borrow') {
      const book = await db.collection('books').findOne({ _id: bookId });
      if (!book) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 });
      }
      if (book.available_copies <= 0) {
        return NextResponse.json({ error: 'Book has no available copies' }, { status: 400 });
      }

      const newAvailable = book.available_copies - 1;
      await db.collection('books').updateOne(
        { _id: bookId },
        { 
          $set: { 
            available_copies: newAvailable, 
            status: newAvailable === 0 ? 'Borrowed' : book.status 
          } 
        }
      );

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const newTxDoc = {
        _id: `t_${Date.now()}`,
        user_id: userId,
        book_id: bookId,
        borrowed_at: new Date(),
        due_date: dueDate,
        returned_at: null,
        status: 'borrowed',
        penalty_amount: 0,
        created_at: new Date()
      };

      await db.collection('transactions').insertOne(newTxDoc as any);
      return NextResponse.json(mapId(newTxDoc), { status: 201 });

    } else if (action === 'return') {
      const transaction = await db.collection('transactions').findOne({ _id: transactionId });
      if (!transaction) {
        return NextResponse.json({ error: 'Transaction record not found' }, { status: 404 });
      }
      if (transaction.returned_at) {
        return NextResponse.json({ error: 'Book already marked returned' }, { status: 400 });
      }

      const now = new Date();
      const dueDate = new Date(transaction.due_date);
      let penalty = 0.00;
      if (now > dueDate) {
        const diffTime = Math.abs(now.getTime() - dueDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        penalty = diffDays * 10.00;
      }

      await db.collection('transactions').updateOne(
        { _id: transactionId },
        { $set: { returned_at: now, status: 'returned', penalty_amount: penalty } }
      );
      
      const updatedTx = {
        ...transaction,
        returned_at: now,
        status: 'returned',
        penalty_amount: penalty
      };

      const waitlist = await db.collection('waitlists').find({ 
        book_id: transaction.book_id, 
        status: 'waiting' 
      }).sort({ queue_position: 1 }).limit(1).toArray();

      if (waitlist.length > 0) {
        const nextInQueue = waitlist[0];
        await db.collection('waitlists').updateOne(
          { _id: nextInQueue._id },
          { $set: { status: 'notified', notified_at: now } }
        );

        const book = await db.collection('books').findOne({ _id: transaction.book_id });
        const bookTitle = book?.title || 'Waitlisted Book';

        await db.collection('notifications').insertOne({
          _id: `n_${Date.now()}`,
          user_id: nextInQueue.user_id,
          type: 'waitlist_alert',
          title: 'Waitlist Fulfilled!',
          message: `"${bookTitle}" is returned. You have 24 hours to borrow it.`,
          is_read: false,
          created_at: now
        } as any);
      } else {
        const book = await db.collection('books').findOne({ _id: transaction.book_id });
        if (book) {
          await db.collection('books').updateOne(
            { _id: transaction.book_id },
            { $set: { available_copies: book.available_copies + 1, status: 'Available' } }
          );
        }
      }

      if (penalty === 0) {
        await db.collection('users').updateOne(
          { _id: userId },
          { $inc: { points: 5 } }
        );
      }

      return NextResponse.json(mapId(updatedTx));
    }

    return NextResponse.json({ error: 'Invalid transaction request action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
