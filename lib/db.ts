import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __sqlExplorerPool: Pool | undefined;
}

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required.');
  }

  if (!global.__sqlExplorerPool) {
    global.__sqlExplorerPool = new Pool({
      connectionString,
      max: 6,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
    });
  }

  return global.__sqlExplorerPool;
}
