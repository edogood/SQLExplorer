import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __sqlExplorerPool: Pool | undefined;
}

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  if (!global.__sqlExplorerPool) {
    global.__sqlExplorerPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
    });
  }
  return global.__sqlExplorerPool;
}
