import { NextResponse } from 'next/server';
import { getDbSafe } from '../../../lib/mongodb';
import { mockDb } from '../../../lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, userId, history } = body;

    let user: any = null;
    let activeBorrowsList: any[] = [];

    const db = await getDbSafe();

    if (db) {
      user = await db.collection('users').findOne({ _id: userId });
      if (user) {
        const college = await db.collection('colleges').findOne({ _id: user.college_id });
        user.college_name = college ? college.name : 'Unknown College';
      }

      activeBorrowsList = await db.collection('transactions').aggregate([
        { $match: { user_id: userId, returned_at: null } },
        {
          $lookup: {
            from: 'books',
            localField: 'book_id',
            foreignField: '_id',
            as: 'book'
          }
        },
        { $unwind: '$book' },
        {
          $project: {
            due_date: 1,
            penalty_amount: 1,
            title: '$book.title'
          }
        }
      ]).toArray();
    } else {
      // Fallback simulated data gathering
      const users = mockDb.getUsers();
      const mockUser = users.find(u => u.id === userId);
      if (mockUser) {
        const colleges = mockDb.getColleges();
        const college = colleges.find(c => c.id === mockUser.college_id);
        user = {
          ...mockUser,
          college_name: college ? college.name : 'Unknown College'
        };
      }

      const transactions = mockDb.getTransactions();
      const books = mockDb.getBooks();
      activeBorrowsList = transactions
        .filter(t => t.user_id === userId && !t.returned_at)
        .map(t => {
          const book = books.find(b => b.id === t.book_id);
          return {
            due_date: t.due_date,
            penalty_amount: t.penalty_amount,
            title: book ? book.title : 'Unknown Book'
          };
        });
    }

    // Build comprehensive system prompt with library guidelines
    const systemPrompt = `
You are the AI Assistant for the Smart Academic Hub Library.
Current User Profile:
- Name: ${user ? user.full_name : 'Anonymous Student'}
- College: ${user ? user.college_name : 'Unknown College'}
- Contributor Points: ${user ? user.points : 0} Pts
- Active Borrows: ${activeBorrowsList.length === 0 ? 'None' : activeBorrowsList.map(b => `"${b.title}" (Due: ${new Date(b.due_date).toLocaleDateString()}, Overdue Fine: ${b.penalty_amount} INR)`).join(', ')}

Library Guidelines & Frequently Asked Questions:
1. Timings & Working Hours:
   - Monday to Friday: 8:00 AM - 10:00 PM
   - Saturday and Sunday: 9:00 AM - 6:00 PM
   - Holidays: Closed on national holidays.
2. Borrowing Rules & Limits:
   - Undergraduate Students: Max 3 books checked out simultaneously.
   - Postgraduate/PhD Students: Max 5 books checked out simultaneously.
   - Standard Borrow Period: 14 days (2 weeks).
3. Overdue Penalties:
   - Overdue Fine Rate: 10 INR per day per book after the due date.
   - Lost Book Policy: Replacement charge equivalent to 150% of the book's current catalog replacement price.
4. Contributor Points Program:
   - Account Creation: +10 welcome points.
   - Timely Book Return: +5 points.
   - Posting a Book Review: +10 points.
   - Asking a Forum/Discussion Question: +5 points.
   - Answering a Discussion Question: +15 points.
   - Peer Swap Completion: +20 points to both sender and receiver.
   - Book Donation (Add Book): +50 points.
5. Waitlisting:
   - If a book is fully checked out (0 available copies), join the waitlist.
   - When returned, the first queue position student is notified and gets a 24-hour priority reservation window to borrow the book.
6. Swap Lounge (Book Exchange):
   - Trade your books with peers from any college. Complete swaps in the Swap Lounge. Swap transfers the college inventory record and grants points.

Be helpful, concise, professional, and friendly. Answer queries regarding library policies, borrower status, points, book recommendations, and general library issues directly using the rules above.
`;

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      // Simulate fallback on server
      let reply = "Hello! I am running on the local fallback server. ";
      const msg = message.toLowerCase();
      if (msg.includes('timing') || msg.includes('hour') || msg.includes('close') || msg.includes('open')) {
        reply += "Our library hours are Mon-Fri: 8:00 AM - 10:00 PM, and Sat-Sun: 9:00 AM - 6:00 PM.";
      } else if (msg.includes('point') || msg.includes('reward') || msg.includes('score')) {
        reply += `You currently have ${user ? user.points : 0} points. Earn points by reviewing (+10), answering (+15), or swapping (+20).`;
      } else if (msg.includes('limit') || msg.includes('borrow')) {
        reply += "Undergrads can borrow up to 3 books and Postgrads/PhDs up to 5 books for a period of 14 days.";
      } else if (msg.includes('due') || msg.includes('when') || msg.includes('book')) {
        reply += activeBorrowsList.length > 0
          ? `You have checked out: ${activeBorrowsList.map(b => `"${b.title}" (due ${new Date(b.due_date).toLocaleDateString()})`).join(', ')}.`
          : "You do not have any active checkouts.";
      } else if (msg.includes('fine') || msg.includes('penalty')) {
        const fine = activeBorrowsList.reduce((sum: number, b: any) => sum + parseFloat(b.penalty_amount), 0);
        reply += fine > 0 
          ? `Your calculated overdue fine totals ${fine} INR.`
          : "You have no overdue penalties or late fines.";
      } else {
        reply += `Your current profile has ${user ? user.points : 0} contributor points at ${user ? user.college_name : 'your campus'}.`;
      }
      return NextResponse.json({ reply });
    }

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(history || []).map((h: any) => ({ role: h.sender === 'user' ? 'user' : 'assistant', content: h.text })),
          { role: 'user', content: message }
        ]
      })
    });

    const data = await response.json();
    const replyText = data.choices[0]?.message?.content || "I'm having trouble processing that right now.";
    return NextResponse.json({ reply: replyText });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
