import { NextResponse } from 'next/server';
import { getDbSafe, mapId } from '../../../lib/mongodb';
import { mockDb } from '../../../lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    const db = await getDbSafe();
    if (!db) {
      const discussions = mockDb.getDiscussions();
      const users = mockDb.getUsers();
      
      const filtered = discussions
        .filter(d => d.book_id === bookId)
        .map(d => {
          const user = users.find(u => u.id === d.user_id);
          return {
            ...d,
            user_name: user ? user.full_name : 'Unknown User',
            user_avatar: user ? user.avatar_url : ''
          };
        });
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return NextResponse.json(filtered);
    }

    const result = await db.collection('discussions').aggregate([
      { $match: { book_id: bookId } },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          book_id: 1,
          user_id: 1,
          content: 1,
          parent_id: 1,
          created_at: 1,
          user_name: { $ifNull: ['$user.full_name', 'Unknown User'] },
          user_avatar: { $ifNull: ['$user.avatar_url', ''] }
        }
      },
      { $sort: { created_at: 1 } }
    ]).toArray();

    return NextResponse.json(result.map(mapId));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookId, userId, content, parentId } = body;

    const db = await getDbSafe();
    if (!db) {
      const discussions = mockDb.getDiscussions();
      const users = mockDb.getUsers();
      
      const user = users.find(u => u.id === userId);
      const newDisc = {
        id: `d_${Date.now()}`,
        book_id: bookId,
        user_id: userId,
        user_name: user ? user.full_name : 'Unknown User',
        user_avatar: user ? user.avatar_url : '',
        content,
        parent_id: parentId || null,
        created_at: new Date().toISOString()
      };
      
      mockDb.saveDiscussions([...discussions, newDisc]);
      
      const pointsToAward = parentId ? 15 : 5;
      const updatedUsers = users.map(u => {
        if (u.id === userId) {
          return { ...u, points: u.points + pointsToAward };
        }
        return u;
      });
      mockDb.saveUsers(updatedUsers);
      
      return NextResponse.json(newDisc, { status: 201 });
    }

    const newDiscussion = {
      _id: `d_${Date.now()}`,
      book_id: bookId,
      user_id: userId,
      content,
      parent_id: parentId || null,
      created_at: new Date()
    };
    
    await db.collection('discussions').insertOne(newDiscussion as any);
    
    const pointsToAward = parentId ? 15 : 5;
    await db.collection('users').updateOne(
      { _id: userId },
      { $inc: { points: pointsToAward } }
    );
    
    return NextResponse.json(mapId(newDiscussion), { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
