import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { createOrRefreshSession, ensureAppSchema } from '@/lib/session';

export async function POST() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const sessionId = randomUUID().replaceAll('-', '');
    const now = new Date();
    await ensureAppSchema(client);
    const { expiresAt } = await createOrRefreshSession(client, sessionId, now);
    return NextResponse.json({
      sessionId,
      expiresAt: expiresAt.toISOString(),
      limits: { timeoutMs: 3000, maxRows: 500 }
    });
  } catch (error) {
    return NextResponse.json({ error: { code: 'INTERNAL', message: (error as Error).message } }, { status: 500 });
  } finally {
    client.release();
  }
}
