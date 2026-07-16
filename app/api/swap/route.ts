import { NextResponse } from 'next/server';
import { getDbSafe, mapId } from '../../../lib/mongodb';
import { mockDb } from '../../../lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const db = await getDbSafe();
    if (!db) {
      const swaps = mockDb.getSwapRequests();
      const users = mockDb.getUsers();
      const books = mockDb.getBooks();
      
      const filtered = swaps
        .filter(s => s.sender_id === userId || s.receiver_id === userId)
        .map(s => {
          const sender = users.find(u => u.id === s.sender_id);
          const receiver = users.find(u => u.id === s.receiver_id);
          const senderBook = books.find(b => b.id === s.sender_book_id);
          const receiverBook = books.find(b => b.id === s.receiver_book_id);
          return {
            ...s,
            sender_name: sender ? sender.full_name : 'Unknown User',
            receiver_name: receiver ? receiver.full_name : 'Unknown User',
            sender_book_title: senderBook ? senderBook.title : 'Unknown Book',
            receiver_book_title: receiverBook ? receiverBook.title : 'Unknown Book'
          };
        });
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return NextResponse.json(filtered);
    }

    const result = await db.collection('swap_requests').aggregate([
      { $match: { $or: [{ sender_id: userId }, { receiver_id: userId }] } },
      {
        $lookup: {
          from: 'users',
          localField: 'sender_id',
          foreignField: '_id',
          as: 'sender'
        }
      },
      { $unwind: { path: '$sender', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'receiver_id',
          foreignField: '_id',
          as: 'receiver'
        }
      },
      { $unwind: { path: '$receiver', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'books',
          localField: 'sender_book_id',
          foreignField: '_id',
          as: 'sender_book'
        }
      },
      { $unwind: { path: '$sender_book', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'books',
          localField: 'receiver_book_id',
          foreignField: '_id',
          as: 'receiver_book'
        }
      },
      { $unwind: { path: '$receiver_book', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          sender_id: 1,
          receiver_id: 1,
          sender_book_id: 1,
          receiver_book_id: 1,
          status: 1,
          created_at: 1,
          sender_name: { $ifNull: ['$sender.full_name', 'Unknown User'] },
          receiver_name: { $ifNull: ['$receiver.full_name', 'Unknown User'] },
          sender_book_title: { $ifNull: ['$sender_book.title', 'Unknown Book'] },
          receiver_book_title: { $ifNull: ['$receiver_book.title', 'Unknown Book'] }
        }
      },
      { $sort: { created_at: -1 } }
    ]).toArray();

    return NextResponse.json(result.map(mapId));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, swapId, senderId, receiverId, senderBookId, receiverBookId, status } = body;

    const db = await getDbSafe();

    if (!db) {
      const swaps = mockDb.getSwapRequests();
      const users = mockDb.getUsers();
      const notifications = mockDb.getNotifications();
      const books = mockDb.getBooks();

      if (action === 'propose') {
        const newSwap = {
          id: `s_${Date.now()}`,
          sender_id: senderId,
          receiver_id: receiverId,
          sender_book_id: senderBookId,
          receiver_book_id: receiverBookId,
          status: 'pending' as const,
          created_at: new Date().toISOString()
        };
        mockDb.saveSwapRequests([...swaps, newSwap]);

        const sender = users.find(u => u.id === senderId);
        const senderName = sender ? sender.full_name : 'A peer';
        
        const newNotif = {
          id: `n_${Date.now()}`,
          user_id: receiverId,
          type: 'swap_alert' as const,
          title: 'Swap Request Proposed',
          message: `${senderName} wants to swap a book with you. Visit the Swap Lounge.`,
          is_read: false,
          created_at: new Date().toISOString()
        };
        mockDb.saveNotifications([...notifications, newNotif]);
        return NextResponse.json(newSwap, { status: 201 });

      } else if (action === 'respond') {
        const swapIndex = swaps.findIndex(s => s.id === swapId);
        if (swapIndex === -1) {
          return NextResponse.json({ error: 'Swap request not found' }, { status: 404 });
        }
        const swap = swaps[swapIndex];
        const updatedSwap = { ...swap, status };
        swaps[swapIndex] = updatedSwap;
        mockDb.saveSwapRequests(swaps);

        const receiver = users.find(u => u.id === swap.receiver_id);
        const receiverName = receiver ? receiver.full_name : 'A peer';

        const newNotif = {
          id: `n_${Date.now()}`,
          user_id: swap.sender_id,
          type: 'swap_alert' as const,
          title: 'Swap Request Update',
          message: `Your trade proposal to swap books was ${status} by ${receiverName}.`,
          is_read: false,
          created_at: new Date().toISOString()
        };
        mockDb.saveNotifications([...notifications, newNotif]);

        if (status === 'completed') {
          const senderBook = books.find(b => b.id === swap.sender_book_id);
          const receiverBook = books.find(b => b.id === swap.receiver_book_id);
          if (senderBook && receiverBook) {
            const senderColl = senderBook.college_id;
            const receiverColl = receiverBook.college_id;
            senderBook.college_id = receiverColl;
            receiverBook.college_id = senderColl;
            mockDb.saveBooks(books);
          }

          const updatedUsers = users.map(u => {
            if (u.id === swap.sender_id || u.id === swap.receiver_id) {
              return { ...u, points: u.points + 20 };
            }
            return u;
          });
          mockDb.saveUsers(updatedUsers);
        }

        return NextResponse.json(updatedSwap);
      }
      return NextResponse.json({ error: 'Invalid swap request action' }, { status: 400 });
    }

    if (action === 'propose') {
      const newSwapDoc = {
        _id: `s_${Date.now()}`,
        sender_id: senderId,
        receiver_id: receiverId,
        sender_book_id: senderBookId,
        receiver_book_id: receiverBookId,
        status: 'pending',
        created_at: new Date()
      };
      await db.collection('swap_requests').insertOne(newSwapDoc as any);

      // Add a notification to the recipient
      const sender = await db.collection('users').findOne({ _id: senderId });
      const senderName = sender?.full_name || 'A peer';
      await db.collection('notifications').insertOne({
        _id: `n_${Date.now()}`,
        user_id: receiverId,
        type: 'swap_alert',
        title: 'Swap Request Proposed',
        message: `${senderName} wants to swap a book with you. Visit the Swap Lounge.`,
        is_read: false,
        created_at: new Date()
      } as any);

      return NextResponse.json(mapId(newSwapDoc), { status: 201 });

    } else if (action === 'respond') {
      const swap = await db.collection('swap_requests').findOne({ _id: swapId });
      if (!swap) {
        return NextResponse.json({ error: 'Swap request not found' }, { status: 404 });
      }

      // Update swap status
      await db.collection('swap_requests').updateOne(
        { _id: swapId },
        { $set: { status } }
      );
      const updatedSwap = { ...swap, status };

      // Notify the sender
      const receiver = await db.collection('users').findOne({ _id: swap.receiver_id });
      const receiverName = receiver?.full_name || 'A peer';
      await db.collection('notifications').insertOne({
        _id: `n_${Date.now()}`,
        user_id: swap.sender_id,
        type: 'swap_alert',
        title: 'Swap Request Update',
        message: `Your trade proposal to swap books was ${status} by ${receiverName}.`,
        is_read: false,
        created_at: new Date()
      } as any);

      // If completed, execute inventory ownership transfer and reward points (+20)
      if (status === 'completed') {
        const senderBook = await db.collection('books').findOne({ _id: swap.sender_book_id });
        const receiverBook = await db.collection('books').findOne({ _id: swap.receiver_book_id });

        if (senderBook && receiverBook) {
          await db.collection('books').updateOne(
            { _id: swap.sender_book_id },
            { $set: { college_id: receiverBook.college_id } }
          );
          await db.collection('books').updateOne(
            { _id: swap.receiver_book_id },
            { $set: { college_id: senderBook.college_id } }
          );
        }

        // Award +20 points to both users
        await db.collection('users').updateMany(
          { _id: { $in: [swap.sender_id, swap.receiver_id] } },
          { $inc: { points: 20 } }
        );
      }

      return NextResponse.json(mapId(updatedSwap));
    }

    return NextResponse.json({ error: 'Invalid swap request action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
