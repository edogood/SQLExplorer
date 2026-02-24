import fs from 'node:fs/promises';
import path from 'node:path';
import type { PoolClient } from 'pg';

export async function seedSchema(client: PoolClient, schemaName: string) {
  const baseSchemaPath = path.join(process.cwd(), 'database', 'base_schema.sql');
  const sql = await fs.readFile(baseSchemaPath, 'utf8');
  await client.query(sql.replaceAll('__SCHEMA__', schemaName));
}
