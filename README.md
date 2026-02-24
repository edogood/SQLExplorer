# SQLExplorer (Next.js + PostgreSQL)

Applicazione deploy-ready su Vercel con contenuti, esercizi, catalogo keyword e playground SQL guidati da PostgreSQL.

## Stack
- Next.js App Router + TypeScript
- PostgreSQL esterno (`DATABASE_URL`)
- API routes Node.js per sessioni isolate e query execution

## Setup locale
1. Avvia Postgres:
```bash
docker compose up -d
```
2. Configura env:
```bash
cp .env.example .env.local
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sqlexplorer
```
3. Installa e avvia:
```bash
npm ci
npm run dev
```

## Migrazioni + seed contenuti
- `database/migrations/001_content.sql`
- `database/seed/content.sql`
- ingest dai file statici: `scripts/ingest-content.ts`

## Sicurezza playground
- schema per sessione: `session_<id>`
- `statement_timeout=3000ms`
- single statement enforced
- query pericolose bloccate (`ALTER SYSTEM`, `DROP DATABASE`, `COPY`, `DO $$`, `pg_sleep`...)
- `LIMIT 500` automatico per SELECT/CTE senza limit

## Deploy Vercel
- unico progetto Vercel
- env obbligatoria: `DATABASE_URL`
- API runtime Node.js
- pooling globale (`lib/db.ts`)

## Definition of Done checklist
- [x] Sezioni principali disponibili: home, playground, syntax, keywords, keyword, guided, trainer, exercises, database, visualizer
- [x] Tutti i contenuti serviti da tabelle `content.*`
- [x] Session execution isolata con cleanup lazy
- [x] E2E Playwright multi-viewport e workflow CI
