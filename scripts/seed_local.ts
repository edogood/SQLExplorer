import { Pool } from 'pg';
import { createSession, ensureAppSchema } from '../lib/session';

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await ensureAppSchema(client);
    const session = await createSession(client);
    console.log('Seeded session:', session.sessionId);
  } finally {
    client.release();
    await pool.end();
  }
}

void run();
