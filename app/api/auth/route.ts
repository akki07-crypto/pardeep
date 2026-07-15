import { NextResponse } from 'next/server';
import { query, pool } from '../../../lib/db';
import { mockDb } from '../../../lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'colleges') {
      if (!pool) {
        return NextResponse.json(mockDb.getColleges());
      }
      const result = await query('SELECT * FROM colleges ORDER BY name ASC');
      return NextResponse.json(result.rows);
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

    if (action === 'login') {
      if (!pool) {
        // Fallback simulated credential matching
        const users = mockDb.getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        // Pre-seeded users have password "password123"
        if (user && password === 'password123') {
          return NextResponse.json(user);
        }
        return NextResponse.json({ error: 'Invalid email or password credentials' }, { status: 401 });
      }

      const userRes = await query(
        'SELECT * FROM users WHERE email = $1 AND password_hash = $2',
        [email, password]
      );

      if (userRes.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid email or password credentials' }, { status: 401 });
      }

      const user = userRes.rows[0];
      delete user.password_hash;
      return NextResponse.json(user);

    } else if (action === 'signup') {
      if (!pool) {
        const colleges = mockDb.getColleges();
        const college = colleges.find(c => c.id === collegeId);
        if (!college) {
          return NextResponse.json({ error: 'Selected college not registered' }, { status: 404 });
        }

        const emailDomain = email.split('@')[1];
        if (emailDomain.toLowerCase() !== college.domain.toLowerCase()) {
          return NextResponse.json(
            { error: `Verification Gate: Sign up requires a valid institutional email domain matching *@${college.domain}` },
            { status: 400 }
          );
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
      const collegeRes = await query('SELECT * FROM colleges WHERE id = $1', [collegeId]);
      if (collegeRes.rows.length === 0) {
        return NextResponse.json({ error: 'Selected college not registered' }, { status: 404 });
      }
      
      const college = collegeRes.rows[0];
      const emailDomain = email.split('@')[1];

      // Verification Gate check
      if (emailDomain.toLowerCase() !== college.domain.toLowerCase()) {
        return NextResponse.json(
          { error: `Verification Gate: Sign up requires a valid institutional email domain matching *@${college.domain}` },
          { status: 400 }
        );
      }

      // 2. Check if user already exists
      const checkRes = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (checkRes.rows.length > 0) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
      }

      // 3. Create user profile with welcome award (+10 points)
      const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`;
      const signupSql = `
        INSERT INTO users (email, password_hash, full_name, role, college_id, avatar_url, points, is_verified)
        VALUES ($1, $2, $3, 'student', $4, $5, 10, true)
        RETURNING *
      `;
      const signupParams = [email, password, fullName, collegeId, avatarUrl];
      const signupRes = await query(signupSql, signupParams);
      
      const newUser = signupRes.rows[0];
      delete newUser.password_hash;

      return NextResponse.json(newUser, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action parameters' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
