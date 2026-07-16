import { NextResponse } from 'next/server';
import { getDbSafe, mapId } from '../../../lib/mongodb';
import { mockDb } from '../../../lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const collegeId = searchParams.get('collegeId');
    const search = searchParams.get('search');

    const db = await getDbSafe();
    if (!db) {
      let books = mockDb.getBooks();
      if (category && category !== 'All') {
        books = books.filter(b => b.category === category);
      }
      if (collegeId && collegeId !== 'All') {
        books = books.filter(b => b.college_id === collegeId);
      }
      if (search) {
        const queryStr = search.toLowerCase();
        books = books.filter(b => b.title.toLowerCase().includes(queryStr) || b.author.toLowerCase().includes(queryStr));
      }
      return NextResponse.json(books);
    }

    const filter: any = {};
    if (category && category !== 'All') {
      filter.category = category;
    }
    if (collegeId && collegeId !== 'All') {
      filter.college_id = collegeId;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }

    const result = await db.collection('books').find(filter).sort({ created_at: -1 }).toArray();
    return NextResponse.json(result.map(mapId));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, author, category, isbn, cover_image_url, college_id, total_copies } = body;

    const db = await getDbSafe();
    if (!db) {
      const books = mockDb.getBooks();
      const newBook = {
        id: `b_${Date.now()}`,
        title,
        author,
        category: category as any,
        isbn,
        cover_image_url,
        college_id,
        total_copies: Number(total_copies),
        available_copies: Number(total_copies),
        status: 'Available' as const
      };
      mockDb.saveBooks([...books, newBook]);
      return NextResponse.json(newBook, { status: 201 });
    }

    const newBookDoc = {
      _id: `b_${Date.now()}`,
      title,
      author,
      category,
      isbn,
      cover_image_url,
      college_id,
      total_copies: Number(total_copies),
      available_copies: Number(total_copies),
      status: 'Available',
      created_at: new Date()
    };

    await db.collection('books').insertOne(newBookDoc as any);
    return NextResponse.json(mapId(newBookDoc), { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
