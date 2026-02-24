# SQLExplorer (Level-2 Dynamic SQL Lab)

This version runs as a **single Next.js App Router project on Vercel** with serverless API routes and an external PostgreSQL database.

## Features

- Session isolation per user using dedicated schema: `session_<sessionId>`.
- Real PostgreSQL execution (no browser SQL engine).
- Safety controls:
  - single-statement enforcement
  - blocked dangerous commands
  - `SET LOCAL statement_timeout = '3000ms'`
  - `SET LOCAL search_path = session_<sessionId>, public`
  - auto-wrap SELECT/CTE without LIMIT to max 500 rows
- Session lifecycle API: create/reset/close + TTL cleanup.
- Query logs in `app.query_log`.
- Vercel cron for cleanup every 10 minutes.

## Project structure

- `app/api/create-session/route.ts`
- `app/api/execute/route.ts`
- `app/api/reset-session/route.ts`
- `app/api/close-session/route.ts`
- `app/api/cleanup/route.ts`
- `lib/db.ts`
- `lib/session.ts`
- `lib/queryGuard.ts`
- `lib/sqlSeed.ts`
- `database/base_schema.sql`
- `scripts/seed_local.ts`
- `docker-compose.yml`
- `vercel.json`

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start PostgreSQL:

   ```bash
   docker compose up -d
   ```

3. Create `.env.local`:

   ```bash
   DATABASE_URL=postgres://sql_lab:sql_lab_pw@localhost:5432/sql_lab
   ```

4. Run app:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Vercel deployment

1. Push to Git provider.
2. Import project in Vercel.
3. Set environment variable in Vercel project:

   - `DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<db>?sslmode=require`

4. Deploy.
5. Ensure `vercel.json` is present so cron triggers `/api/cleanup` every 10 minutes.

## Database security requirements

Use a dedicated PostgreSQL user for `DATABASE_URL` with these constraints:

- Must **NOT** be superuser.
- Must **NOT** own the database.
- Grant only minimum privileges needed on `app` schema and ability to create/drop objects in `session_*` schemas.

App-level filtering is only first-line defense; role privileges are the final safety net.

## API contracts

- `POST /api/create-session` → `{ sessionId, expiresAt, limits }`
- `POST /api/execute` with `{ sessionId, sql }` → success `{ columns, rows, rowCount, durationMs }` or error `{ error: { code, message } }`
- `POST /api/reset-session` with `{ sessionId }` → `{ ok: true }`
- `POST /api/close-session` with `{ sessionId }` → `{ ok: true }`
- `GET|POST /api/cleanup` → `{ ok: true, cleaned }`

## Common failure modes

- **Too many connections**: lower pool size in `lib/db.ts` or enable Postgres pooling (e.g. PgBouncer/provider pooler).
- **Timeout errors**: queries are hard-limited to 3000ms by `statement_timeout`.
- **Blocked queries**: if query contains forbidden operations/comments/multi-statements it is rejected.
- **Build/runtime missing env**: verify `DATABASE_URL` exists locally and in Vercel.
