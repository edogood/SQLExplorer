# SQLExplorer (Level-2 Dynamic SQL Lab)

SQLExplorer now executes **real PostgreSQL SQL** through Next.js API routes on Vercel (Node runtime), with schema-isolated sessions and lazy cleanup.

## Stack

- Next.js App Router (TypeScript)
- Vercel API routes in `app/api/**/route.ts`
- PostgreSQL via `pg` pool using `DATABASE_URL`
- One schema per session: `session_<sessionId>`

## Environment variables

Required:

- `DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<db>?sslmode=require`

## Local development

1. Install dependencies:

```bash
npm install
```

2. Start local PostgreSQL:

```bash
docker compose up -d
```

3. Configure `.env.local`:

```bash
DATABASE_URL=postgres://sql_lab:sql_lab_pw@localhost:5432/sql_lab
```

4. Start app:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Vercel deploy

1. Push repository.
2. Import project in Vercel.
3. Set `DATABASE_URL` in Project Settings → Environment Variables.
4. Deploy.
5. Optional (not required for correctness): set a **daily** cron to `POST /api/cleanup`.

## Security model

### Request safety guard (first line)

- Rejects multi-statement SQL.
- Blocks dangerous operations including:
  - `DROP DATABASE`, `ALTER SYSTEM`, `CREATE ROLE`, `GRANT`, `REVOKE`, `COPY`, `\copy`, `VACUUM FULL`, `CLUSTER`, `pg_sleep`, `dblink`, `CREATE EXTENSION`, `ALTER ROLE`, `ALTER USER`, `DO $$`, `LISTEN`, `NOTIFY`.
- Executes each query inside a transaction with:
  - `SET LOCAL statement_timeout = '3000ms'`
  - `SET LOCAL search_path = session_<sessionId>, public`

### Row limits

- Default `maxRows=500`.
- For `SELECT`/`WITH` without explicit `LIMIT`, server wraps query:
  - `SELECT * FROM ( <user_sql> ) AS q LIMIT 500`
- Unsafe wrapping patterns (e.g. `FOR UPDATE`) are rejected and require explicit `LIMIT`.
- DDL/DML are never auto-modified.

### DB privilege model (second line)

Create a minimal role for `DATABASE_URL` (non-superuser, non-db-owner):

```sql
-- Run as admin once.
CREATE ROLE sqlexplorer_app LOGIN PASSWORD 'replace_me' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

-- App metadata schema.
CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION sqlexplorer_app;
GRANT USAGE, CREATE ON SCHEMA app TO sqlexplorer_app;

-- Let app role use public but not admin the DB.
GRANT CONNECT ON DATABASE sql_lab TO sqlexplorer_app;
GRANT USAGE ON SCHEMA public TO sqlexplorer_app;

-- Needed so the role can create/drop per-session schemas it owns.
GRANT CREATE ON DATABASE sql_lab TO sqlexplorer_app;

-- Optional hardening if existing DB has broad rights:
REVOKE ALL ON DATABASE sql_lab FROM PUBLIC;
GRANT CONNECT ON DATABASE sql_lab TO sqlexplorer_app;
```

Because each `session_*` schema is created by the app role, it can create/drop objects in those schemas while still lacking global superuser operations.

## Lazy cleanup (Hobby-safe)

No frequent cron is required.

- `POST /api/create-session`: runs `cleanupExpiredSchemas(3)` **before** creating a new session.
- `POST /api/execute`: runs `cleanupExpiredSchemas(1)` **before** execution.
- `POST /api/reset-session`, `POST /api/close-session`: also run light cleanup.

`cleanupExpiredSchemas(limit)` transaction logic:

1. `SELECT ... FOR UPDATE SKIP LOCKED` expired sessions.
2. For each row: `SELECT app.drop_schema($1)` then delete from `app.sessions`.
3. Commit.

## API contracts

### `POST /api/create-session`

```json
{
  "sessionId": "...",
  "expiresAt": "...",
  "limits": { "timeoutMs": 3000, "maxRows": 500 }
}
```

### `POST /api/execute`
Body:

```json
{ "sessionId": "...", "sql": "SELECT 1" }
```

Success:

```json
{ "columns": ["?column?"], "rows": [[1]], "rowCount": 1, "durationMs": 4 }
```

Error:

```json
{ "error": { "code": "QUERY_BLOCKED|TIMEOUT|SYNTAX|SESSION_EXPIRED|INTERNAL", "message": "..." } }
```

### `POST /api/reset-session`

```json
{ "ok": true }
```

### `POST /api/close-session`

```json
{ "ok": true }
```

### `POST /api/cleanup`

```json
{ "dropped": 2 }
```

## Smoke checks

Run these against local app:

```bash
# 1) create-session works + seeds schema
curl -s -X POST http://localhost:3000/api/create-session

# 2) execute SELECT 1
curl -s -X POST http://localhost:3000/api/execute -H 'content-type: application/json' -d '{"sessionId":"<sid>","sql":"SELECT 1"}'

# 3) blocked dangerous query
curl -s -X POST http://localhost:3000/api/execute -H 'content-type: application/json' -d '{"sessionId":"<sid>","sql":"ALTER SYSTEM SET work_mem = 64"}'

# 4) blocked multi-statement
curl -s -X POST http://localhost:3000/api/execute -H 'content-type: application/json' -d '{"sessionId":"<sid>","sql":"SELECT 1; SELECT 2"}'

# 5) select without LIMIT returns <= 500 rows
curl -s -X POST http://localhost:3000/api/execute -H 'content-type: application/json' -d '{"sessionId":"<sid>","sql":"SELECT * FROM generate_series(1, 2000)"}'

# 6) expired session -> SESSION_EXPIRED (manually shorten expires_at in DB for quick test)

# 7) lazy cleanup progression
curl -s -X POST http://localhost:3000/api/cleanup
```

## Common pitfalls

- **Too many connections**: keep pool small for serverless.
- **Timeouts**: all queries are capped at 3000ms.
- **Invalid sessionId reuse**: expired IDs return `SESSION_EXPIRED`; create a new session.
- **No cron configured**: acceptable; lazy cleanup keeps system healthy over normal traffic.
