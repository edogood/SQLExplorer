import { Pool } from 'pg';
import { ensureAppSchema, createOrRefreshSession } from '../lib/session';

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await ensureAppSchema(client);
    const sessionId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    await createOrRefreshSession(client, sessionId, new Date());
    console.log('Seeded session:', sessionId);
  } finally {
    client.release();
    await pool.end();
  }
}

void run();
