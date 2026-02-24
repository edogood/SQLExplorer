import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { cleanupExpiredSchemas, createSession, ensureAppSchema } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST() {
  const client = await getPool().connect();
  try {
    await ensureAppSchema(client);
    await cleanupExpiredSchemas(client, 3);
    const session = await createSession(client);

    return NextResponse.json({
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
      limits: { timeoutMs: 3000, maxRows: 500 }
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: (error as Error).message } },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
