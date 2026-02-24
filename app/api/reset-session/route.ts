import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { resetSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessionId = body?.sessionId as string;
  const pool = getPool();
  const client = await pool.connect();
  try {
    await resetSession(client, sessionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: { code: 'INTERNAL', message: (error as Error).message } }, { status: 400 });
  } finally {
    client.release();
  }
}
