import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { guardAndPrepareSql } from '@/lib/queryGuard';
import { cleanupExpiredSchemas, ensureAppSchema, extendSessionTtl, requireActiveSession } from '@/lib/session';

export const runtime = 'nodejs';

const TIMEOUT_MS = 3000;
const MAX_ROWS = 500;

function mapError(error: unknown): { status: number; code: string; message: string } {
  const message = error instanceof Error ? error.message : 'Unexpected error';
  const pg = error as { code?: string };

  if (message === 'SESSION_EXPIRED') {
    return { status: 410, code: 'SESSION_EXPIRED', message: 'Session expired. Create a new session.' };
  }
  if (message.includes('blocked') || message.includes('Multiple statements') || message.includes('LIMIT')) {
    return { status: 400, code: 'QUERY_BLOCKED', message };
  }
  if (pg.code === '57014') {
    return { status: 408, code: 'TIMEOUT', message: 'Query timed out after 3000ms.' };
  }
  if (pg.code?.startsWith('42')) {
    return { status: 400, code: 'SYNTAX', message };
  }

  return { status: 500, code: 'INTERNAL', message: 'Internal server error.' };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessionId = String(body?.sessionId ?? '');
  const rawSql = String(body?.sql ?? '');

  const client = await getPool().connect();
  const startedAt = Date.now();

  try {
    await ensureAppSchema(client);
    await cleanupExpiredSchemas(client, 1);
    const { sql } = guardAndPrepareSql(rawSql, MAX_ROWS);
    const schemaName = await requireActiveSession(client, sessionId);

    await client.query('BEGIN');
    await client.query(`SET LOCAL statement_timeout = '${TIMEOUT_MS}ms'`);
    await client.query(`SET LOCAL search_path = ${schemaName}, public`);
    const result = await client.query(sql);
    await extendSessionTtl(client, sessionId);
    await client.query('COMMIT');

    return NextResponse.json({
      columns: result.fields.map((f) => f.name),
      rows: result.rows.map((row) => result.fields.map((f) => row[f.name])),
      rowCount: result.rowCount,
      durationMs: Date.now() - startedAt
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    const mapped = mapError(error);
    return NextResponse.json({ error: { code: mapped.code, message: mapped.message } }, { status: mapped.status });
  } finally {
    client.release();
  }
}
