export const SYNTAX_TOPICS = [
  {
    title: 'DDL: creare tabelle fatti e dimensioni',
    summary: 'Definizione schema base per fatti ordini e dimensioni clienti/date.',
    args: ['CREATE TABLE', 'PRIMARY KEY', 'FOREIGN KEY', 'CHECK'],
    snippets: {
      sqlite: "CREATE TABLE IF NOT EXISTS fact_orders_demo (\n  order_id INTEGER PRIMARY KEY,\n  date TEXT REFERENCES dim_date(date),\n  customer_id INTEGER REFERENCES customers(id),\n  total_amount REAL CHECK(total_amount >= 0),\n  status TEXT,\n  channel TEXT\n);",
      postgresql: "CREATE TABLE IF NOT EXISTS fact_orders_demo (\n  order_id INTEGER PRIMARY KEY,\n  date date REFERENCES dim_date(date),\n  customer_id INTEGER REFERENCES customers(id),\n  total_amount numeric CHECK(total_amount >= 0),\n  status text,\n  channel text\n);",
      sqlserver: "IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='fact_orders_demo')\nCREATE TABLE fact_orders_demo (\n  order_id INT PRIMARY KEY,\n  [date] DATE FOREIGN KEY REFERENCES dim_date([date]),\n  customer_id INT FOREIGN KEY REFERENCES customers(id),\n  total_amount DECIMAL(18,2) CHECK (total_amount >= 0),\n  status NVARCHAR(50),\n  channel NVARCHAR(50)\n);"
    },
    attention: ['Usa tipi coerenti tra fatto e dimensioni', 'CHECK previene numeri negativi', 'FK richiede indici sulle chiavi referenziate']
  },
  {
    title: 'DML: inserimento ordini',
    summary: 'Inserimento multiplo di record con INSERT ... VALUES.',
    args: ['INSERT', 'VALORI multipli', 'Tipo coerente con schema'],
    snippets: {
      sqlite: "INSERT INTO orders (id, customer_id, order_date, status, currency, total_amount, channel)\nVALUES (5001, 10, '2025-02-01', 'PAID', 'EUR', 120.50, 'online'),\n       (5002, 12, '2025-02-02', 'SHIPPED', 'EUR', 89.00, 'physical');",
      postgresql: "INSERT INTO orders (id, customer_id, order_date, status, currency, total_amount, channel)\nVALUES (5001, 10, '2025-02-01', 'PAID', 'EUR', 120.50, 'online'),\n       (5002, 12, '2025-02-02', 'SHIPPED', 'EUR', 89.00, 'physical');",
      sqlserver: "INSERT INTO orders (id, customer_id, order_date, status, currency, total_amount, channel)\nVALUES (5001, 10, '2025-02-01', 'PAID', 'EUR', 120.50, 'online'),\n       (5002, 12, '2025-02-02', 'SHIPPED', 'EUR', 89.00, 'physical');"
    },
    attention: ['Validare FK prima di inserire', 'Batch insert riduce round-trip']
  },
  {
    title: 'DML: upsert / conflitti',
    summary: 'Aggiorna se esiste, inserisce se assente.',
    args: ['UNIQUE key', 'ON CONFLICT/ON DUPLICATE', 'UPDATE set'],
    snippets: {
      sqlite: "INSERT INTO customers (id, name, segment)\nVALUES (1, 'Customer 1', 'SMB')\nON CONFLICT(id) DO UPDATE SET segment = excluded.segment;",
      postgresql: "INSERT INTO customers (id, name, segment)\nVALUES (1, 'Customer 1', 'SMB')\nON CONFLICT (id) DO UPDATE SET segment = EXCLUDED.segment;",
      sqlserver: "MERGE customers AS target\nUSING (VALUES (1, 'Customer 1', 'SMB')) AS src(id, name, segment)\nON target.id = src.id\nWHEN MATCHED THEN UPDATE SET segment = src.segment\nWHEN NOT MATCHED THEN INSERT (id, name, segment) VALUES (src.id, src.name, src.segment);"
    },
    attention: ['Scegli chiave unica chiara', 'In SQL Server MERGE richiede attenzione a race condition']
  },
  {
    title: 'TCL: transazioni con SAVEPOINT',
    summary: 'Transazioni annidate per rollback parziale.',
    args: ['BEGIN', 'SAVEPOINT', 'ROLLBACK TO', 'RELEASE'],
    snippets: {
      sqlite: "BEGIN;\nSAVEPOINT sp1;\nUPDATE orders SET status='PENDING' WHERE id=1;\nROLLBACK TO sp1;\nCOMMIT;",
      postgresql: "BEGIN;\nSAVEPOINT sp1;\nUPDATE orders SET status='PENDING' WHERE id=1;\nROLLBACK TO sp1;\nCOMMIT;",
      sqlserver: "BEGIN TRAN;\nSAVE TRAN sp1;\nUPDATE orders SET status='PENDING' WHERE id=1;\nROLLBACK TRAN sp1;\nCOMMIT;"
    },
    attention: ['Ricorda COMMIT finale', 'Lock possono rimanere aperti se dimentichi RELEASE']
  },
  {
    title: 'DCL: GRANT e REVOKE',
    summary: 'Assegna o revoca permessi su oggetti.',
    args: ['GRANT SELECT ON tab', 'REVOKE'],
    snippets: {
      sqlite: '-- Non applicabile in SQLite demo; concetto illustrativo',
      postgresql: "GRANT SELECT ON customers TO analyst;\nREVOKE INSERT ON orders FROM analyst;",
      sqlserver: "GRANT SELECT ON dbo.customers TO analyst;\nREVOKE INSERT ON dbo.orders FROM analyst;"
    },
    attention: ['Non supportato in SQLite in-browser', 'Usare ruoli per gestione scalabile']
  },
  {
    title: 'Top-N per gruppo con ROW_NUMBER',
    summary: 'Estrai le prime N righe per partizione ordinata.',
    args: ['ROW_NUMBER()', 'PARTITION BY', 'ORDER BY', 'filtra su rn'],
    snippets: {
      sqlite: "WITH ranked AS (\n  SELECT customer_id, id AS order_id, total_amount,\n         ROW_NUMBER() OVER(PARTITION BY customer_id ORDER BY total_amount DESC) AS rn\n  FROM orders\n  WHERE status IN ('PAID','SHIPPED')\n)\nSELECT * FROM ranked WHERE rn <= 3;",
      postgresql: "WITH ranked AS (\n  SELECT customer_id, id AS order_id, total_amount,\n         ROW_NUMBER() OVER(PARTITION BY customer_id ORDER BY total_amount DESC) AS rn\n  FROM orders\n  WHERE status IN ('PAID','SHIPPED')\n)\nSELECT * FROM ranked WHERE rn <= 3;",
      sqlserver: "WITH ranked AS (\n  SELECT customer_id, id AS order_id, total_amount,\n         ROW_NUMBER() OVER(PARTITION BY customer_id ORDER BY total_amount DESC) AS rn\n  FROM orders\n  WHERE status IN ('PAID','SHIPPED')\n)\nSELECT * FROM ranked WHERE rn <= 3;"
    },
    attention: ['Aggiungi tie-break per stabilità', 'In BigQuery esiste QUALIFY, qui usiamo CTE']
  },
  {
    title: 'Gap and Islands',
    summary: 'Identifica sequenze continue e intervalli mancanti.',
    args: ['LAG', 'delta', 'window aggregate'],
    snippets: {
      sqlite: "WITH ordered AS (\n  SELECT order_id, date, ROW_NUMBER() OVER(ORDER BY date) AS rn\n  FROM fact_orders\n), islands AS (\n  SELECT order_id, date, rn - ROW_NUMBER() OVER(ORDER BY date) AS grp\n  FROM ordered\n)\nSELECT MIN(date) AS start_date, MAX(date) AS end_date, COUNT(*) AS len\nFROM islands\nGROUP BY grp\nORDER BY start_date;",
      postgresql: "WITH ordered AS (\n  SELECT order_id, date::date AS date, ROW_NUMBER() OVER(ORDER BY date) AS rn\n  FROM fact_orders\n), islands AS (\n  SELECT order_id, date, rn - ROW_NUMBER() OVER(ORDER BY date) AS grp\n  FROM ordered\n)\nSELECT MIN(date) AS start_date, MAX(date) AS end_date, COUNT(*) AS len\nFROM islands\nGROUP BY grp\nORDER BY start_date;",
      sqlserver: "WITH ordered AS (\n  SELECT order_id, CAST([date] AS date) AS [date], ROW_NUMBER() OVER(ORDER BY [date]) AS rn\n  FROM fact_orders\n), islands AS (\n  SELECT order_id, [date], rn - ROW_NUMBER() OVER(ORDER BY [date]) AS grp\n  FROM ordered\n)\nSELECT MIN([date]) AS start_date, MAX([date]) AS end_date, COUNT(*) AS len\nFROM islands\nGROUP BY grp\nORDER BY start_date;"
    },
    attention: ['Frame basato su row_number differenza per identificare blocchi', 'Richiede ordinamento coerente']
  },
  {
    title: 'Sessionization eventi',
    summary: 'Costruisci sessioni da stream eventi con timeout.',
    args: ['LAG su timestamp', 'CASE session_reset', 'running sum'],
    snippets: {
      sqlite: "WITH ordered AS (\n  SELECT user_id, session_id, event_time,\n         LAG(event_time) OVER(PARTITION BY user_id ORDER BY event_time) AS prev_time\n  FROM events\n), flagged AS (\n  SELECT *, CASE WHEN prev_time IS NULL OR (julianday(event_time)-julianday(prev_time))*86400 > 1800 THEN 1 ELSE 0 END AS new_session\n  FROM ordered\n), sess AS (\n  SELECT *, SUM(new_session) OVER(PARTITION BY user_id ORDER BY event_time) AS sess_num\n  FROM flagged\n)\nSELECT user_id, sess_num, MIN(event_time) AS start_time, MAX(event_time) AS end_time, COUNT(*) AS hits\nFROM sess\nGROUP BY user_id, sess_num;",
      postgresql: "WITH ordered AS (\n  SELECT user_id, session_id, event_time,\n         LAG(event_time) OVER(PARTITION BY user_id ORDER BY event_time) AS prev_time\n  FROM events\n), flagged AS (\n  SELECT *, CASE WHEN prev_time IS NULL OR EXTRACT(EPOCH FROM event_time - prev_time) > 1800 THEN 1 ELSE 0 END AS new_session\n  FROM ordered\n), sess AS (\n  SELECT *, SUM(new_session) OVER(PARTITION BY user_id ORDER BY event_time) AS sess_num\n  FROM flagged\n)\nSELECT user_id, sess_num, MIN(event_time) AS start_time, MAX(event_time) AS end_time, COUNT(*) AS hits\nFROM sess\nGROUP BY user_id, sess_num;",
      sqlserver: "WITH ordered AS (\n  SELECT user_id, session_id, event_time,\n         LAG(event_time) OVER(PARTITION BY user_id ORDER BY event_time) AS prev_time\n  FROM events\n), flagged AS (\n  SELECT *, CASE WHEN prev_time IS NULL OR DATEDIFF(second, prev_time, event_time) > 1800 THEN 1 ELSE 0 END AS new_session\n  FROM ordered\n), sess AS (\n  SELECT *, SUM(new_session) OVER(PARTITION BY user_id ORDER BY event_time ROWS UNBOUNDED PRECEDING) AS sess_num\n  FROM flagged\n)\nSELECT user_id, sess_num, MIN(event_time) AS start_time, MAX(event_time) AS end_time, COUNT(*) AS hits\nFROM sess\nGROUP BY user_id, sess_num;"
    },
    attention: ['Timeout parametrico (30 minuti)', 'Richiede dati ordinati per utente']
  },
  {
    title: 'Cohort analysis (prima data ordine)',
    summary: 'Raggruppa clienti per mese del primo ordine e misura attività successiva.',
    args: ['MIN data per cliente', 'JOIN con ordini successivi', 'GROUP BY cohort'],
    snippets: {
      sqlite: "WITH first_order AS (\n  SELECT customer_id, MIN(order_date) AS first_dt FROM orders GROUP BY customer_id\n), activity AS (\n  SELECT f.customer_id, substr(f.first_dt,1,7) AS cohort, substr(o.order_date,1,7) AS ym\n  FROM first_order f JOIN orders o ON o.customer_id = f.customer_id\n)\nSELECT cohort, ym, COUNT(DISTINCT customer_id) AS active\nFROM activity\nGROUP BY cohort, ym\nORDER BY cohort, ym;",
      postgresql: "WITH first_order AS (\n  SELECT customer_id, MIN(order_date::date) AS first_dt FROM orders GROUP BY customer_id\n), activity AS (\n  SELECT f.customer_id, to_char(f.first_dt, 'YYYY-MM') AS cohort, to_char(o.order_date::date, 'YYYY-MM') AS ym\n  FROM first_order f JOIN orders o ON o.customer_id = f.customer_id\n)\nSELECT cohort, ym, COUNT(DISTINCT customer_id) AS active\nFROM activity\nGROUP BY cohort, ym\nORDER BY cohort, ym;",
      sqlserver: "WITH first_order AS (\n  SELECT customer_id, MIN(CAST(order_date AS date)) AS first_dt FROM orders GROUP BY customer_id\n), activity AS (\n  SELECT f.customer_id, FORMAT(f.first_dt,'yyyy-MM') AS cohort, FORMAT(CAST(o.order_date AS date),'yyyy-MM') AS ym\n  FROM first_order f JOIN orders o ON o.customer_id = f.customer_id\n)\nSELECT cohort, ym, COUNT(DISTINCT customer_id) AS active\nFROM activity\nGROUP BY cohort, ym\nORDER BY cohort, ym;"
    },
    attention: ['Usa formato YYYY-MM coerente', 'COUNT DISTINCT può essere pesante su grossi dataset']
  },
  {
    title: 'Funnel add_to_cart → purchase',
    summary: 'Calcola conversioni multi-step da eventi.',
    args: ['Eventi step', 'Aggregation per sessione', 'Conversion rate'],
    snippets: {
      sqlite: "WITH steps AS (\n  SELECT session_id,\n         MAX(event_type='add_to_cart') AS add_cart,\n         MAX(event_type='purchase') AS purchase\n  FROM events\n  GROUP BY session_id\n)\nSELECT SUM(add_cart) AS sessions_cart,\n       SUM(purchase) AS sessions_purchase,\n       ROUND(SUM(purchase)*1.0 / NULLIF(SUM(add_cart),0), 2) AS conv_rate\nFROM steps;",
      postgresql: "WITH steps AS (\n  SELECT session_id,\n         MAX((event_type='add_to_cart')::int) AS add_cart,\n         MAX((event_type='purchase')::int) AS purchase\n  FROM events\n  GROUP BY session_id\n)\nSELECT SUM(add_cart) AS sessions_cart,\n       SUM(purchase) AS sessions_purchase,\n       ROUND(SUM(purchase)::numeric / NULLIF(SUM(add_cart),0), 2) AS conv_rate\nFROM steps;",
      sqlserver: "WITH steps AS (\n  SELECT session_id,\n         MAX(CASE WHEN event_type='add_to_cart' THEN 1 ELSE 0 END) AS add_cart,\n         MAX(CASE WHEN event_type='purchase' THEN 1 ELSE 0 END) AS purchase\n  FROM events\n  GROUP BY session_id\n)\nSELECT SUM(add_cart) AS sessions_cart,\n       SUM(purchase) AS sessions_purchase,\n       ROUND(SUM(CONVERT(float,purchase)) / NULLIF(SUM(add_cart),0), 2) AS conv_rate\nFROM steps;"
    },
    attention: ['MAX booleani per step', 'Gestire divisione per zero']
  },
  {
    title: 'Retention mensile',
    summary: 'Misura utenti attivi per mese rispetto alla coorte di ingresso.',
    args: ['Prima data', 'Pivot o group', 'COUNT DISTINCT'],
    snippets: {
      sqlite: "WITH first_order AS (\n  SELECT customer_id, MIN(order_date) AS first_dt FROM orders GROUP BY customer_id\n), activity AS (\n  SELECT f.customer_id, substr(f.first_dt,1,7) AS cohort, substr(o.order_date,1,7) AS ym\n  FROM first_order f JOIN orders o ON o.customer_id = f.customer_id\n)\nSELECT cohort, ym, COUNT(DISTINCT customer_id) AS retained\nFROM activity\nGROUP BY cohort, ym\nORDER BY cohort, ym;",
      postgresql: "WITH first_order AS (\n  SELECT customer_id, MIN(order_date::date) AS first_dt FROM orders GROUP BY customer_id\n), activity AS (\n  SELECT f.customer_id, to_char(f.first_dt,'YYYY-MM') AS cohort, to_char(o.order_date::date,'YYYY-MM') AS ym\n  FROM first_order f JOIN orders o ON o.customer_id = f.customer_id\n)\nSELECT cohort, ym, COUNT(DISTINCT customer_id) AS retained\nFROM activity\nGROUP BY cohort, ym\nORDER BY cohort, ym;",
      sqlserver: "WITH first_order AS (\n  SELECT customer_id, MIN(CAST(order_date AS date)) AS first_dt FROM orders GROUP BY customer_id\n), activity AS (\n  SELECT f.customer_id, FORMAT(f.first_dt,'yyyy-MM') AS cohort, FORMAT(CAST(o.order_date AS date),'yyyy-MM') AS ym\n  FROM first_order f JOIN orders o ON o.customer_id = f.customer_id\n)\nSELECT cohort, ym, COUNT(DISTINCT customer_id) AS retained\nFROM activity\nGROUP BY cohort, ym\nORDER BY cohort, ym;"
    },
    attention: ['Simile a cohort ma focalizzato su retention', 'Possibile pivot per vista matrice']
  },
  {
    title: 'Window: running total',
    summary: 'Somma cumulativa ordinata per data.',
    args: ['SUM OVER', 'PARTITION opzionale', 'ORDER BY data'],
    snippets: {
      sqlite: "SELECT date, SUM(total_amount) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) AS running_revenue\nFROM fact_orders\nORDER BY date\nLIMIT 50;",
      postgresql: "SELECT date, SUM(total_amount) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) AS running_revenue\nFROM fact_orders\nORDER BY date\nLIMIT 50;",
      sqlserver: "SELECT [date], SUM(total_amount) OVER (ORDER BY [date] ROWS UNBOUNDED PRECEDING) AS running_revenue\nFROM fact_orders\nORDER BY [date]\nOFFSET 0 ROWS FETCH FIRST 50 ROWS ONLY;"
    },
    attention: ['Usa ROWS per comportamento deterministico', 'Ordinamento necessario']
  },
  {
    title: 'Window: moving average',
    summary: 'Media mobile su finestra scorrevole.',
    args: ['AVG OVER', 'ROWS BETWEEN n PRECEDING AND CURRENT ROW'],
    snippets: {
      sqlite: "SELECT date, total_amount,\n       AVG(total_amount) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS avg_7d\nFROM fact_orders\nORDER BY date;",
      postgresql: "SELECT date, total_amount,\n       AVG(total_amount) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS avg_7d\nFROM fact_orders;",
      sqlserver: "SELECT [date], total_amount,\n       AVG(total_amount) OVER (ORDER BY [date] ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS avg_7d\nFROM fact_orders;"
    },
    attention: ['Frame ROWS vs RANGE cambia risultato', 'Gestire bordi con meno di n righe']
  },
  {
    title: 'Data quality: valori null o duplicati',
    summary: 'Rileva problemi controllati nel dataset.',
    args: ['IS NULL', 'COUNT > 1', 'GROUP BY'],
    snippets: {
      sqlite: "SELECT 'missing_contact' AS issue, COUNT(*) AS n FROM customers WHERE email IS NULL AND phone IS NULL\nUNION ALL\nSELECT 'duplicate_session', COUNT(*) FROM events GROUP BY session_id HAVING COUNT(*)>5;",
      postgresql: "SELECT 'missing_contact' AS issue, COUNT(*) AS n FROM customers WHERE email IS NULL AND phone IS NULL\nUNION ALL\nSELECT 'duplicate_session', COUNT(*) FROM events GROUP BY session_id HAVING COUNT(*)>5;",
      sqlserver: "SELECT 'missing_contact' AS issue, COUNT(*) AS n FROM customers WHERE email IS NULL AND phone IS NULL\nUNION ALL\nSELECT 'duplicate_session', COUNT(*) FROM events GROUP BY session_id HAVING COUNT(*)>5;"
    },
    attention: ['NULL richiede IS NULL', 'Duplicati controllati con HAVING COUNT > 1']
  },
  {
    title: 'Data quality: outlier detection',
    summary: 'Trova valori estremi con z-score semplice.',
    args: ['AVG', 'STDDEV', 'CASE outlier'],
    snippets: {
      sqlite: "WITH base AS (\n  SELECT total_amount FROM orders WHERE total_amount IS NOT NULL\n), avg_calc AS (\n  SELECT AVG(total_amount) AS avg_amt FROM base\n), stats AS (\n  SELECT a.avg_amt, sqrt(AVG((b.total_amount - a.avg_amt)*(b.total_amount - a.avg_amt))) AS std\n  FROM base b CROSS JOIN avg_calc a\n)\nSELECT o.id, o.total_amount\nFROM orders o CROSS JOIN stats s\nWHERE o.total_amount > s.avg_amt + 3*s.std;",
      postgresql: "WITH stats AS (\n  SELECT AVG(total_amount) AS avg_amt, STDDEV_POP(total_amount) AS std FROM orders WHERE total_amount IS NOT NULL\n)\nSELECT o.id, o.total_amount\nFROM orders o, stats s\nWHERE o.total_amount > s.avg_amt + 3*s.std;",
      sqlserver: "WITH stats AS (\n  SELECT AVG(total_amount) AS avg_amt, STDEV(total_amount) AS std FROM orders WHERE total_amount IS NOT NULL\n)\nSELECT o.id, o.total_amount\nFROM orders o, stats s\nWHERE o.total_amount > s.avg_amt + 3*s.std;"
    },
    attention: ['Semplice z-score, non robusto', 'Calcolo stddev differisce tra dialetti']
  },
  {
    title: 'Indexing basics',
    summary: 'Creare indice combinato per query frequenti.',
    args: ['CREATE INDEX', 'colonne nel WHERE/ORDER BY', 'EXPLAIN per verifica'],
    snippets: {
      sqlite: "CREATE INDEX IF NOT EXISTS idx_orders_customer_date ON orders(customer_id, order_date);\nEXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id=10 AND order_date>'2025-01-01' ORDER BY order_date DESC;",
      postgresql: "CREATE INDEX IF NOT EXISTS idx_orders_customer_date ON orders(customer_id, order_date);\nEXPLAIN SELECT * FROM orders WHERE customer_id=10 AND order_date>'2025-01-01' ORDER BY order_date DESC;",
      sqlserver: "CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date);\nSET STATISTICS IO ON;\nSELECT * FROM orders WHERE customer_id=10 AND order_date>'2025-01-01' ORDER BY order_date DESC;"
    },
    attention: ['Ordine delle colonne conta', 'Valutare copertura INCLUDE in SQL Server']
  },
  {
    title: 'Explain plan reading',
    summary: 'Leggi il piano per capire indici e join order.',
    args: ['EXPLAIN QUERY PLAN', 'node type', 'cost'],
    snippets: {
      sqlite: "EXPLAIN QUERY PLAN SELECT c.name, SUM(o.total_amount)\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE c.segment='ENT'\nGROUP BY c.id;",
      postgresql: "EXPLAIN (ANALYZE, BUFFERS) SELECT c.name, SUM(o.total_amount)\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE c.segment='ENT'\nGROUP BY c.id;",
      sqlserver: "SET SHOWPLAN_TEXT ON;\nSELECT c.name, SUM(o.total_amount)\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE c.segment='ENT'\nGROUP BY c.id;\nSET SHOWPLAN_TEXT OFF;"
    },
    attention: ['EXPLAIN non esegue in SQLite senza ANALYZE', 'SQL Server usa SHOWPLAN']
  },
  {
    title: 'Incremental load (changed rows)',
    summary: 'Carica solo righe nuove o modificate basandosi su data/flag.',
    args: ['MAX(data caricata)', 'WHERE data > last_max', 'MERGE/UPSERT'],
    snippets: {
      sqlite: "INSERT INTO fact_orders(order_id, date, customer_id, total_amount, status, channel)\nSELECT o.id, o.order_date, o.customer_id, o.total_amount, o.status, o.channel\nFROM orders o\nWHERE o.order_date > (SELECT COALESCE(MAX(date), '1970-01-01') FROM fact_orders);",
      postgresql: "INSERT INTO fact_orders(order_id, date, customer_id, total_amount, status, channel)\nSELECT o.id, o.order_date, o.customer_id, o.total_amount, o.status, o.channel\nFROM orders o\nWHERE o.order_date > (SELECT COALESCE(MAX(date), '1970-01-01') FROM fact_orders);",
      sqlserver: "INSERT INTO fact_orders(order_id, date, customer_id, total_amount, status, channel)\nSELECT o.id, o.order_date, o.customer_id, o.total_amount, o.status, o.channel\nFROM orders o\nWHERE o.order_date > ISNULL((SELECT MAX([date]) FROM fact_orders), '1970-01-01');"
    },
    attention: ['Richiede colonna di watermark', 'Gestire aggiornamenti non solo insert (MERGE)']
  },
  {
    title: 'Slowly Changing Dimension (SCD2 concettuale)',
    summary: 'Gestire versioni storiche con date effective e flag current.',
    args: ['valid_from', 'valid_to', 'is_current', 'MERGE'],
    snippets: {
      sqlite: "-- Esempio concettuale: versiona credit_limit\nCREATE TABLE dim_customer_scd (\n  customer_id INTEGER,\n  valid_from TEXT,\n  valid_to TEXT,\n  is_current INTEGER,\n  credit_limit REAL\n);\n-- Nuova versione\nINSERT INTO dim_customer_scd (customer_id, valid_from, valid_to, is_current, credit_limit)\nVALUES (1, '2025-02-01', '9999-12-31', 1, 5000);",
      postgresql: "-- Stessa struttura con tipi date\nCREATE TABLE dim_customer_scd (\n  customer_id INT,\n  valid_from date,\n  valid_to date,\n  is_current boolean,\n  credit_limit numeric\n);",
      sqlserver: "-- Struttura simile in SQL Server\nCREATE TABLE dim_customer_scd (\n  customer_id INT,\n  valid_from date,\n  valid_to date,\n  is_current bit,\n  credit_limit decimal(18,2)\n);"
    },
    attention: ['Gestire overlap date', 'Flag is_current per query veloci']
  },
  {
    title: 'CTE ricorsiva per calendario',
    summary: 'Genera serie di date per join temporali.',
    args: ['WITH RECURSIVE', 'UNION ALL', 'condizione di stop'],
    snippets: {
      sqlite: "WITH RECURSIVE dates(d) AS (\n  SELECT date('2025-01-01')\n  UNION ALL\n  SELECT date(d, '+1 day') FROM dates WHERE d < '2025-12-31'\n)\nSELECT COUNT(*) FROM dates;",
      postgresql: "WITH RECURSIVE dates(d) AS (\n  SELECT DATE '2025-01-01'\n  UNION ALL\n  SELECT d + INTERVAL '1 day' FROM dates WHERE d < DATE '2025-12-31'\n)\nSELECT COUNT(*) FROM dates;",
      sqlserver: "WITH dates(d) AS (\n  SELECT CAST('2025-01-01' AS date)\n  UNION ALL\n  SELECT DATEADD(day,1,d) FROM dates WHERE d < '2025-12-31'\n)\nSELECT COUNT(*) FROM dates OPTION (MAXRECURSION 400);"
    },
    attention: ['Impostare MAXRECURSION in SQL Server', 'Condizione di stop per evitare loop']
  },
  {
    title: 'Pivot semplice con CASE',
    summary: 'Trasforma righe in colonne manualmente.',
    args: ['CASE WHEN', 'SUM/COUNT', 'GROUP BY'],
    snippets: {
      sqlite: "SELECT status,\n       SUM(CASE WHEN channel='online' THEN 1 ELSE 0 END) AS online_orders,\n       SUM(CASE WHEN channel='physical' THEN 1 ELSE 0 END) AS store_orders\nFROM orders\nGROUP BY status;",
      postgresql: "SELECT status,\n       SUM(CASE WHEN channel='online' THEN 1 ELSE 0 END) AS online_orders,\n       SUM(CASE WHEN channel='physical' THEN 1 ELSE 0 END) AS store_orders\nFROM orders\nGROUP BY status;",
      sqlserver: "SELECT status,\n       SUM(CASE WHEN channel='online' THEN 1 ELSE 0 END) AS online_orders,\n       SUM(CASE WHEN channel='physical' THEN 1 ELSE 0 END) AS store_orders\nFROM orders\nGROUP BY status;"
    },
    attention: ['Preferire PIVOT nativo se disponibile', 'CASE deve coprire tutti i casi']
  },
  {
    title: 'Window percentile/median (approx)',
    summary: 'Percentili con PERCENTILE_CONT/APPROX.',
    args: ['PERCENTILE_CONT', 'WITHIN GROUP', 'OVER'],
    snippets: {
      sqlite: "SELECT total_amount FROM orders ORDER BY total_amount LIMIT 1 OFFSET (SELECT COUNT(*)/2 FROM orders); -- approx median",
      postgresql: "SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_amount) AS median FROM orders;",
      sqlserver: "SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_amount) OVER() AS median FROM orders;"
    },
    attention: ['SQLite non ha percentile built-in', 'SQL Server richiede OVER anche senza PARTITION']
  },
  {
    title: 'ROLLUP e GROUPING SETS',
    summary: 'Aggregazioni multiple in un’unica query.',
    args: ['GROUP BY ROLLUP', 'GROUPING SETS', 'COALESCE su NULL'],
    snippets: {
      sqlite: "-- Non supportato nativamente; usare UNION ALL\nSELECT channel, status, COUNT(*) AS n FROM orders GROUP BY channel, status\nUNION ALL\nSELECT channel, NULL, COUNT(*) FROM orders GROUP BY channel;",
      postgresql: "SELECT channel, status, COUNT(*)\nFROM orders\nGROUP BY ROLLUP(channel, status);",
      sqlserver: "SELECT channel, status, COUNT(*)\nFROM orders\nGROUP BY ROLLUP(channel, status);"
    },
    attention: ['SQLite richiede emulazione', 'Gestire NULL nel risultato (totali)']
  },
  {
    title: 'Window FILTER clause',
    summary: 'Filtra righe dentro un’aggregazione.',
    args: ['COUNT(*) FILTER (WHERE ...)', 'SUM ... FILTER'],
    snippets: {
      sqlite: "SELECT COUNT(*) AS all_orders,\n       SUM(CASE WHEN status='PAID' THEN 1 ELSE 0 END) AS paid_orders\nFROM orders;",
      postgresql: "SELECT COUNT(*) AS all_orders,\n       COUNT(*) FILTER (WHERE status='PAID') AS paid_orders\nFROM orders;",
      sqlserver: "SELECT COUNT(*) AS all_orders,\n       SUM(CASE WHEN status='PAID' THEN 1 ELSE 0 END) AS paid_orders\nFROM orders;"
    },
    attention: ['FILTER disponibile in PostgreSQL', 'Emulare con CASE in altri dialetti']
  },
  {
    title: 'Common table reuse',
    summary: 'Usare CTE per evitare duplicazioni di subquery.',
    args: ['WITH blocco condiviso', 'JOIN con CTE'],
    snippets: {
      sqlite: "WITH paid AS (\n  SELECT * FROM orders WHERE status='PAID'\n)\nSELECT c.segment, COUNT(*) FROM paid p JOIN customers c ON c.id=p.customer_id GROUP BY c.segment;",
      postgresql: "WITH paid AS (\n  SELECT * FROM orders WHERE status='PAID'\n)\nSELECT c.segment, COUNT(*) FROM paid p JOIN customers c ON c.id=p.customer_id GROUP BY c.segment;",
      sqlserver: "WITH paid AS (\n  SELECT * FROM orders WHERE status='PAID'\n)\nSELECT c.segment, COUNT(*) FROM paid p JOIN customers c ON c.id=p.customer_id GROUP BY c.segment;"
    },
    attention: ['CTE non sempre materializzate: verificare piano']
  },
  {
    title: 'JSON path filter',
    summary: 'Estrarre e filtrare eventi basati su campo JSON.',
    args: ['JSON_EXTRACT/JSON_VALUE', 'WHERE su valore estratto'],
    snippets: {
      sqlite: "SELECT event_id,\n       JSON_EXTRACT(json_object('cart_size', (event_id % 4) + 1), '$.cart_size') AS cart_size\nFROM events\nWHERE event_type='add_to_cart'\n  AND JSON_EXTRACT(json_object('cart_size', (event_id % 4) + 1), '$.cart_size') >= 1;",
      postgresql: "SELECT event_id,\n       (json_build_object('cart_size', (event_id % 4) + 1)->>'cart_size')::int AS cart_size\nFROM events\nWHERE event_type='add_to_cart'\n  AND (json_build_object('cart_size', (event_id % 4) + 1)->>'cart_size')::int >= 1;",
      sqlserver: "SELECT event_id,\n       TRY_CAST(JSON_VALUE(JSON_QUERY('{\"cart_size\": ' + CAST((event_id % 4) + 1 AS varchar(10)) + '}'), '$.cart_size') AS int) AS cart_size\nFROM events\nWHERE event_type='add_to_cart'\n  AND TRY_CAST(JSON_VALUE(JSON_QUERY('{\"cart_size\": ' + CAST((event_id % 4) + 1 AS varchar(10)) + '}'), '$.cart_size') AS int) >= 1;"
    },
    attention: ['Tipizzare il campo JSON per confronti numerici', 'Indici JSON richiedono strategie dedicate']
  },
  {
    title: 'Anti-join con NOT EXISTS',
    summary: 'Righe senza corrispondenza nella tabella target.',
    args: ['NOT EXISTS', 'Subquery correlata'],
    snippets: {
      sqlite: "SELECT p.id, p.name FROM products p WHERE NOT EXISTS (\n  SELECT 1 FROM order_items oi WHERE oi.product_id = p.id\n);",
      postgresql: "SELECT p.id, p.name FROM products p WHERE NOT EXISTS (\n  SELECT 1 FROM order_items oi WHERE oi.product_id = p.id\n);",
      sqlserver: "SELECT p.id, p.name FROM products p WHERE NOT EXISTS (\n  SELECT 1 FROM order_items oi WHERE oi.product_id = p.id\n);"
    },
    attention: ['Usa chiavi indicizzate nella subquery', 'Alternative: LEFT JOIN ... IS NULL']
  },
  {
    title: 'Semi-join con EXISTS',
    summary: 'Include righe con almeno un match.',
    args: ['EXISTS', 'Subquery correlata'],
    snippets: {
      sqlite: "SELECT c.id, c.name FROM customers c WHERE EXISTS (\n  SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status='PAID'\n);",
      postgresql: "SELECT c.id, c.name FROM customers c WHERE EXISTS (\n  SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status='PAID'\n);",
      sqlserver: "SELECT c.id, c.name FROM customers c WHERE EXISTS (\n  SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status='PAID'\n);"
    },
    attention: ['Esistenza, non conteggio', 'Indici su FK migliorano performance']
  },
  {
    title: 'Window: dense rank per fascia',
    summary: 'Classifica senza gap utile per bucket.',
    args: ['DENSE_RANK', 'ORDER BY metrica'],
    snippets: {
      sqlite: "SELECT customer_id, total_amount,\n       DENSE_RANK() OVER (ORDER BY total_amount DESC) AS bucket\nFROM orders\nWHERE status='PAID'\nLIMIT 50;",
      postgresql: "SELECT customer_id, total_amount,\n       DENSE_RANK() OVER (ORDER BY total_amount DESC) AS bucket\nFROM orders\nWHERE status='PAID'\nLIMIT 50;",
      sqlserver: "SELECT customer_id, total_amount,\n       DENSE_RANK() OVER (ORDER BY total_amount DESC) AS bucket\nFROM orders\nWHERE status='PAID';"
    },
    attention: ['Aggiungi PARTITION per classifica per gruppo', 'Tie gestiti senza gap']
  }
];
