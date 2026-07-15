import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || '';

export const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    })
  : null;

export async function query(text: string, params?: any[]) {
  if (pool) {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rowsCount: res.rowCount });
      return res;
    } catch (err) {
      console.error('Database query error:', err);
      throw err;
    }
  } else {
    console.warn(`[SIMULATION] Database not configured. Executing raw query: "${text.substring(0, 60)}..."`);
    return { rows: [], rowCount: 0 };
  }
}
