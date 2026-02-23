export const SYNTAX_TOPICS = [
  {
    title: "SELECT + WHERE + ORDER + LIMIT/TOP",
    summary: "Query base con filtro, ordinamento e riduzione righe.",
    args: ["colonne", "tabella", "condizione", "ordinamento", "limite righe"],
    snippets: {
      sqlite: "SELECT id, name, segment, credit_limit\nFROM customers\nWHERE segment = 'Enterprise'\n  AND credit_limit > 5000\nORDER BY credit_limit DESC\nLIMIT 20;",
      postgresql: "SELECT id, name, segment, credit_limit\nFROM customers\nWHERE segment = 'Enterprise'\n  AND credit_limit > 5000\nORDER BY credit_limit DESC NULLS LAST\nLIMIT 20;",
      sqlserver: "SELECT TOP 20 id, name, segment, credit_limit\nFROM customers\nWHERE segment = 'Enterprise'\n  AND credit_limit > 5000\nORDER BY credit_limit DESC;"
    },
    attention: [
      "SQLite/PostgreSQL usano LIMIT n; SQL Server usa SELECT TOP n.",
      "ORDER BY senza tie-breaker rende paginazione instabile.",
      "NULLS FIRST/LAST supportato in PostgreSQL e SQLite 3.30+, non in SQL Server."
    ]
  },
  {
    title: "JOIN (INNER, LEFT, RIGHT, FULL, CROSS)",
    summary: "Combinazione di tabelle su chiavi relazionali con diverse semantiche di inclusione.",
    args: ["tabella sinistra", "tabella destra", "condizione ON", "tipo JOIN"],
    snippets: {
      sqlite: "-- INNER JOIN: solo righe con match\nSELECT o.id, c.name, o.total_amount\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE o.status = 'PAID'\nLIMIT 20;\n\n-- LEFT JOIN: tutti i clienti, anche senza ordini\nSELECT c.name, COUNT(o.id) AS n_orders\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.id;",
      postgresql: "-- INNER JOIN\nSELECT o.id, c.name, o.total_amount\nFROM orders o\nINNER JOIN customers c ON c.id = o.customer_id\nWHERE o.status = 'PAID'\nLIMIT 20;\n\n-- FULL OUTER JOIN: tutte le righe da entrambe\nSELECT c.name, o.id\nFROM customers c\nFULL OUTER JOIN orders o ON o.customer_id = c.id\nWHERE c.id IS NULL OR o.id IS NULL;",
      sqlserver: "-- INNER JOIN\nSELECT TOP 20 o.id, c.name, o.total_amount\nFROM orders o\nINNER JOIN customers c ON c.id = o.customer_id\nWHERE o.status = 'PAID';\n\n-- RIGHT JOIN: tutti gli ordini, anche senza cliente valido\nSELECT c.name, o.id, o.total_amount\nFROM customers c\nRIGHT JOIN orders o ON o.customer_id = c.id\nWHERE c.id IS NULL;"
    },
    attention: [
      "SQLite non supporta RIGHT JOIN ne FULL OUTER JOIN: invertire ordine tabelle per LEFT JOIN.",
      "LEFT JOIN con filtro WHERE sulla tabella destra diventa INNER JOIN — spostare filtro nella clausola ON.",
      "CROSS JOIN genera prodotto cartesiano: N*M righe senza condizione ON."
    ]
  },
  {
    title: "GROUP BY + HAVING",
    summary: "Aggregazione per dimensioni e filtro post-aggregazione sui gruppi.",
    args: ["chiavi di gruppo", "funzioni aggregate (SUM, COUNT, AVG, MIN, MAX)", "condizione HAVING"],
    snippets: {
      sqlite: "SELECT c.segment,\n       COUNT(*) AS n_orders,\n       ROUND(SUM(o.total_amount), 2) AS revenue,\n       ROUND(AVG(o.total_amount), 2) AS avg_order\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.status IN ('PAID','SHIPPED')\nGROUP BY c.segment\nHAVING SUM(o.total_amount) > 100000\nORDER BY revenue DESC;",
      postgresql: "SELECT c.segment,\n       COUNT(*) AS n_orders,\n       ROUND(SUM(o.total_amount)::numeric, 2) AS revenue,\n       ROUND(AVG(o.total_amount)::numeric, 2) AS avg_order\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.status IN ('PAID','SHIPPED')\nGROUP BY c.segment\nHAVING SUM(o.total_amount) > 100000\nORDER BY revenue DESC;",
      sqlserver: "SELECT c.segment,\n       COUNT(*) AS n_orders,\n       ROUND(SUM(o.total_amount), 2) AS revenue,\n       ROUND(AVG(o.total_amount), 2) AS avg_order\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.status IN ('PAID','SHIPPED')\nGROUP BY c.segment\nHAVING SUM(o.total_amount) > 100000\nORDER BY revenue DESC;"
    },
    attention: [
      "SQLite permette colonne non aggregate fuori GROUP BY (risultato arbitrario); PostgreSQL e SQL Server danno errore.",
      "Usare alias nel HAVING funziona in SQLite ma non in PostgreSQL e SQL Server.",
      "Filtri non aggregati vanno in WHERE (piu efficiente), non in HAVING."
    ]
  },
  {
    title: "CTE (WITH)",
    summary: "Scomposizione query in blocchi logici riutilizzabili con Common Table Expressions.",
    args: ["nome CTE", "query CTE", "query finale"],
    snippets: {
      sqlite: "WITH monthly AS (\n  SELECT substr(order_date, 1, 7) AS ym,\n         ROUND(SUM(total_amount), 2) AS revenue\n  FROM orders\n  WHERE status IN ('PAID','SHIPPED')\n  GROUP BY substr(order_date, 1, 7)\n),\ntop_months AS (\n  SELECT * FROM monthly WHERE revenue > 50000\n)\nSELECT * FROM top_months ORDER BY ym;",
      postgresql: "WITH monthly AS (\n  SELECT to_char(order_date::date, 'YYYY-MM') AS ym,\n         ROUND(SUM(total_amount)::numeric, 2) AS revenue\n  FROM orders\n  WHERE status IN ('PAID','SHIPPED')\n  GROUP BY to_char(order_date::date, 'YYYY-MM')\n),\ntop_months AS (\n  SELECT * FROM monthly WHERE revenue > 50000\n)\nSELECT * FROM top_months ORDER BY ym;",
      sqlserver: "WITH monthly AS (\n  SELECT LEFT(order_date, 7) AS ym,\n         ROUND(SUM(total_amount), 2) AS revenue\n  FROM orders\n  WHERE status IN ('PAID','SHIPPED')\n  GROUP BY LEFT(order_date, 7)\n),\ntop_months AS (\n  SELECT * FROM monthly WHERE revenue > 50000\n)\nSELECT * FROM top_months ORDER BY ym;"
    },
    attention: [
      "CTE non materializzate in SQL Server e SQLite: possono essere rieseguite come subquery.",
      "PostgreSQL materializza CTE pre-v12; dalla v12+ il planner decide. Usare MATERIALIZED/NOT MATERIALIZED.",
      "CTE ricorsive (WITH RECURSIVE) richiedono condizione di stop per evitare loop infiniti."
    ]
  },
  {
    title: "Window Functions (OVER, PARTITION BY)",
    summary: "Calcolo analitico senza perdere il dettaglio riga: ranking, running total, confronti temporali.",
    args: ["funzione finestra", "PARTITION BY", "ORDER BY", "frame opzionale (ROWS/RANGE/GROUPS)"],
    snippets: {
      sqlite: "SELECT customer_id,\n       order_date,\n       total_amount,\n       SUM(total_amount) OVER (\n         PARTITION BY customer_id\n         ORDER BY order_date\n         ROWS UNBOUNDED PRECEDING\n       ) AS running_total,\n       ROW_NUMBER() OVER (\n         PARTITION BY customer_id\n         ORDER BY total_amount DESC\n       ) AS rank_by_amount\nFROM orders\nWHERE status = 'PAID';",
      postgresql: "SELECT customer_id,\n       order_date,\n       total_amount,\n       SUM(total_amount) OVER w AS running_total,\n       ROW_NUMBER() OVER (\n         PARTITION BY customer_id\n         ORDER BY total_amount DESC\n       ) AS rank_by_amount\nFROM orders\nWHERE status = 'PAID'\nWINDOW w AS (\n  PARTITION BY customer_id\n  ORDER BY order_date\n  ROWS UNBOUNDED PRECEDING\n);",
      sqlserver: "SELECT customer_id,\n       order_date,\n       total_amount,\n       SUM(total_amount) OVER (\n         PARTITION BY customer_id\n         ORDER BY order_date\n         ROWS UNBOUNDED PRECEDING\n       ) AS running_total,\n       ROW_NUMBER() OVER (\n         PARTITION BY customer_id\n         ORDER BY total_amount DESC\n       ) AS rank_by_amount\nFROM orders\nWHERE status = 'PAID';"
    },
    attention: [
      "Frame di default con ORDER BY e RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW — non ROWS. Puo produrre risultati inattesi con duplicati.",
      "PostgreSQL supporta named windows (WINDOW w AS ...) per riutilizzare la stessa finestra; SQLite e SQL Server no.",
      "SQLite supporta window functions dalla 3.25.0. SQL Server non supporta GROUPS frame."
    ]
  },
  {
    title: "LAG / LEAD",
    summary: "Accesso alla riga precedente (LAG) o successiva (LEAD) nella finestra per confronti temporali e delta.",
    args: ["colonna target", "offset (default 1)", "valore default se NULL", "finestra OVER(...)"],
    snippets: {
      sqlite: "WITH monthly AS (\n  SELECT substr(order_date, 1, 7) AS mese,\n         ROUND(SUM(total_amount), 2) AS revenue\n  FROM orders WHERE status IN ('PAID','SHIPPED')\n  GROUP BY substr(order_date, 1, 7)\n)\nSELECT mese, revenue,\n       LAG(revenue, 1, 0) OVER (ORDER BY mese) AS prev_month,\n       ROUND(revenue - LAG(revenue, 1, 0) OVER (ORDER BY mese), 2) AS delta\nFROM monthly;",
      postgresql: "WITH monthly AS (\n  SELECT to_char(order_date::date, 'YYYY-MM') AS mese,\n         ROUND(SUM(total_amount)::numeric, 2) AS revenue\n  FROM orders WHERE status IN ('PAID','SHIPPED')\n  GROUP BY to_char(order_date::date, 'YYYY-MM')\n)\nSELECT mese, revenue,\n       LAG(revenue, 1, 0) OVER (ORDER BY mese) AS prev_month,\n       ROUND(revenue - LAG(revenue, 1, 0) OVER (ORDER BY mese), 2) AS delta\nFROM monthly;",
      sqlserver: "WITH monthly AS (\n  SELECT LEFT(order_date, 7) AS mese,\n         ROUND(SUM(total_amount), 2) AS revenue\n  FROM orders WHERE status IN ('PAID','SHIPPED')\n  GROUP BY LEFT(order_date, 7)\n)\nSELECT mese, revenue,\n       LAG(revenue, 1, 0) OVER (ORDER BY mese) AS prev_month,\n       ROUND(revenue - LAG(revenue, 1, 0) OVER (ORDER BY mese), 2) AS delta\nFROM monthly;"
    },
    attention: [
      "LAG senza terzo parametro restituisce NULL per la prima riga — gestire con COALESCE o default.",
      "LAG richiede ORDER BY nella clausola OVER per avere risultati deterministici.",
      "IGNORE NULLS supportato in PostgreSQL 16+ e Oracle, non in SQLite ne SQL Server."
    ]
  },
  {
    title: "CASE WHEN",
    summary: "Logica condizionale inline per classificare righe, calcolare tariffe e creare flag.",
    args: ["condizione WHEN", "valore THEN", "ramo ELSE opzionale", "END obbligatorio"],
    snippets: {
      sqlite: "SELECT name, total_amount,\n       CASE\n         WHEN total_amount > 1000 THEN 'Alto'\n         WHEN total_amount > 200  THEN 'Medio'\n         ELSE 'Basso'\n       END AS fascia,\n       CASE status\n         WHEN 'PAID' THEN 1\n         WHEN 'SHIPPED' THEN 1\n         ELSE 0\n       END AS billable\nFROM orders\nORDER BY total_amount DESC\nLIMIT 20;",
      postgresql: "SELECT name, total_amount,\n       CASE\n         WHEN total_amount > 1000 THEN 'Alto'\n         WHEN total_amount > 200  THEN 'Medio'\n         ELSE 'Basso'\n       END AS fascia,\n       CASE status\n         WHEN 'PAID' THEN 1\n         WHEN 'SHIPPED' THEN 1\n         ELSE 0\n       END AS billable\nFROM orders\nORDER BY total_amount DESC\nLIMIT 20;",
      sqlserver: "SELECT TOP 20 name, total_amount,\n       CASE\n         WHEN total_amount > 1000 THEN 'Alto'\n         WHEN total_amount > 200  THEN 'Medio'\n         ELSE 'Basso'\n       END AS fascia,\n       CASE status\n         WHEN 'PAID' THEN 1\n         WHEN 'SHIPPED' THEN 1\n         ELSE 0\n       END AS billable\nFROM orders\nORDER BY total_amount DESC;"
    },
    attention: [
      "Omettere ELSE produce NULL implicito — puo causare errori a valle.",
      "In PostgreSQL i tipi dei rami THEN/ELSE devono essere compatibili o servono CAST espliciti.",
      "CASE valuta i WHEN in ordine: il primo vero vince, gli altri vengono saltati."
    ]
  },
  {
    title: "Subquery e EXISTS / IN / NOT IN",
    summary: "Query annidate per filtri correlati, membership test e anti-join pattern.",
    args: ["subquery correlata o non correlata", "operatore (EXISTS, IN, NOT IN, NOT EXISTS)"],
    snippets: {
      sqlite: "-- Clienti con almeno un ordine pagato (EXISTS)\nSELECT c.name, c.segment\nFROM customers c\nWHERE EXISTS (\n  SELECT 1 FROM orders o\n  WHERE o.customer_id = c.id AND o.status = 'PAID'\n);\n\n-- Prodotti mai ordinati (NOT IN)\nSELECT p.name FROM products p\nWHERE p.id NOT IN (\n  SELECT DISTINCT product_id FROM order_items\n);",
      postgresql: "-- Clienti con almeno un ordine pagato (EXISTS)\nSELECT c.name, c.segment\nFROM customers c\nWHERE EXISTS (\n  SELECT 1 FROM orders o\n  WHERE o.customer_id = c.id AND o.status = 'PAID'\n);\n\n-- Prodotti mai ordinati (NOT EXISTS — piu sicuro con NULL)\nSELECT p.name FROM products p\nWHERE NOT EXISTS (\n  SELECT 1 FROM order_items oi WHERE oi.product_id = p.id\n);",
      sqlserver: "-- Clienti con almeno un ordine pagato (EXISTS)\nSELECT c.name, c.segment\nFROM customers c\nWHERE EXISTS (\n  SELECT 1 FROM orders o\n  WHERE o.customer_id = c.id AND o.status = 'PAID'\n);\n\n-- Prodotti mai ordinati (NOT EXISTS)\nSELECT p.name FROM products p\nWHERE NOT EXISTS (\n  SELECT 1 FROM order_items oi WHERE oi.product_id = p.id\n);"
    },
    attention: [
      "NOT IN con subquery che contiene NULL restituisce sempre zero righe — preferire NOT EXISTS.",
      "Subquery correlate vengono rieseguite per ogni riga della query esterna: costose su grandi volumi.",
      "EXISTS si ferma al primo match (short-circuit), IN deve valutare tutta la lista."
    ]
  },
  {
    title: "COALESCE / NULLIF",
    summary: "Gestione valori NULL: sostituzione con default (COALESCE) e protezione divisione per zero (NULLIF).",
    args: ["COALESCE: lista valori in ordine di priorita", "NULLIF: due espressioni da confrontare"],
    snippets: {
      sqlite: "SELECT c.name,\n       COALESCE(SUM(o.total_amount), 0) AS total_spent,\n       ROUND(\n         SUM(o.total_amount) / NULLIF(COUNT(o.id), 0),\n       2) AS avg_order\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.id;",
      postgresql: "SELECT c.name,\n       COALESCE(SUM(o.total_amount), 0) AS total_spent,\n       ROUND(\n         (SUM(o.total_amount) / NULLIF(COUNT(o.id), 0))::numeric,\n       2) AS avg_order\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.id, c.name;",
      sqlserver: "SELECT c.name,\n       ISNULL(SUM(o.total_amount), 0) AS total_spent,\n       ROUND(\n         SUM(o.total_amount) / NULLIF(COUNT(o.id), 0),\n       2) AS avg_order\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.id, c.name;"
    },
    attention: [
      "SQL Server ha ISNULL(a, b) come alternativa a COALESCE per due argomenti — leggermente piu veloce.",
      "COALESCE valuta tutti gli argomenti: subquery costose vengono eseguite anche se non necessarie.",
      "NULLIF(a, b) restituisce NULL se a = b — il NULL si propaga in tutte le espressioni successive."
    ]
  },
  {
    title: "CAST / CONVERT / TRY_CONVERT",
    summary: "Conversione tipi con differenze significative di sintassi tra dialetti.",
    args: ["tipo destinazione", "espressione da convertire", "stile opzionale (solo SQL Server CONVERT)"],
    snippets: {
      sqlite: "SELECT CAST(total_amount AS INTEGER) AS total_int,\n       CONVERT('TEXT', total_amount) AS total_text,\n       TRY_CONVERT('REAL', total_amount) AS total_real\nFROM orders\nLIMIT 10;",
      postgresql: "SELECT CAST(total_amount AS INTEGER) AS total_int,\n       total_amount::text AS total_text,\n       CAST(total_amount AS NUMERIC) AS total_real\nFROM orders\nLIMIT 10;\n-- PostgreSQL non ha CONVERT ne TRY_CONVERT nativi",
      sqlserver: "SELECT CAST(total_amount AS INT) AS total_int,\n       CONVERT(VARCHAR(50), total_amount) AS total_text,\n       TRY_CONVERT(FLOAT, total_amount) AS total_real,\n       CONVERT(VARCHAR(10), GETDATE(), 120) AS data_iso\nFROM orders;"
    },
    attention: [
      "CONVERT non e standard SQL: esiste in SQL Server ma non in PostgreSQL (usare CAST o ::).",
      "TRY_CONVERT e esclusiva SQL Server: ritorna NULL su fallimento. PostgreSQL/SQLite non la supportano.",
      "In SQLite questo lab fornisce CONVERT e TRY_CONVERT come funzioni custom per scopi didattici."
    ]
  },
  {
    title: "INSERT / UPDATE / DELETE",
    summary: "Manipolazione dati: inserimento, aggiornamento e cancellazione righe.",
    args: ["tabella target", "colonne/valori", "WHERE in update/delete"],
    snippets: {
      sqlite: "-- INSERT con valori multipli\nINSERT INTO customer_notes (customer_id, note_date, note_type, note_text, author_employee_id)\nVALUES (1, '2026-02-01', 'followup', 'Customer requested renewal', 2),\n       (3, '2026-02-01', 'alert', 'Payment overdue', 5);\n\n-- UPDATE con filtro\nUPDATE products SET price = ROUND(price * 1.05, 2)\nWHERE category = 'Software' AND stock > 0;\n\n-- DELETE con filtro\nDELETE FROM customer_notes WHERE note_type = 'obsolete';",
      postgresql: "-- INSERT con RETURNING\nINSERT INTO customer_notes (customer_id, note_date, note_type, note_text, author_employee_id)\nVALUES (1, '2026-02-01', 'followup', 'Customer requested renewal', 2)\nRETURNING id, note_date;\n\n-- UPDATE con RETURNING\nUPDATE products SET price = ROUND(price * 1.05, 2)\nWHERE category = 'Software' AND stock > 0\nRETURNING id, name, price;\n\n-- DELETE con RETURNING\nDELETE FROM customer_notes WHERE note_type = 'obsolete'\nRETURNING id;",
      sqlserver: "-- INSERT con OUTPUT\nINSERT INTO customer_notes (customer_id, note_date, note_type, note_text, author_employee_id)\nOUTPUT INSERTED.id, INSERTED.note_date\nVALUES (1, '2026-02-01', 'followup', 'Customer requested renewal', 2);\n\n-- UPDATE con OUTPUT\nUPDATE products SET price = ROUND(price * 1.05, 2)\nOUTPUT INSERTED.id, INSERTED.name, INSERTED.price\nWHERE category = 'Software' AND stock > 0;\n\n-- DELETE con OUTPUT\nDELETE FROM customer_notes\nOUTPUT DELETED.id\nWHERE note_type = 'obsolete';"
    },
    attention: [
      "UPDATE/DELETE senza WHERE impattano TUTTE le righe — sempre verificare prima con SELECT.",
      "PostgreSQL ha RETURNING; SQL Server ha OUTPUT. SQLite ha RETURNING dalla 3.35.0.",
      "INSERT senza lista colonne esplicita rompe se lo schema cambia."
    ]
  },
  {
    title: "Transazioni (BEGIN / COMMIT / ROLLBACK)",
    summary: "Atomicita delle operazioni con blocchi transazionali e rollback.",
    args: ["BEGIN per aprire", "query DML intermedie", "COMMIT per confermare o ROLLBACK per annullare"],
    snippets: {
      sqlite: "BEGIN;\nUPDATE products SET price = ROUND(price * 1.03, 2)\nWHERE category = 'Software';\n-- Verifica risultato\nSELECT name, price FROM products WHERE category = 'Software' LIMIT 5;\n-- Se ok: COMMIT; altrimenti:\nROLLBACK;",
      postgresql: "BEGIN;\nUPDATE products SET price = ROUND(price * 1.03, 2)\nWHERE category = 'Software';\nSAVEPOINT before_delete;\nDELETE FROM customer_notes WHERE note_type = 'obsolete';\n-- Se il delete era sbagliato:\nROLLBACK TO SAVEPOINT before_delete;\nCOMMIT;",
      sqlserver: "BEGIN TRANSACTION;\nUPDATE products SET price = ROUND(price * 1.03, 2)\nWHERE category = 'Software';\nSAVE TRANSACTION before_delete;\nDELETE FROM customer_notes WHERE note_type = 'obsolete';\n-- Se il delete era sbagliato:\nROLLBACK TRANSACTION before_delete;\nCOMMIT TRANSACTION;"
    },
    attention: [
      "SQLite supporta solo una transazione write alla volta (serialized).",
      "In PostgreSQL una transazione in stato di errore non accetta piu comandi: serve ROLLBACK.",
      "SQL Server usa BEGIN TRANSACTION / COMMIT TRANSACTION / ROLLBACK TRANSACTION (non solo BEGIN/COMMIT)."
    ]
  },
  {
    title: "CREATE TABLE / ALTER TABLE",
    summary: "Definizione ed evoluzione schema con vincoli, tipi e differenze di dialetto.",
    args: ["nome tabella", "colonne con tipi", "vincoli PK/FK/UNIQUE/CHECK/DEFAULT"],
    snippets: {
      sqlite: "CREATE TABLE IF NOT EXISTS audit_log (\n  id INTEGER PRIMARY KEY,\n  entity TEXT NOT NULL,\n  event_type TEXT NOT NULL CHECK(event_type IN ('INSERT','UPDATE','DELETE')),\n  payload TEXT,\n  created_at TEXT NOT NULL DEFAULT (datetime('now'))\n);\n\nALTER TABLE customers ADD COLUMN churn_risk REAL;",
      postgresql: "CREATE TABLE IF NOT EXISTS audit_log (\n  id BIGSERIAL PRIMARY KEY,\n  entity TEXT NOT NULL,\n  event_type TEXT NOT NULL CHECK(event_type IN ('INSERT','UPDATE','DELETE')),\n  payload JSONB,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);\n\nALTER TABLE customers ADD COLUMN churn_risk NUMERIC(5,2) DEFAULT 0;",
      sqlserver: "CREATE TABLE audit_log (\n  id BIGINT IDENTITY(1,1) PRIMARY KEY,\n  entity NVARCHAR(120) NOT NULL,\n  event_type NVARCHAR(20) NOT NULL CHECK(event_type IN ('INSERT','UPDATE','DELETE')),\n  payload NVARCHAR(MAX),\n  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()\n);\n\nALTER TABLE customers ADD churn_risk DECIMAL(5,2);"
    },
    attention: [
      "SQLite ha ALTER TABLE limitato: DROP COLUMN solo dalla 3.35.0, no ALTER COLUMN type.",
      "INTEGER PRIMARY KEY in SQLite diventa alias per ROWID (auto-increment). PostgreSQL usa SERIAL/BIGSERIAL. SQL Server usa IDENTITY.",
      "IF NOT EXISTS supportato in SQLite e PostgreSQL. SQL Server richiede IF NOT EXISTS con query di sistema."
    ]
  },
  {
    title: "CREATE INDEX",
    summary: "Creazione indici per accelerare filtri, join e ordinamenti.",
    args: ["nome indice", "tabella target", "colonne da indicizzare", "UNIQUE/opzioni"],
    snippets: {
      sqlite: "CREATE INDEX idx_orders_customer_date\nON orders (customer_id, order_date);\n\n-- Partial index\nCREATE INDEX idx_orders_paid\nON orders (customer_id)\nWHERE status = 'PAID';",
      postgresql: "-- Creazione non-blocking\nCREATE INDEX CONCURRENTLY idx_orders_customer_date\nON orders (customer_id, order_date);\n\n-- Covering index\nCREATE INDEX idx_orders_covering\nON orders (customer_id) INCLUDE (total_amount, status);",
      sqlserver: "CREATE NONCLUSTERED INDEX idx_orders_customer_date\nON orders (customer_id, order_date)\nINCLUDE (total_amount)\nWITH (ONLINE = ON);"
    },
    attention: [
      "Troppi indici rallentano INSERT/UPDATE/DELETE.",
      "CREATE INDEX CONCURRENTLY (PostgreSQL) non blocca la tabella ma e piu lento.",
      "Partial index (WHERE) e INCLUDE riducono dimensione indice e migliorano performance."
    ]
  },
  {
    title: "EXPLAIN / QUERY PLAN",
    summary: "Diagnostica piani esecuzione, scansioni e uso indici con sintassi specifica per dialetto.",
    args: ["query target da analizzare"],
    snippets: {
      sqlite: "EXPLAIN QUERY PLAN\nSELECT c.name, SUM(o.total_amount)\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE c.segment = 'Enterprise'\nGROUP BY c.id;",
      postgresql: "EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)\nSELECT c.name, SUM(o.total_amount)\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE c.segment = 'Enterprise'\nGROUP BY c.id, c.name;",
      sqlserver: "SET STATISTICS IO ON;\nSET STATISTICS TIME ON;\nSELECT c.name, SUM(o.total_amount)\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE c.segment = 'Enterprise'\nGROUP BY c.id, c.name;\nSET STATISTICS IO OFF;\nSET STATISTICS TIME OFF;"
    },
    attention: [
      "SQLite: EXPLAIN QUERY PLAN mostra strategia ad alto livello (SCAN/SEARCH/USE INDEX).",
      "PostgreSQL: EXPLAIN mostra piano stimato; EXPLAIN ANALYZE esegue realmente la query e mostra tempi effettivi.",
      "SQL Server: SET SHOWPLAN_TEXT ON o Actual Execution Plan in SSMS per piano grafico."
    ]
  },
  {
    title: "Set Operations (UNION / INTERSECT / EXCEPT)",
    summary: "Combinazione o confronto di result set compatibili.",
    args: ["SELECT sinistra", "SELECT destra", "UNION [ALL] / INTERSECT / EXCEPT"],
    snippets: {
      sqlite: "-- Conteggi da tabelle diverse\nSELECT 'Ordini' AS fonte, COUNT(*) AS n FROM orders\nUNION ALL\nSELECT 'Resi', COUNT(*) FROM returns\nUNION ALL\nSELECT 'Ticket', COUNT(*) FROM support_tickets;\n\n-- Clienti con ordini MA senza ticket\nSELECT customer_id FROM orders\nEXCEPT\nSELECT customer_id FROM support_tickets;",
      postgresql: "SELECT 'Ordini' AS fonte, COUNT(*) AS n FROM orders\nUNION ALL\nSELECT 'Resi', COUNT(*) FROM returns\nUNION ALL\nSELECT 'Ticket', COUNT(*) FROM support_tickets;\n\nSELECT customer_id FROM orders\nEXCEPT\nSELECT customer_id FROM support_tickets;",
      sqlserver: "SELECT 'Ordini' AS fonte, COUNT(*) AS n FROM orders\nUNION ALL\nSELECT 'Resi', COUNT(*) FROM returns\nUNION ALL\nSELECT 'Ticket', COUNT(*) FROM support_tickets;\n\nSELECT customer_id FROM orders\nEXCEPT\nSELECT customer_id FROM support_tickets;"
    },
    attention: [
      "UNION deduplica (costoso) — usare UNION ALL quando i duplicati non sono un problema.",
      "Le SELECT unite devono avere lo stesso numero e tipo compatibile di colonne.",
      "ORDER BY si applica al risultato finale dell'intero UNION, non alla singola SELECT."
    ]
  }
];
