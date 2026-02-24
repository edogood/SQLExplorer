import type { PoolClient } from 'pg';
import { seedSchema } from './sqlSeed';

export const SESSION_TTL_MINUTES = 30;

export function buildSchemaName(sessionId: string) {
  if (!/^[a-f0-9]{32}$/.test(sessionId)) throw new Error('Invalid session id format.');
  return `session_${sessionId}`;
}

export async function ensureAppSchema(client: PoolClient) {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS app;
    CREATE TABLE IF NOT EXISTS app.sessions (
      session_id text PRIMARY KEY,
      schema_name text NOT NULL,
      created_at timestamptz NOT NULL,
      last_used_at timestamptz NOT NULL,
      expires_at timestamptz NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app.query_log (
      id bigserial PRIMARY KEY,
      session_id text,
      created_at timestamptz NOT NULL,
      duration_ms int,
      row_count int,
      query_hash text,
      error_code text,
      error_message text
    );
  `);
}

export async function createOrRefreshSession(client: PoolClient, sessionId: string, now: Date) {
  const schemaName = buildSchemaName(sessionId);
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MINUTES * 60_000);

  await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
  await seedSchema(client, schemaName);

  await client.query(
    `INSERT INTO app.sessions(session_id, schema_name, created_at, last_used_at, expires_at)
     VALUES($1, $2, $3, $3, $4)
     ON CONFLICT(session_id)
     DO UPDATE SET schema_name = EXCLUDED.schema_name, last_used_at = EXCLUDED.last_used_at, expires_at = EXCLUDED.expires_at`,
    [sessionId, schemaName, now.toISOString(), expiresAt.toISOString()]
  );

  return { schemaName, expiresAt };
}

export async function resetSession(client: PoolClient, sessionId: string) {
  const schemaName = buildSchemaName(sessionId);
  await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`);
  await client.query(`CREATE SCHEMA ${schemaName};`);
  await seedSchema(client, schemaName);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MINUTES * 60_000);
  await client.query('UPDATE app.sessions SET last_used_at=$2, expires_at=$3 WHERE session_id=$1', [sessionId, now.toISOString(), expiresAt.toISOString()]);
}

export async function closeSession(client: PoolClient, sessionId: string) {
  const schemaName = buildSchemaName(sessionId);
  await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`);
  await client.query('DELETE FROM app.sessions WHERE session_id = $1', [sessionId]);
}
