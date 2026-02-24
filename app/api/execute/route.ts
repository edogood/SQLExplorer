import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { guardAndPrepareSql } from '@/lib/queryGuard';
import { buildSchemaName } from '@/lib/session';

const TIMEOUT_MS = 3000;
const MAX_ROWS = 500;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessionId = body?.sessionId as string;
  const sql = body?.sql as string;

  const pool = getPool();
  const client = await pool.connect();
  const started = Date.now();

  try {
    const schemaName = buildSchemaName(sessionId);
    const safeSql = guardAndPrepareSql(sql, MAX_ROWS);

    await client.query('BEGIN');
    await client.query(`SET LOCAL statement_timeout = '${TIMEOUT_MS}ms'`);
    await client.query(`SET LOCAL search_path = ${schemaName}, public`);

    const result = await client.query(safeSql);

    await client.query(
      'UPDATE app.sessions SET last_used_at = now(), expires_at = now() + interval \'30 minutes\' WHERE session_id = $1',
      [sessionId]
    );

    const durationMs = Date.now() - started;
    await client.query(
      'INSERT INTO app.query_log(session_id, created_at, duration_ms, row_count, query_hash) VALUES($1, now(), $2, $3, $4)',
      [sessionId, durationMs, result.rowCount, createHash('sha256').update(sql).digest('hex')]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      columns: result.fields.map((f) => f.name),
      rows: result.rows.map((row) => result.fields.map((f) => row[f.name])),
      rowCount: result.rowCount,
      durationMs
    });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const pgErr = error as { code?: string; message: string };
    const code = pgErr.code === '57014' ? 'TIMEOUT' : pgErr.code?.startsWith('42') ? 'SYNTAX' : pgErr.message.includes('blocked') ? 'QUERY_BLOCKED' : 'INTERNAL';

    await client.query(
      'INSERT INTO app.query_log(session_id, created_at, duration_ms, error_code, error_message, query_hash) VALUES($1, now(), $2, $3, $4, $5)',
      [sessionId ?? null, Date.now() - started, code, pgErr.message, createHash('sha256').update(sql ?? '').digest('hex')]
    ).catch(() => undefined);

    return NextResponse.json({ error: { code, message: pgErr.message } }, { status: 400 });
  } finally {
    client.release();
  }
}
