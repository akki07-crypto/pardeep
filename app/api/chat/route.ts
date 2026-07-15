import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, userId, history } = body;

    // 1. Gather transactional context for user
    const userRes = await query(
      `SELECT u.*, c.name as college_name 
       FROM users u 
       JOIN colleges c ON u.college_id = c.id 
       WHERE u.id = $1`, 
      [userId]
    );
    const user = userRes.rows[0];

    const activeBorrows = await query(
      `SELECT t.due_date, t.penalty_amount, b.title 
       FROM transactions t 
       JOIN books b ON t.book_id = b.id 
       WHERE t.user_id = $1 AND t.returned_at IS NULL`,
      [userId]
    );

    // Build context
    const context = `
      You are the AI Assistant for the Smart Academic Hub Library.
      Current User: ${user ? `${user.full_name} (College: ${user.college_name}, Points: ${user.points} Pts)` : 'Anonymous Student'}
      Active Borrows: ${activeBorrows.rows.length === 0 ? 'None' : activeBorrows.rows.map(b => `"${b.title}" due ${new Date(b.due_date).toLocaleDateString()} (Fine: ${b.penalty_amount} INR)`).join(', ')}
    `;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Simulate fallback on server
      let reply = "Hello! I am running on the local fallback server. ";
      const msg = message.toLowerCase();
      if (msg.includes('due') || msg.includes('when') || msg.includes('book')) {
        reply += activeBorrows.rows.length > 0
          ? `You have checked out: ${activeBorrows.rows.map(b => `"${b.title}" (due ${new Date(b.due_date).toLocaleDateString()})`).join(', ')}.`
          : "You do not have any active checkouts.";
      } else if (msg.includes('fine') || msg.includes('penalty')) {
        const fine = activeBorrows.rows.reduce((sum: number, b: any) => sum + parseFloat(b.penalty_amount), 0);
        reply += fine > 0 
          ? `Your calculated overdue fine totals ${fine} INR.`
          : "You have no overdue penalties or late fines.";
      } else {
        reply += `Your current profile has ${user ? user.points : 0} contributor points at ${user ? user.college_name : 'your campus'}.`;
      }
      return NextResponse.json({ reply });
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `${context}\nAnswer queries regarding library details, due dates, reviews, and rewards constructively and concisely.` },
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
