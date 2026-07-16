import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_hub';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Set up connection options
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 2000
  });

  await client.connect();
  const db = client.db();

  cachedClient = client;
  cachedDb = db;

  // Run automatic seeding if DB is empty
  await seedDatabase(db);

  return { client, db };
}

export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

export async function getDbSafe(): Promise<Db | null> {
  try {
    const db = await getDb();
    return db;
  } catch (err) {
    console.warn('[MONGODB] Failed to connect to MongoDB. Falling back to simulation mode.', err);
    return null;
  }
}

// Map MongoDB _id to string id to match the schema & frontend interfaces
export function mapId<T extends { _id?: any; id?: any }>(doc: T): Omit<T, '_id'> & { id: string } {
  if (!doc) return doc as any;
  const { _id, ...rest } = doc;
  return {
    ...rest,
    id: _id?.toString() || rest.id
  } as any;
}

async function seedDatabase(db: Db) {
  const collegesCol = db.collection('colleges');
  const count = await collegesCol.countDocuments();

  // 1. Colleges
  const colleges = [
    {
      _id: 'c1000000-0000-0000-0000-000000000001',
      name: 'IIT Delhi',
      domain: 'iitd.ac.in',
      subdomain_prefix: 'iitd',
      logo_url: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&auto=format&fit=crop&q=60',
      created_at: new Date()
    },
    {
      _id: 'c2000000-0000-0000-0000-000000000002',
      name: 'IIT Bombay',
      domain: 'iitb.ac.in',
      subdomain_prefix: 'iitb',
      logo_url: 'https://images.unsplash.com/photo-1562774053-401386dfdf8f?w=100&auto=format&fit=crop&q=60',
      created_at: new Date()
    },
    {
      _id: 'c3000000-0000-0000-0000-000000000003',
      name: 'BITS Pilani',
      domain: 'bits-pilani.ac.in',
      subdomain_prefix: 'bits',
      logo_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=100&auto=format&fit=crop&q=60',
      created_at: new Date()
    },
    {
      _id: 'c1000000-0000-0000-0000-000000000004',
      name: 'Government College, Hoshiarpur',
      domain: 'gchoshiarpur.ac.in',
      subdomain_prefix: 'gchp',
      logo_url: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&auto=format&fit=crop&q=60',
      created_at: new Date()
    },
    {
      _id: 'c1000000-0000-0000-0000-000000000005',
      name: 'DAV College, Hoshiarpur',
      domain: 'davhoshiarpur.org',
      subdomain_prefix: 'davh',
      logo_url: 'https://images.unsplash.com/photo-1562774053-401386dfdf8f?w=100&auto=format&fit=crop&q=60',
      created_at: new Date()
    },
    {
      _id: 'c1000000-0000-0000-0000-000000000006',
      name: 'S.D. College, Hoshiarpur',
      domain: 'sdcollegehsp.org',
      subdomain_prefix: 'sdch',
      logo_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=100&auto=format&fit=crop&q=60',
      created_at: new Date()
    }
  ];

  if (count > 0) {
    for (const c of colleges) {
      await collegesCol.updateOne({ _id: c._id as any }, { $set: c as any }, { upsert: true });
    }
    console.log('[MONGODB] Database already seeded. Syncing/Upserting colleges list.');
    return;
  }

  console.log('[MONGODB] Seeding database with initial academic hub records...');
  await collegesCol.insertMany(colleges as any);

  // 2. Users
  const users = [
    {
      _id: 'u1000000-0000-0000-0000-000000000001',
      email: 'rahul.sharma@iitd.ac.in',
      password_hash: 'password123',
      full_name: 'Rahul Sharma',
      role: 'student',
      college_id: 'c1000000-0000-0000-0000-000000000001',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul',
      points: 155,
      is_verified: true,
      created_at: new Date()
    },
    {
      _id: 'u2000000-0000-0000-0000-000000000002',
      email: 'priya.nair@iitb.ac.in',
      password_hash: 'password123',
      full_name: 'Priya Nair',
      role: 'student',
      college_id: 'c2000000-0000-0000-0000-000000000002',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
      points: 340,
      is_verified: true,
      created_at: new Date()
    },
    {
      _id: 'u3000000-0000-0000-0000-000000000003',
      email: 'aarav.mehta@bits-pilani.ac.in',
      password_hash: 'password123',
      full_name: 'Aarav Mehta',
      role: 'student',
      college_id: 'c3000000-0000-0000-0000-000000000003',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav',
      points: 80,
      is_verified: true,
      created_at: new Date()
    },
    {
      _id: 'u4000000-0000-0000-0000-000000000004',
      email: 'amit.sen@iitd.ac.in',
      password_hash: 'password123',
      full_name: 'Dr. Amit Sen',
      role: 'librarian',
      college_id: 'c1000000-0000-0000-0000-000000000001',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amit',
      points: 10,
      is_verified: true,
      created_at: new Date()
    },
    {
      _id: 'u5000000-0000-0000-0000-000000000005',
      email: 'gagan.singh@gchoshiarpur.ac.in',
      password_hash: 'password123',
      full_name: 'Gagan Singh',
      role: 'student',
      college_id: 'c1000000-0000-0000-0000-000000000004',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gagan',
      points: 120,
      is_verified: true,
      created_at: new Date()
    },
    {
      _id: 'u6000000-0000-0000-0000-000000000006',
      email: 'mehak.sharma@davhoshiarpur.org',
      password_hash: 'password123',
      full_name: 'Mehak Sharma',
      role: 'student',
      college_id: 'c1000000-0000-0000-0000-000000000005',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mehak',
      points: 210,
      is_verified: true,
      created_at: new Date()
    },
    {
      _id: 'u7000000-0000-0000-0000-000000000007',
      email: 'rohan.gupta@sdcollegehsp.org',
      password_hash: 'password123',
      full_name: 'Rohan Gupta',
      role: 'student',
      college_id: 'c1000000-0000-0000-0000-000000000006',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan',
      points: 95,
      is_verified: true,
      created_at: new Date()
    }
  ];
  await db.collection('users').insertMany(users as any);

  // 3. Books
  const books = [
    {
      _id: 'b1000000-0000-0000-0000-000000000001',
      title: 'Introduction to Algorithms',
      author: 'Thomas H. Cormen',
      category: 'Academic',
      isbn: '978-0262033848',
      cover_image_url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&auto=format&fit=crop&q=80',
      college_id: 'c1000000-0000-0000-0000-000000000001',
      total_copies: 3,
      available_copies: 2,
      status: 'Available',
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      _id: 'b2000000-0000-0000-0000-000000000002',
      title: 'Cracking the Coding Interview',
      author: 'Gayle Laakmann McDowell',
      category: 'Competitive',
      isbn: '978-0984782857',
      cover_image_url: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=400&auto=format&fit=crop&q=80',
      college_id: 'c1000000-0000-0000-0000-000000000001',
      total_copies: 2,
      available_copies: 2,
      status: 'Available',
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    },
    {
      _id: 'b3000000-0000-0000-0000-000000000003',
      title: 'Introduction to Algorithms',
      author: 'Thomas H. Cormen',
      category: 'Academic',
      isbn: '978-0262033848',
      cover_image_url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&auto=format&fit=crop&q=80',
      college_id: 'c3000000-0000-0000-0000-000000000003',
      total_copies: 1,
      available_copies: 0,
      status: 'Borrowed',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    {
      _id: 'b4000000-0000-0000-0000-000000000004',
      title: 'The Amazing Spider-Man: Volume 1',
      author: 'Stan Lee',
      category: 'Comics',
      isbn: '978-0785185031',
      cover_image_url: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&auto=format&fit=crop&q=80',
      college_id: 'c2000000-0000-0000-0000-000000000002',
      total_copies: 1,
      available_copies: 0,
      status: 'In-Transit',
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    },
    {
      _id: 'b5000000-0000-0000-0000-000000000005',
      title: 'The Amazing Spider-Man: Volume 1',
      author: 'Stan Lee',
      category: 'Comics',
      isbn: '978-0785185031',
      cover_image_url: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&auto=format&fit=crop&q=80',
      college_id: 'c3000000-0000-0000-0000-000000000003',
      total_copies: 2,
      available_copies: 2,
      status: 'Available',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      _id: 'b6000000-0000-0000-0000-000000000006',
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      category: 'Novels',
      isbn: '978-0446310789',
      cover_image_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&auto=format&fit=crop&q=80',
      college_id: 'c1000000-0000-0000-0000-000000000001',
      total_copies: 1,
      available_copies: 0,
      status: 'Borrowed',
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    },
    {
      _id: 'b7000000-0000-0000-0000-000000000007',
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      category: 'Novels',
      isbn: '978-0446310789',
      cover_image_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&auto=format&fit=crop&q=80',
      college_id: 'c2000000-0000-0000-0000-000000000002',
      total_copies: 2,
      available_copies: 2,
      status: 'Available',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    {
      _id: 'b8000000-0000-0000-0000-000000000008',
      title: 'Discrete Mathematics and its Applications',
      author: 'Kenneth H. Rosen',
      category: 'Academic',
      isbn: '978-0073383095',
      cover_image_url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&auto=format&fit=crop&q=80',
      college_id: 'c1000000-0000-0000-0000-000000000001',
      total_copies: 1,
      available_copies: 0,
      status: 'Borrowed',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      _id: 'b9000000-0000-0000-0000-000000000009',
      title: 'Discrete Mathematics and its Applications',
      author: 'Kenneth H. Rosen',
      category: 'Academic',
      isbn: '978-0073383095',
      cover_image_url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&auto=format&fit=crop&q=80',
      college_id: 'c1000000-0000-0000-0000-000000000004',
      total_copies: 2,
      available_copies: 2,
      status: 'Available',
      created_at: new Date()
    },
    {
      _id: 'b1000000-0000-0000-0000-000000000010',
      title: 'Introduction to Algorithms',
      author: 'Thomas H. Cormen',
      category: 'Academic',
      isbn: '978-0262033848',
      cover_image_url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&auto=format&fit=crop&q=80',
      college_id: 'c1000000-0000-0000-0000-000000000005',
      total_copies: 2,
      available_copies: 2,
      status: 'Available',
      created_at: new Date()
    },
    {
      _id: 'b1100000-0000-0000-0000-000000000011',
      title: 'Cracking the Coding Interview',
      author: 'Gayle Laakmann McDowell',
      category: 'Competitive',
      isbn: '978-0984782857',
      cover_image_url: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=400&auto=format&fit=crop&q=80',
      college_id: 'c1000000-0000-0000-0000-000000000006',
      total_copies: 2,
      available_copies: 2,
      status: 'Available',
      created_at: new Date()
    }
  ];
  await db.collection('books').insertMany(books as any);

  // 4. Transactions
  const transactions = [
    {
      _id: 't1',
      user_id: 'u1000000-0000-0000-0000-000000000001',
      book_id: 'b8000000-0000-0000-0000-000000000008',
      borrowed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      due_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      returned_at: null,
      status: 'overdue',
      penalty_amount: 30,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      _id: 't2',
      user_id: 'u2000000-0000-0000-0000-000000000002',
      book_id: 'b4000000-0000-0000-0000-000000000004',
      borrowed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      returned_at: null,
      status: 'borrowed',
      penalty_amount: 0,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  ];
  await db.collection('transactions').insertMany(transactions as any);

  // 5. Discussions
  const discussions = [
    {
      _id: 'd1',
      book_id: 'b1000000-0000-0000-0000-000000000001',
      user_id: 'u1000000-0000-0000-0000-000000000001',
      content: 'What chapters are best to read for dynamic programming algorithms?',
      parent_id: null,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      _id: 'd2',
      book_id: 'b1000000-0000-0000-0000-000000000001',
      user_id: 'u4000000-0000-0000-0000-000000000004',
      content: 'Definitely read Chapter 15. It gives an excellent breakdown of matrices, rod cutting, and LCS problems.',
      parent_id: 'd1',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      _id: 'd3',
      book_id: 'b8000000-0000-0000-0000-000000000008',
      user_id: 'u1000000-0000-0000-0000-000000000001',
      content: 'Does anyone understand recurrence relations in Chapter 8? The induction steps feel rushed.',
      parent_id: null,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  ];
  await db.collection('discussions').insertMany(discussions as any);

  // 6. Reviews
  const reviews = [
    {
      _id: 'r1',
      book_id: 'b1000000-0000-0000-0000-000000000001',
      user_id: 'u2000000-0000-0000-0000-000000000002',
      rating: 5,
      comment: 'The bible of computer algorithms. Very detailed and rigorous proof mechanics!',
      points_awarded: 10,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      _id: 'r2',
      book_id: 'b2000000-0000-0000-0000-000000000002',
      user_id: 'u1000000-0000-0000-0000-000000000001',
      rating: 4,
      comment: 'Great compilation of interview style questions. The solutions walkthroughs are clear and explain trade-offs well.',
      points_awarded: 10,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    }
  ];
  await db.collection('reviews').insertMany(reviews as any);

  // 7. Notifications
  const notifications = [
    {
      _id: 'n1',
      user_id: 'u1000000-0000-0000-0000-000000000001',
      type: 'penalty_alert',
      title: 'Late Return Warning',
      message: 'Discrete Mathematics is overdue by 3 days. A fine of 30 INR has been applied.',
      is_read: false,
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000)
    }
  ];
  await db.collection('notifications').insertMany(notifications as any);

  console.log('[MONGODB] Seeding completed.');
}
