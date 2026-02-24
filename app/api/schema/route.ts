import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { ensureAppSchema, requireActiveSession } from '@/lib/session';
import { introspectSchema } from '@/lib/schemaIntrospect';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId') || '';
  const client = await getPool().connect();
  try {
    await ensureAppSchema(client);
    const schema = sessionId ? await requireActiveSession(client, sessionId) : 'public';
    const json = await introspectSchema(client, schema);
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: { code: 'INTERNAL', message: (error as Error).message } }, { status: 400 });
  } finally {
    client.release();
  }
}
