import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { PoolClient } from 'pg';
import { seedSchema } from './seed';

export const SESSION_TTL_MINUTES = 30;

export function isValidSessionId(sessionId: string): boolean {
  return /^[a-f0-9]{32}$/.test(sessionId);
}

export function buildSchemaName(sessionId: string): string {
  if (!isValidSessionId(sessionId)) {
    throw new Error('Invalid session id format.');
  }
  return `session_${sessionId}`;
}

export async function ensureAppSchema(client: PoolClient): Promise<void> {
  const appSchemaPath = path.join(process.cwd(), 'database', 'app_schema.sql');
  const appSchemaSql = await fs.readFile(appSchemaPath, 'utf8');
  await client.query(appSchemaSql);
}

export async function cleanupExpiredSchemas(client: PoolClient, limit: number): Promise<number> {
  await client.query('BEGIN');
  try {
    const expired = await client.query<{ session_id: string; schema_name: string }>(
      `SELECT session_id, schema_name
       FROM app.sessions
       WHERE expires_at < now()
       ORDER BY expires_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit]
    );

    for (const row of expired.rows) {
      await client.query('SELECT app.drop_schema($1)', [row.schema_name]);
      await client.query('DELETE FROM app.sessions WHERE session_id = $1', [row.session_id]);
    }

    await client.query('COMMIT');
    return expired.rowCount ?? 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function createSession(client: PoolClient): Promise<{ sessionId: string; expiresAt: string }> {
  const sessionId = randomUUID().replaceAll('-', '');
  const schemaName = buildSchemaName(sessionId);

  await client.query('BEGIN');
  try {
    await client.query(`CREATE SCHEMA ${schemaName}`);
    await seedSchema(client, schemaName);
    const inserted = await client.query<{ expires_at: string }>(
      `INSERT INTO app.sessions(session_id, schema_name, expires_at)
       VALUES($1, $2, now() + ($3 || ' minutes')::interval)
       RETURNING expires_at`,
      [sessionId, schemaName, SESSION_TTL_MINUTES]
    );
    await client.query('COMMIT');

    return { sessionId, expiresAt: inserted.rows[0].expires_at };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function requireActiveSession(client: PoolClient, sessionId: string): Promise<string> {
  const schemaName = buildSchemaName(sessionId);
  const active = await client.query<{ schema_name: string }>(
    `SELECT schema_name
     FROM app.sessions
     WHERE session_id = $1
       AND expires_at >= now()`,
    [sessionId]
  );

  if ((active.rowCount ?? 0) === 0) {
    throw new Error('SESSION_EXPIRED');
  }

  if (active.rows[0].schema_name !== schemaName) {
    throw new Error('Invalid session schema.');
  }

  return schemaName;
}

export async function extendSessionTtl(client: PoolClient, sessionId: string): Promise<void> {
  await client.query(
    `UPDATE app.sessions
     SET last_used_at = now(),
         expires_at = now() + ($2 || ' minutes')::interval
     WHERE session_id = $1`,
    [sessionId, SESSION_TTL_MINUTES]
  );
}

export async function resetSession(client: PoolClient, sessionId: string): Promise<void> {
  const schemaName = await requireActiveSession(client, sessionId);

  await client.query('BEGIN');
  try {
    await client.query('SELECT app.drop_schema($1)', [schemaName]);
    await client.query(`CREATE SCHEMA ${schemaName}`);
    await seedSchema(client, schemaName);
    await extendSessionTtl(client, sessionId);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function closeSession(client: PoolClient, sessionId: string): Promise<void> {
  const schemaName = buildSchemaName(sessionId);
  await client.query('BEGIN');
  try {
    await client.query('SELECT app.drop_schema($1)', [schemaName]);
    await client.query('DELETE FROM app.sessions WHERE session_id = $1', [sessionId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
