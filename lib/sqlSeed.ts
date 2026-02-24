import fs from 'node:fs/promises';
import path from 'node:path';
import type { PoolClient } from 'pg';

export async function seedSchema(client: PoolClient, schemaName: string) {
  const filePath = path.join(process.cwd(), 'database', 'base_schema.sql');
  const baseSql = await fs.readFile(filePath, 'utf8');
  const sql = baseSql.replaceAll('__SCHEMA__', schemaName);
  await client.query(sql);
}
