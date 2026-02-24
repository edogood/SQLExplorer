import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { cleanupExpiredSchemas, ensureAppSchema } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST() {
  const client = await getPool().connect();
  try {
    await ensureAppSchema(client);
    const dropped = await cleanupExpiredSchemas(client, 100);
    return NextResponse.json({ dropped });
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: error instanceof Error ? error.message : 'Unexpected error' } },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
