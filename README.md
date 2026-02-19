# SQL Explorer

Monorepo didattico per imparare SQL da base a esperto con sandbox sicura.

## Struttura
- `apps/web`: Next.js UI con catalogo, card lezione, editor SQL.
- `apps/api`: Fastify API con auth JWT, content read-only, sandbox sessions, execute e grading.
- `apps/worker`: worker per job async/autograding estendibile.
- `packages/shared`: tipi/schema condivisi.
- `infra`: docker compose, dataset base, script.

## Avvio locale
```bash
docker compose -f infra/docker-compose.yml up -d
pnpm install
pnpm --filter @sql-explorer/api dev
pnpm --filter @sql-explorer/web dev
pnpm --filter @sql-explorer/worker dev
```

## Deploy frontend su GitHub Pages
Il repository include il workflow `.github/workflows/deploy-pages.yml` che esegue export statico Next.js (`apps/web/out`) e pubblica su Pages.

1. Abilita **GitHub Pages** su Actions nel repository.
2. (Opzionale) configura la variabile repository `SQL_EXPLORER_API_BASE_URL` con URL pubblico dell'API.
3. Effettua push su `main` oppure avvia manualmente il workflow.

Note:
- la web app viene pubblicata con `basePath=/<repo-name>`.
- senza API configurata, il sito resta navigabile (catalogo statico) ma il playground query mostra messaggio di configurazione.

## Endpoint principali
- `POST /api/sandbox/sessions`
- `POST /api/sandbox/execute`
- `POST /api/exercises/grade`
- `GET /api/content/catalog`
- `GET /api/content/lessons/:id`
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
- Validazione SQL con blocco pattern proibiti (COPY, CREATE EXTENSION, ALTER SYSTEM, benchmark, sleep...).
- Sessioni isolate con schema/user dedicato su Postgres/MySQL.
- Statement timeout e limiti output (righe+bytes).
- Rate limiting endpoint execute.
- Logging query anonimizzato (SHA-256 fingerprint, non query raw).

## Lessons seed
10 lezioni in `apps/api/content/lessons` coprono aree: select/join/aggregate/cte/window/performance/transaction/json/security/dialects.
