# SQL Explorer

Monorepo didattico per imparare SQL da base a esperto con sandbox sicura locale e deploy pubblico in modalità sicura.

## Architettura
- `apps/web`: Next.js (App Router) + TypeScript, catalogo lezioni, viewer, playground SQL.
- `apps/api`: API (Fastify TS) con auth JWT, content read-only, sandbox sessions/execute, grading, dialect translation.
- `apps/worker`: worker estendibile per job async/autograding.
- `packages/shared`: tipi e schemi condivisi.
- `infra`: docker compose, dataset, script smoke.

## Modalità supportate
### Modalità A — Vercel (raccomandata)
Web deploy su Vercel. API deployabile separatamente.

Per la sicurezza, scegliere una modalità runtime API tramite `EXECUTION_MODE`:
- `no-exec` (default consigliato in prod): esecuzione SQL disabilitata, restano catalogo/contenuti/translation/autograde basato su query attesa.
- `remote`: inoltro a sandbox worker esterno con webhook firmato HMAC (`REMOTE_SANDBOX_EXECUTE_URL`, `REMOTE_SANDBOX_HMAC_SECRET`).
- `local`: solo sviluppo locale con Docker sandbox.

### Modalità B — GitHub Pages (static-only)
Export statico Next.js con contenuti e UI.
- Se `NEXT_PUBLIC_API_BASE_URL` non è impostata: fallback didattico (niente esecuzione reale).
- Se API è configurata ma `supportsExecution=false`: il pulsante Run SQL mostra messaggio di modalità no-exec.

## Avvio locale (full sandbox)
```bash
docker compose -f infra/docker-compose.yml up -d
pnpm install
cp .env.example .env
pnpm --filter @sql-explorer/api dev
pnpm --filter @sql-explorer/web dev
pnpm --filter @sql-explorer/worker dev
```

## Endpoint principali
- `POST /api/sandbox/sessions`
- `POST /api/sandbox/execute`
- `POST /api/exercises/grade`
- `GET /api/content/catalog`
- `GET /api/content/lessons/:id`
- `GET /api/system/capabilities`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/users/me/progress`

## Esempi cURL
```bash
curl -X POST http://localhost:4000/api/auth/register -H 'content-type: application/json' -d '{"email":"demo@local","password":"Passw0rd!"}'

curl http://localhost:4000/api/content/catalog

curl -X POST http://localhost:4000/api/sandbox/sessions -H 'content-type: application/json' -d '{"dialect":"postgres","lessonId":"select.basics","seedMode":"fixed"}'

curl -X POST http://localhost:4000/api/sandbox/execute -H 'content-type: application/json' -d '{"sessionId":"<id>","sql":"SELECT * FROM orders LIMIT 5"}'
```

## Sicurezza implementata
- Validazione SQL con blocco pattern proibiti (COPY, CREATE EXTENSION, ALTER SYSTEM, sleep/benchmark, ecc.).
- Sessioni isolate Postgres/MySQL.
- Statement timeout e limiti output (row cap + bytes cap).
- Rate limiting endpoint execute/grade.
- Logging query anonimizzato con fingerprint SHA-256 (no query raw).

## Dataset e contenuti
- Dataset base: `infra/datasets/core_shop_v1.sql`
- Lezioni JSON (10): `apps/api/content/lessons/*.json`

## Deploy GitHub Pages
Workflow incluso: `.github/workflows/deploy-pages.yml`.
