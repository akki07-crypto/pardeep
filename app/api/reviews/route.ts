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
      const reviews = mockDb.getReviews();
      const users = mockDb.getUsers();
      
      const filtered = reviews
        .filter(r => r.book_id === bookId)
        .map(r => {
          const user = users.find(u => u.id === r.user_id);
          return {
            ...r,
            user_name: user ? user.full_name : 'Unknown User'
          };
        });
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return NextResponse.json(filtered);
    }

    const result = await db.collection('reviews').aggregate([
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
          rating: 1,
          comment: 1,
          points_awarded: 1,
          created_at: 1,
          user_name: { $ifNull: ['$user.full_name', 'Unknown User'] }
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
    const { bookId, userId, rating, comment } = body;

    const db = await getDbSafe();
    if (!db) {
      const reviews = mockDb.getReviews();
      const users = mockDb.getUsers();
      
      const user = users.find(u => u.id === userId);
      const newReview = {
        id: `r_${Date.now()}`,
        book_id: bookId,
        user_id: userId,
        user_name: user ? user.full_name : 'Unknown User',
        rating: Number(rating),
        comment,
        points_awarded: 10,
        created_at: new Date().toISOString()
      };
      
      mockDb.saveReviews([...reviews, newReview]);
      
      const updatedUsers = users.map(u => {
        if (u.id === userId) {
          return { ...u, points: u.points + 10 };
        }
        return u;
      });
      mockDb.saveUsers(updatedUsers);
      
      return NextResponse.json(newReview, { status: 201 });
    }

    const newReviewDoc = {
      _id: `r_${Date.now()}`,
      book_id: bookId,
      user_id: userId,
      rating: Number(rating),
      comment,
      points_awarded: 10,
      created_at: new Date()
    };
    
    await db.collection('reviews').insertOne(newReviewDoc as any);
    
    // Award +10 points
    await db.collection('users').updateOne(
      { _id: userId },
      { $inc: { points: 10 } }
    );

    return NextResponse.json(mapId(newReviewDoc), { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
