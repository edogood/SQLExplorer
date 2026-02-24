import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { cleanupExpiredSchemas, ensureAppSchema, resetSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessionId = String(body?.sessionId ?? '');

  const client = await getPool().connect();
  try {
    await ensureAppSchema(client);
    await cleanupExpiredSchemas(client, 1);
    await resetSession(client, sessionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    const status = message === 'SESSION_EXPIRED' ? 410 : 400;
    return NextResponse.json({ error: { code: status === 410 ? 'SESSION_EXPIRED' : 'INTERNAL', message } }, { status });
  } finally {
    client.release();
  }
}
