import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { cleanupExpiredSchemas, ensureAppSchema, closeSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessionId = String(body?.sessionId ?? '');

  const client = await getPool().connect();
  try {
    await ensureAppSchema(client);
    await cleanupExpiredSchemas(client, 1);
    await closeSession(client, sessionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: error instanceof Error ? error.message : 'Unexpected error' } },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
