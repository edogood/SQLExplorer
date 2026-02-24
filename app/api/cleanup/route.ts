import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

async function cleanup() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const expired = await client.query('SELECT schema_name FROM app.sessions WHERE expires_at < now()');
    for (const row of expired.rows) {
      if (typeof row.schema_name === 'string' && /^session_[a-f0-9]{32}$/.test(row.schema_name)) {
        await client.query(`DROP SCHEMA IF EXISTS ${row.schema_name} CASCADE`);
      }
    }
    await client.query('DELETE FROM app.sessions WHERE expires_at < now()');
    return NextResponse.json({ ok: true, cleaned: expired.rowCount });
  } finally {
    client.release();
  }
}

export async function GET() {
  try {
    return await cleanup();
  } catch (error) {
    return NextResponse.json({ error: { code: 'INTERNAL', message: (error as Error).message } }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
