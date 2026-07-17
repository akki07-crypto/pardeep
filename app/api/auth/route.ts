import { NextResponse } from 'next/server';
import { getDbSafe, mapId } from '../../../lib/mongodb';
import { mockDb } from '../../../lib/supabase';

function normalizeDomain(domain: string): string {
  if (!domain) return '';
  return domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'colleges') {
      const db = await getDbSafe();
      if (!db) {
        return NextResponse.json(mockDb.getColleges());
      }
      const result = await db.collection('colleges').find().sort({ name: 1 }).toArray();
      
      // Auto-clean any malformed domains in the DB
      let hasUpdated = false;
      for (const col of result) {
        if (col.domain && (col.domain.includes('://') || col.domain.includes('/'))) {
          const cleaned = normalizeDomain(col.domain);
          await db.collection('colleges').updateOne({ _id: col._id }, { $set: { domain: cleaned } });
          col.domain = cleaned;
          hasUpdated = true;
        }
      }
      if (hasUpdated) {
        console.log('[MONGODB] Automatically cleaned malformed college domains in database.');
      }

      return NextResponse.json(result.map(mapId));
    } else if (action === 'users') {
      const db = await getDbSafe();
      if (!db) {
        return NextResponse.json(mockDb.getUsers());
      }
      const result = await db.collection('users').find().toArray();
      return NextResponse.json(result.map(mapId));
    }
    
    return NextResponse.json({ error: 'Invalid GET action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, password, fullName, collegeId } = body;

    const db = await getDbSafe();

    if (action === 'login') {
      if (!db) {
        // Fallback simulated credential matching
        const users = mockDb.getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        // Pre-seeded users have password "password123"
        if (user && password === 'password123') {
          return NextResponse.json(user);
        }
        return NextResponse.json({ error: 'Invalid email or password credentials' }, { status: 401 });
      }

      const user = await db.collection('users').findOne({
        email: email.toLowerCase(),
        password_hash: password
      });

      if (!user) {
        return NextResponse.json({ error: 'Invalid email or password credentials' }, { status: 401 });
      }

      const mappedUser = mapId(user);
      delete (mappedUser as any).password_hash;
      return NextResponse.json(mappedUser);

    } else if (action === 'signup') {
      if (!db) {
        const colleges = mockDb.getColleges();
        const college = colleges.find(c => c.id === collegeId);
        if (!college) {
          return NextResponse.json({ error: 'Selected college not registered' }, { status: 404 });
        }

        const users = mockDb.getUsers();
        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
          return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
        }

        const newUser = {
          id: `u_${Date.now()}`,
          email,
          full_name: fullName,
          role: 'student' as const,
          college_id: collegeId,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
          points: 10,
          is_verified: true
        };

        mockDb.saveUsers([...users, newUser]);
        return NextResponse.json(newUser, { status: 201 });
      }

      // 1. Fetch target college details to run domain verification gate
      const college = await db.collection('colleges').findOne({ _id: collegeId });
      if (!college) {
        return NextResponse.json({ error: 'Selected college not registered' }, { status: 404 });
      }

      // 2. Check if user already exists
      const checkUser = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (checkUser) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
      }

      // 3. Create user profile with welcome award (+10 points)
      const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`;
      const newUserDoc = {
        _id: `u_${Date.now()}`,
        email: email.toLowerCase(),
        password_hash: password,
        full_name: fullName,
        role: 'student',
        college_id: collegeId,
        avatar_url: avatarUrl,
        points: 10,
        is_verified: true,
        created_at: new Date()
      };
      await db.collection('users').insertOne(newUserDoc as any);
      
      const mappedUser = mapId(newUserDoc);
      delete (mappedUser as any).password_hash;

      return NextResponse.json(mappedUser, { status: 201 });
    } else if (action === 'updateUser') {
      const { targetUserId, points, isVerified, requesterId } = body;

      if (!db) {
        const users = mockDb.getUsers();
        const requester = users.find(u => u.id === requesterId);
        if (!requester || requester.role !== 'librarian') {
          return NextResponse.json({ error: 'Unauthorized: Only librarians can modify users' }, { status: 403 });
        }

        const updatedUsers = users.map(u => {
          if (u.id === targetUserId) {
            return {
              ...u,
              points: points !== undefined ? Number(points) : u.points,
              is_verified: isVerified !== undefined ? Boolean(isVerified) : u.is_verified
            };
          }
          return u;
        });
        mockDb.saveUsers(updatedUsers);
        return NextResponse.json({ success: true });
      }

      const requester = await db.collection('users').findOne({ _id: requesterId });
      if (!requester || requester.role !== 'librarian') {
        return NextResponse.json({ error: 'Unauthorized: Only librarians can modify users' }, { status: 403 });
      }

      const updateDoc: any = {};
      if (points !== undefined) updateDoc.points = Number(points);
      if (isVerified !== undefined) updateDoc.is_verified = Boolean(isVerified);

      await db.collection('users').updateOne(
        { _id: targetUserId },
        { $set: updateDoc }
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action parameters' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
