import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";
import mysql from "mysql2/promise";
import { validateSql, enforceResultLimits } from "./security.js";
import type { AppState, SandboxSession } from "./types.js";

const pgAdmin = new Pool({ connectionString: process.env.PG_SANDBOX_URL ?? "postgres://postgres:postgres@localhost:5433/sandbox" });
const mysqlAdmin = mysql.createPool({ uri: process.env.MYSQL_SANDBOX_URL ?? "mysql://root:root@localhost:3307/sandbox" });

const DATASET = readFileSync(resolve(process.cwd(), "../../infra/datasets/core_shop_v1.sql"), "utf8");

export async function createSession(state: AppState, dialect: "postgres" | "mysql", lessonId: string): Promise<SandboxSession> {
  const id = randomUUID().replace(/-/g, "").slice(0, 12);
  const schema = `sb_${id}`;
  const role = `${schema}_role`;
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();

  if (dialect === "postgres") {
    await pgAdmin.query(`CREATE SCHEMA ${schema}`);
    await pgAdmin.query(`CREATE ROLE ${role} LOGIN PASSWORD '${id}'`);
    await pgAdmin.query(`GRANT USAGE, CREATE ON SCHEMA ${schema} TO ${role}`);
    await pgAdmin.query(`ALTER ROLE ${role} SET statement_timeout='3000ms'`);
    await pgAdmin.query(`ALTER ROLE ${role} SET temp_file_limit='10MB'`);
    const client = await pgAdmin.connect();
    try {
      await client.query(`SET search_path TO ${schema}`);
      await client.query(DATASET);
    } finally { client.release(); }
  } else {
    await mysqlAdmin.query(`CREATE DATABASE ${schema}`);
    await mysqlAdmin.query(`CREATE USER '${role}'@'%' IDENTIFIED BY '${id}'`);
    await mysqlAdmin.query(`GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER ON ${schema}.* TO '${role}'@'%'`);
    const conn = await mysql.createConnection(process.env.MYSQL_SANDBOX_URL ?? "mysql://root:root@localhost:3307/sandbox");
    try {
      await conn.query(`USE ${schema}`);
      for (const stmt of DATASET.split(/;\s*\n/).filter(Boolean)) await conn.query(stmt);
    } finally { await conn.end(); }
  }

  const session = { id, dialect, lessonId, schema, expiresAt, connectionKey: id };
  state.sessions.set(id, session);
  return session;
}

export async function executeSql(state: AppState, sessionId: string, sql: string, includePlan?: boolean) {
  const session = state.sessions.get(sessionId);
  if (!session) throw new Error("Session not found");
  const safe = validateSql(sql);
  if (!safe.ok) throw new Error(safe.reason);

  if (session.dialect === "postgres") {
    const client = await pgAdmin.connect();
    try {
      await client.query(`SET statement_timeout='3000ms'`);
      await client.query(`SET search_path TO ${session.schema}`);
      const queryText = includePlan ? `EXPLAIN (FORMAT JSON) ${sql}` : sql;
      const result = await client.query(queryText);
      const rows = Array.isArray(result.rows) ? enforceResultLimits(result.rows.map((r) => Object.values(r))) : [];
      return { ok: true, columns: result.fields?.map((f) => ({ name: f.name, type: String(f.dataTypeID) })), rows, rowCount: result.rowCount ?? rows.length, plan: includePlan ? result.rows?.[0] : undefined };
    } finally { client.release(); }
  }

  const conn = await mysql.createConnection(process.env.MYSQL_SANDBOX_URL ?? "mysql://root:root@localhost:3307/sandbox");
  try {
    await conn.query(`USE ${session.schema}`);
    await conn.query("SET SESSION max_execution_time=3000");
    const [rows, fields] = await conn.query(sql);
    const arr = Array.isArray(rows) ? rows.map((r: any) => Object.values(r)) : [];
    return { ok: true, columns: (fields as any[])?.map((f) => ({ name: f.name, type: f.columnType?.toString() ?? "unknown" })), rows: enforceResultLimits(arr), rowCount: arr.length };
  } finally { await conn.end(); }
}
