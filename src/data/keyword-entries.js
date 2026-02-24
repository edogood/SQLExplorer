const baseEntry = (config) => ({
  keyword: config.keyword,
  category: config.category,
  syntax: config.syntax,
  description: config.description,
  examples: {
    sqlite: config.sqlite,
    postgresql: config.postgresql || config.sqlite,
    sqlserver: config.sqlserver || config.sqlite
  },
  useCases: config.useCases || [],
  pitfalls: config.pitfalls || [],
  dialectNotes: config.dialectNotes || {
    sqlite: 'Eseguito nel playground SQLite.',
    postgresql: 'Richiede sintassi ANSI standard.',
    sqlserver: 'Verificare differenze TOP/FETCH o funzioni T-SQL.'
  }
});

const base = [
  baseEntry({
    keyword: 'SELECT',
    category: 'Query',
    syntax: 'SELECT col1, col2 FROM tabella [WHERE ...] [ORDER BY ...];',
    description: 'Proietta colonne o espressioni per costruire il result set.',
    sqlite: "SELECT c.id, c.name, c.segment, ROUND(SUM(o.total_amount),2) AS revenue\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nGROUP BY c.id\nORDER BY revenue DESC\nLIMIT 10;",
    sqlserver: "SELECT TOP 10 c.id, c.name, c.segment, ROUND(SUM(o.total_amount),2) AS revenue\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nGROUP BY c.id, c.name, c.segment\nORDER BY revenue DESC;",
    useCases: ['Costruire dataset per dashboard', 'Ridurre colonne inutili', 'Calcolare metriche inline'],
    pitfalls: ['SELECT * accoppia allo schema', 'Colonne non aggregate fuori GROUP BY in SQLite sono nondeterministiche']
  }),
  baseEntry({
    keyword: 'FROM',
    category: 'Query',
    syntax: 'SELECT ... FROM sorgente [AS alias];',
    description: 'Definisce la sorgente: tabella, vista, CTE o subquery.',
    sqlite: 'SELECT o.id, o.order_date FROM orders o WHERE o.status = \'PAID\' LIMIT 15;',
    useCases: ['Impostare tabella principale', 'Usare alias per self-join', 'Inserire subquery derivate'],
    pitfalls: ['Subquery senza alias genera errore', 'Alias mancanti creano ambiguità']
  }),
  baseEntry({
    keyword: 'WHERE',
    category: 'Query',
    syntax: 'SELECT ... FROM tabella WHERE condizione;',
    description: 'Filtra righe prima di aggregazioni e window function.',
    sqlite: "SELECT id, total_amount FROM orders WHERE status = 'PAID' AND total_amount > 100;",
    useCases: ['Limitare scansioni a finestre temporali', 'Applicare business rule prima di aggregare'],
    pitfalls: ['Funzioni su colonne possono bloccare indici', 'NULL richiede IS NULL']
  }),
  baseEntry({
    keyword: 'ORDER BY',
    category: 'Query',
    syntax: 'SELECT ... ORDER BY col [ASC|DESC];',
    description: 'Ordina il result set finale per una o più espressioni.',
    sqlite: 'SELECT id, total_amount FROM orders WHERE status = \'PAID\' ORDER BY total_amount DESC, order_date ASC LIMIT 20;',
    sqlserver: 'SELECT TOP 20 id, total_amount FROM orders WHERE status = \'PAID\' ORDER BY total_amount DESC, order_date ASC;',
    useCases: ['Classifiche top-N', 'Paginazione deterministica'],
    pitfalls: ['ORDER BY non univoco rende risultati instabili', 'SQL Server non supporta NULLS FIRST/LAST']
  }),
  baseEntry({
    keyword: 'LIMIT',
    category: 'Query',
    syntax: 'SELECT ... LIMIT n [OFFSET m];',
    description: 'Restringe il numero di righe restituite.',
    sqlite: 'SELECT * FROM customers ORDER BY created_at DESC LIMIT 20;',
    sqlserver: 'SELECT TOP 20 * FROM customers ORDER BY created_at DESC;',
    useCases: ['Paginazione', 'Debug su subset piccolo'],
    pitfalls: ['OFFSET alto è costoso: preferire keyset pagination']
  }),
  baseEntry({
    keyword: 'OFFSET',
    category: 'Query',
    syntax: 'SELECT ... LIMIT n OFFSET m;',
    description: 'Salta m righe prima di restituire i risultati.',
    sqlite: 'SELECT id, name FROM customers ORDER BY id LIMIT 20 OFFSET 40;',
    useCases: ['Paginazione classica', 'Testing di pagine successive'],
    pitfalls: ['Costoso su grandi dataset; meglio WHERE id > last_id', 'In SQL Server usare OFFSET FETCH']
  }),
  baseEntry({
    keyword: 'DISTINCT',
    category: 'Query',
    syntax: 'SELECT DISTINCT col FROM tabella;',
    description: 'Rimuove duplicati dal result set.',
    sqlite: 'SELECT DISTINCT country FROM customers ORDER BY country;',
    useCases: ['Elenco valori unici per filtri', 'Deduplicare eventi'],
    pitfalls: ['DISTINCT su molte colonne può essere costoso', 'In presenza di NULL, valori sono considerati duplicati']
  }),
  baseEntry({
    keyword: 'UNION',
    category: 'Set',
    syntax: 'SELECT ... UNION SELECT ...;',
    description: 'Unisce result set eliminando duplicati.',
    sqlite: "SELECT 'orders' AS source, COUNT(*) FROM orders\nUNION\nSELECT 'returns', COUNT(*) FROM returns;",
    useCases: ['Unire viste simili', 'Aggiungere righe sintetiche'],
    pitfalls: ['Tipi devono essere compatibili', 'Per mantenere duplicati usare UNION ALL']
  }),
  baseEntry({
    keyword: 'UNION ALL',
    category: 'Set',
    syntax: 'SELECT ... UNION ALL SELECT ...;',
    description: 'Unisce result set mantenendo duplicati.',
    sqlite: "SELECT customer_id FROM orders\nUNION ALL\nSELECT customer_id FROM returns;",
    useCases: ['Funnel con conteggi grezzi', 'Append dati già deduplicati a monte'],
    pitfalls: ['Duplicati inattesi se fonti non pulite']
  }),
  baseEntry({
    keyword: 'INTERSECT',
    category: 'Set',
    syntax: 'SELECT ... INTERSECT SELECT ...;',
    description: 'Restituisce righe presenti in entrambi i set.',
    sqlite: 'SELECT customer_id FROM orders INTERSECT SELECT customer_id FROM returns;',
    useCases: ['Trovare clienti con evento A e B', 'Verificare overlap dataset'],
    pitfalls: ['SQLite ordina implicitamente; aggiungere ORDER BY se serve ordine stabile']
  }),
  baseEntry({
    keyword: 'EXCEPT',
    category: 'Set',
    syntax: 'SELECT ... EXCEPT SELECT ...;',
    description: 'Restituisce righe presenti nel primo set ma non nel secondo.',
    sqlite: 'SELECT customer_id FROM orders EXCEPT SELECT customer_id FROM returns;',
    sqlserver: 'SELECT customer_id FROM orders EXCEPT SELECT customer_id FROM returns;',
    useCases: ['Anti-join logico', 'Valori mancanti in seconda fonte'],
    pitfalls: ['In SQL Server ordine dei set è significativo; usare UNION ALL + NOT EXISTS per controllo più chiaro']
  }),
  baseEntry({
    keyword: 'CASE',
    category: 'Expression',
    syntax: 'CASE WHEN cond THEN val [WHEN ...] ELSE val END',
    description: 'Valutazione condizionale inline.',
    sqlite: "SELECT id, CASE WHEN total_amount > 500 THEN 'High' WHEN total_amount > 100 THEN 'Mid' ELSE 'Low' END AS bucket FROM orders LIMIT 20;",
    useCases: ['Bucketing', 'Flags derivati', 'Gestire NULL/valori speciali'],
    pitfalls: ['Attenzione a precedenza: valutato sequenzialmente', 'ELSE mancante restituisce NULL']
  }),
  baseEntry({
    keyword: 'COALESCE',
    category: 'Expression',
    syntax: 'COALESCE(expr1, expr2, ...)',
    description: 'Restituisce il primo valore non NULL.',
    sqlite: 'SELECT COALESCE(email, phone, \'n/a\') AS contact FROM customers LIMIT 10;',
    useCases: ['Fallback contatto', 'Default valori calcolati'],
    pitfalls: ['Valuta tutti i parametri in SQL Server? No: short-circuit come ANSI']
  }),
  baseEntry({
    keyword: 'NULLIF',
    category: 'Expression',
    syntax: 'NULLIF(expr1, expr2)',
    description: 'Restituisce NULL se i due valori sono uguali.',
    sqlite: 'SELECT total_amount / NULLIF(discount_amount,0) AS ratio FROM orders LIMIT 10;',
    useCases: ['Evitare divisione per zero', 'Normalizzare valori identici'],
    pitfalls: ['Se entrambe espressioni NULL, restituisce NULL']
  }),
  baseEntry({
    keyword: 'CAST',
    category: 'Expression',
    syntax: 'CAST(expr AS TYPE)',
    description: 'Converte un valore in un altro tipo.',
    sqlite: 'SELECT CAST(total_amount AS INTEGER) AS int_amount FROM orders LIMIT 10;',
    sqlserver: 'SELECT CAST(total_amount AS INT) AS int_amount FROM orders;',
    useCases: ['Normalizzare tipi per join', 'Forzare precisione numerica'],
    pitfalls: ['Possibili truncation/overflow', 'In SQLite i tipi sono “affinity”']
  }),
  baseEntry({
    keyword: 'LIKE',
    category: 'Filter',
    syntax: "col LIKE 'pattern'",
    description: 'Filtro con wildcard _ e %.',
    sqlite: "SELECT name FROM customers WHERE name LIKE 'Cust%';",
    useCases: ['Ricerca prefisso', 'Filtri UI semplici'],
    pitfalls: ['Case sensitivity dipende da collation', 'Pattern leading % impedisce indice']
  }),
  baseEntry({
    keyword: 'GLOB',
    category: 'Filter',
    syntax: "col GLOB 'pattern'",
    description: 'Pattern matching case-sensitive in SQLite.',
    sqlite: "SELECT name FROM customers WHERE name GLOB 'Customer *';",
    postgresql: "SELECT name FROM customers WHERE name SIMILAR TO 'Customer .*';",
    sqlserver: "SELECT name FROM customers WHERE name LIKE 'Customer %';",
    useCases: ['Pattern rapidi', 'Filtri case-sensitive'],
    pitfalls: ['Non portabile fuori SQLite']
  }),
  baseEntry({
    keyword: 'BETWEEN',
    category: 'Filter',
    syntax: 'col BETWEEN a AND b',
    description: 'Filtra valori in un intervallo inclusivo.',
    sqlite: "SELECT id, order_date FROM orders WHERE order_date BETWEEN '2025-01-01' AND '2025-06-30';",
    useCases: ['Finestre temporali', 'Range numerici'],
    pitfalls: ['Inclusivo agli estremi', 'Attenzione a tipi data vs testo']
  }),
  baseEntry({
    keyword: 'IN',
    category: 'Filter',
    syntax: 'col IN (v1, v2, ...)',
    description: 'Filtra contro una lista o subquery.',
    sqlite: "SELECT id, status FROM orders WHERE status IN ('PAID','SHIPPED');",
    useCases: ['Filtri da UI multi-selezione', 'Whitelist valori'],
    pitfalls: ['Troppe costanti possono peggiorare piano; valutare temp table']
  }),
  baseEntry({
    keyword: 'EXISTS',
    category: 'Filter',
    syntax: 'WHERE EXISTS (subquery)',
    description: 'Verifica esistenza di almeno una riga nella subquery.',
    sqlite: 'SELECT name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);',
    useCases: ['Filtri semi-join', 'Controlli referenziali ad-hoc'],
    pitfalls: ['Subquery correlata può essere costosa senza indice']
  }),
  baseEntry({
    keyword: 'NOT EXISTS',
    category: 'Filter',
    syntax: 'WHERE NOT EXISTS (subquery)',
    description: 'Filtra righe senza match nella subquery.',
    sqlite: 'SELECT name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);',
    useCases: ['Missing values', 'Anti-join performante'],
    pitfalls: ['Assicurarsi di usare condizioni su chiavi indicizzate']
  }),
  baseEntry({
    keyword: 'JOIN',
    category: 'Join',
    syntax: 'FROM a JOIN b ON cond',
    description: 'Unisce righe di due tabelle con match sulla condizione.',
    sqlite: 'SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id LIMIT 20;',
    useCases: ['Arricchire fatti con dimensioni', 'Reporting'],
    pitfalls: ['Join senza condizione produce prodotto cartesiano']
  }),
  baseEntry({
    keyword: 'LEFT JOIN',
    category: 'Join',
    syntax: 'FROM a LEFT JOIN b ON cond',
    description: 'Mantiene tutte le righe di sinistra, anche senza match.',
    sqlite: 'SELECT c.name, COUNT(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id;',
    useCases: ['Inclusione valori mancanti', 'Data quality check'],
    pitfalls: ['Filtri su tabella destra in WHERE trasformano in INNER; spostare in ON']
  }),
  baseEntry({
    keyword: 'RIGHT JOIN',
    category: 'Join',
    syntax: 'FROM a RIGHT JOIN b ON cond',
    description: 'Mantiene tutte le righe di destra (non in SQLite).',
    sqlite: '/* Non supportato in SQLite: inverti l’ordine e usa LEFT JOIN */',
    postgresql: 'SELECT c.name, o.id FROM orders o RIGHT JOIN customers c ON o.customer_id = c.id;',
    sqlserver: 'SELECT c.name, o.id FROM orders o RIGHT JOIN customers c ON o.customer_id = c.id;',
    useCases: ['Includere righe di tabella destra', 'Migrazione da altre sintassi'],
    pitfalls: ['Non supportato in SQLite']
  }),
  baseEntry({
    keyword: 'FULL OUTER JOIN',
    category: 'Join',
    syntax: 'FROM a FULL OUTER JOIN b ON cond',
    description: 'Restituisce tutte le righe da entrambe le tabelle.',
    sqlite: '/* Non supportato: usare UNION di LEFT e RIGHT */',
    postgresql: 'SELECT c.name, o.id FROM customers c FULL OUTER JOIN orders o ON o.customer_id = c.id;',
    sqlserver: 'SELECT c.name, o.id FROM customers c FULL OUTER JOIN orders o ON o.customer_id = c.id;',
    useCases: ['Audit di disallineamenti', 'Data reconciliation'],
    pitfalls: ['Assente in SQLite, emulare con UNION ALL + filtri']
  }),
  baseEntry({
    keyword: 'CROSS JOIN',
    category: 'Join',
    syntax: 'FROM a CROSS JOIN b',
    description: 'Prodotto cartesiano di due tabelle.',
    sqlite: 'SELECT c.name, d.date FROM customers c CROSS JOIN dim_date d LIMIT 20;',
    useCases: ['Calendari espansi', 'Test combinazioni'],
    pitfalls: ['Cresce rapidamente, usare con LIMIT o WHERE']
  }),
  baseEntry({
    keyword: 'ON',
    category: 'Join',
    syntax: 'JOIN tab ON condizione',
    description: 'Definisce la condizione di join.',
    sqlite: 'SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id;',
    useCases: ['Condizioni precise su chiavi', 'Filtri su tabella destra'],
    pitfalls: ['Condizioni sbagliate creano duplicati']
  }),
  baseEntry({
    keyword: 'USING',
    category: 'Join',
    syntax: 'JOIN tab USING(col)',
    description: 'Join su colonne con lo stesso nome.',
    sqlite: 'SELECT * FROM orders JOIN payments USING(order_id);',
    useCases: ['Ridurre verbosità', 'Join dimensioni con chiavi standard'],
    pitfalls: ['Non gestisce colonne con nomi diversi']
  }),
  baseEntry({
    keyword: 'GROUP BY',
    category: 'Aggregation',
    syntax: 'SELECT agg FROM tab GROUP BY keys;',
    description: 'Raggruppa righe per chiavi e calcola aggregazioni.',
    sqlite: 'SELECT status, COUNT(*) AS n FROM orders GROUP BY status;',
    useCases: ['Metriche per dimensione', 'Bucket revenue'],
    pitfalls: ['Colonne non aggregate fuori GROUP BY in SQLite sono nondeterministiche']
  }),
  baseEntry({
    keyword: 'HAVING',
    category: 'Aggregation',
    syntax: '... GROUP BY ... HAVING condAgg;',
    description: 'Filtra gruppi dopo aggregazione.',
    sqlite: 'SELECT customer_id, SUM(total_amount) AS spend FROM orders GROUP BY customer_id HAVING spend > 5000;',
    useCases: ['Filtri su somme/medie', 'Outlier detection'],
    pitfalls: ['Non sostituisce WHERE per filtri riga a monte']
  }),
  baseEntry({
    keyword: 'COUNT',
    category: 'Aggregation',
    syntax: 'COUNT(col|*)',
    description: 'Conta righe o valori non NULL.',
    sqlite: 'SELECT COUNT(*) AS orders_count FROM orders WHERE status = \'PAID\';',
    useCases: ['Metriche di volume', 'Distinct count con COUNT(DISTINCT ...)'],
    pitfalls: ['COUNT(col) ignora NULL', 'COUNT(*) conta anche NULL']
  }),
  baseEntry({
    keyword: 'SUM',
    category: 'Aggregation',
    syntax: 'SUM(expr)',
    description: 'Somma valori numerici.',
    sqlite: 'SELECT SUM(total_amount) FROM orders WHERE status = \'PAID\';',
    useCases: ['Revenue', 'Totali parziali'],
    pitfalls: ['NULL ignora riga; usare COALESCE per default']
  }),
  baseEntry({
    keyword: 'AVG',
    category: 'Aggregation',
    syntax: 'AVG(expr)',
    description: 'Media aritmetica dei valori.',
    sqlite: 'SELECT AVG(total_amount) FROM orders WHERE status = \'PAID\';',
    useCases: ['Ticket medio', 'Quality score'],
    pitfalls: ['Divide per righe non NULL; attenzione a zero righe']
  }),
  baseEntry({
    keyword: 'MIN',
    category: 'Aggregation',
    syntax: 'MIN(expr)',
    description: 'Minimo valore.',
    sqlite: 'SELECT MIN(order_date) FROM orders;',
    useCases: ['Prima data evento', 'Valore più basso in serie'],
    pitfalls: ['Su testo è ordinale; convertire a data se serve']
  }),
  baseEntry({
    keyword: 'MAX',
    category: 'Aggregation',
    syntax: 'MAX(expr)',
    description: 'Massimo valore.',
    sqlite: 'SELECT MAX(total_amount) FROM orders;',
    useCases: ['Outlier alto', 'Ultima data'],
    pitfalls: ['Stessa considerazione tipologia tipo']
  }),
  baseEntry({
    keyword: 'OVER',
    category: 'Window',
    syntax: 'agg(...) OVER (PARTITION BY ... ORDER BY ...)',
    description: 'Attiva modalità window sulle funzioni.',
    sqlite: 'SELECT customer_id, total_amount, SUM(total_amount) OVER (PARTITION BY customer_id) AS cust_total FROM orders;',
    useCases: ['Running total per cliente', 'Share of total'],
    pitfalls: ['Frame di default RANGE; usare ROWS per prevedibilità']
  }),
  baseEntry({
    keyword: 'PARTITION BY',
    category: 'Window',
    syntax: 'OVER (PARTITION BY key)',
    description: 'Divide le righe in partizioni per calcoli finestra.',
    sqlite: 'SELECT customer_id, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY total_amount DESC) AS rn FROM orders;',
    useCases: ['Top-N per gruppo', 'Stats per segmento'],
    pitfalls: ['PARTITION mancante applica funzione su tutte le righe']
  }),
  baseEntry({
    keyword: 'ROW_NUMBER',
    category: 'Window',
    syntax: 'ROW_NUMBER() OVER (...)',
    description: 'Assegna un ranking senza gap per partizione.',
    sqlite: 'SELECT * FROM (SELECT id, customer_id, total_amount, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY total_amount DESC) AS rn FROM orders) WHERE rn <= 3;',
    useCases: ['Top prodotti per cliente', 'Deduplication'],
    pitfalls: ['Ordine non deterministico senza tie-break']
  }),
  baseEntry({
    keyword: 'RANK',
    category: 'Window',
    syntax: 'RANK() OVER (...)',
    description: 'Ranking con gap per tie.',
    sqlite: 'SELECT customer_id, total_amount, RANK() OVER (ORDER BY total_amount DESC) AS rnk FROM orders LIMIT 20;',
    useCases: ['Leaderboard con pari merito', 'Competition ranking'],
    pitfalls: ['Gap nei rank dopo tie']
  }),
  baseEntry({
    keyword: 'DENSE_RANK',
    category: 'Window',
    syntax: 'DENSE_RANK() OVER (...)',
    description: 'Ranking senza gap tra tie.',
    sqlite: 'SELECT customer_id, total_amount, DENSE_RANK() OVER (ORDER BY total_amount DESC) AS rnk FROM orders LIMIT 20;',
    useCases: ['Analisi fasce', 'Reports senza gap'],
    pitfalls: ['Ordine non deterministico senza ulteriori colonne']
  }),
  baseEntry({
    keyword: 'LAG',
    category: 'Window',
    syntax: 'LAG(expr [, offset]) OVER (...)',
    description: 'Accede al valore precedente nella finestra.',
    sqlite: 'SELECT date, total_amount, LAG(total_amount) OVER (ORDER BY date) AS prev_total FROM fact_orders LIMIT 30;',
    useCases: ['Delta periodo', 'Retention step'],
    pitfalls: ['Senza ORDER BY il risultato è indefinito']
  }),
  baseEntry({
    keyword: 'LEAD',
    category: 'Window',
    syntax: 'LEAD(expr [, offset]) OVER (...)',
    description: 'Accede al valore successivo nella finestra.',
    sqlite: 'SELECT date, total_amount, LEAD(total_amount) OVER (ORDER BY date) AS next_total FROM fact_orders LIMIT 30;',
    useCases: ['Previsione semplice', 'Gap and islands'],
    pitfalls: ['Valori NULL se non esiste riga successiva']
  }),
  baseEntry({
    keyword: 'NTILE',
    category: 'Window',
    syntax: 'NTILE(n) OVER (...)',
    description: 'Divide le righe in quantili.',
    sqlite: 'SELECT customer_id, total_amount, NTILE(4) OVER (ORDER BY total_amount DESC) AS quartile FROM orders WHERE status=\'PAID\';',
    useCases: ['Quartili di spesa', 'Segmentation'],
    pitfalls: ['Distribuzione non perfetta se righe non divisibili']
  }),
  baseEntry({
    keyword: 'QUALIFY',
    category: 'Window',
    syntax: '... QUALIFY cond_su_window',
    description: 'Filtra usando risultati di funzioni finestra (non SQLite).',
    sqlite: '/* Emulare con subquery */',
    postgresql: '/* Emulare con subquery */',
    sqlserver: '/* Emulare con subquery */',
    useCases: ['Top-N per partizione', 'Filtri su window'],
    pitfalls: ['Non standard, presente in BigQuery/Snowflake']
  }),
  baseEntry({
    keyword: 'WITH',
    category: 'CTE',
    syntax: 'WITH cte AS (subquery) SELECT ...',
    description: 'Common Table Expression per organizzare query.',
    sqlite: 'WITH recent_orders AS (SELECT * FROM orders WHERE order_date >= \'2025-01-01\') SELECT COUNT(*) FROM recent_orders;',
    useCases: ['Modularizzare query', 'Riutilizzare subquery'],
    pitfalls: ['Materializzazione dipende da planner', 'Attenzione a performance con molte CTE']
  }),
  baseEntry({
    keyword: 'WITH RECURSIVE',
    category: 'CTE',
    syntax: 'WITH RECURSIVE cte AS (seed UNION ALL step) SELECT ...',
    description: 'CTE ricorsiva per sequenze e gerarchie.',
    sqlite: 'WITH RECURSIVE d(num) AS (SELECT 1 UNION ALL SELECT num+1 FROM d WHERE num < 10) SELECT * FROM d;',
    useCases: ['Calendari', 'Gerarchie', 'SCD path'],
    pitfalls: ['Richiede condizione di stop', 'In SQL Server usa CTE senza parola RECURSIVE']
  }),
  baseEntry({
    keyword: 'INSERT',
    category: 'DML',
    syntax: 'INSERT INTO tabella(col1, col2) VALUES (...);',
    description: 'Inserisce nuove righe.',
    sqlite: "INSERT INTO customers (id, name, segment) VALUES (1000, 'New Customer', 'SMB');",
    useCases: ['Seed dati', 'ELT step'],
    pitfalls: ['Violazioni PK/FK generano errore con PRAGMA foreign_keys=ON']
  }),
  baseEntry({
    keyword: 'UPDATE',
    category: 'DML',
    syntax: 'UPDATE tabella SET col = val WHERE cond;',
    description: 'Aggiorna valori esistenti.',
    sqlite: "UPDATE orders SET status='PAID' WHERE id=1;",
    useCases: ['Correzioni manuali', 'Flagging record'],
    pitfalls: ['WHERE mancante aggiorna tutte le righe', 'Trigger possono scattare']
  }),
  baseEntry({
    keyword: 'DELETE',
    category: 'DML',
    syntax: 'DELETE FROM tabella WHERE cond;',
    description: 'Rimuove righe.',
    sqlite: 'DELETE FROM returns WHERE refund_amount IS NULL;',
    useCases: ['Pulizia dataset demo', 'Rimozione record duplicati'],
    pitfalls: ['Operazione distruttiva; wrap in transaction']
  }),
  baseEntry({
    keyword: 'TRUNCATE',
    category: 'DML',
    syntax: 'TRUNCATE TABLE tab;',
    description: 'Svuota tabella rapidamente (non SQLite).',
    sqlite: '/* Usare DELETE FROM tabella; */',
    postgresql: 'TRUNCATE TABLE orders;',
    sqlserver: 'TRUNCATE TABLE orders;',
    useCases: ['Reset staging', 'Pulizia veloce'],
    pitfalls: ['Richiede permessi elevati', 'Resetta identity in SQL Server']
  }),
  baseEntry({
    keyword: 'CREATE TABLE',
    category: 'DDL',
    syntax: 'CREATE TABLE nome (...);',
    description: 'Definisce una nuova tabella.',
    sqlite: 'CREATE TABLE demo_orders(id INTEGER PRIMARY KEY, total REAL);',
    useCases: ['Nuove strutture demo', 'Tabelle staging'],
    pitfalls: ['Schema rigido; valutare tipi giusti']
  }),
  baseEntry({
    keyword: 'ALTER TABLE',
    category: 'DDL',
    syntax: 'ALTER TABLE nome ADD COLUMN ...;',
    description: 'Modifica schema tabella.',
    sqlite: 'ALTER TABLE customers ADD COLUMN loyalty_level TEXT;',
    useCases: ['Evoluzione schema', 'Aggiunta colonne calcolate'],
    pitfalls: ['In SQLite supporto limitato (no drop column)']
  }),
  baseEntry({
    keyword: 'DROP TABLE',
    category: 'DDL',
    syntax: 'DROP TABLE nome;',
    description: 'Rimuove tabella e dati.',
    sqlite: 'DROP TABLE IF EXISTS demo_orders;',
    useCases: ['Pulizia risorse temporanee', 'Reset ambienti'],
    pitfalls: ['Distruttivo; attenzione a FK dipendenti']
  }),
  baseEntry({
    keyword: 'CREATE INDEX',
    category: 'DDL',
    syntax: 'CREATE INDEX idx ON tab(col);',
    description: 'Crea un indice per velocizzare filtri e join.',
    sqlite: 'CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);',
    useCases: ['Performance WHERE/JOIN', 'Preparare esercizi explain'],
    pitfalls: ['Indice inutile su colonne low-selectivity', 'Overhead scrittura']
  }),
  baseEntry({
    keyword: 'DROP INDEX',
    category: 'DDL',
    syntax: 'DROP INDEX nome;',
    description: 'Rimuove indice esistente.',
    sqlite: 'DROP INDEX IF EXISTS idx_orders_customer;',
    useCases: ['Test piani senza indice', 'Pulizia'],
    pitfalls: ['Query possono diventare lente']
  }),
  baseEntry({
    keyword: 'PRIMARY KEY',
    category: 'Constraint',
    syntax: 'col TYPE PRIMARY KEY',
    description: 'Identifica univocamente le righe.',
    sqlite: 'CREATE TABLE demo (id INTEGER PRIMARY KEY, name TEXT);',
    useCases: ['Univocità record', 'Join affidabili'],
    pitfalls: ['In SQLite INTEGER PRIMARY KEY è alias rowid']
  }),
  baseEntry({
    keyword: 'FOREIGN KEY',
    category: 'Constraint',
    syntax: 'FOREIGN KEY(col) REFERENCES other(col)',
    description: 'Enforce referential integrity tra tabelle.',
    sqlite: 'CREATE TABLE demo_child(id INTEGER PRIMARY KEY, parent_id INTEGER, FOREIGN KEY(parent_id) REFERENCES demo(id));',
    useCases: ['Integrità dati', 'Join consistenti'],
    pitfalls: ['Richiede PRAGMA foreign_keys=ON']
  }),
  baseEntry({
    keyword: 'CHECK',
    category: 'Constraint',
    syntax: 'CHECK (condizione)',
    description: 'Valida dati in inserimento/update.',
    sqlite: 'CREATE TABLE demo_amount(val REAL CHECK(val >= 0));',
    useCases: ['Rule di business', 'Qualità dati'],
    pitfalls: ['In SQLite valutato in runtime; attenzione a tipi']
  }),
  baseEntry({
    keyword: 'DEFAULT',
    category: 'Constraint',
    syntax: 'col TYPE DEFAULT valore',
    description: 'Imposta valore di default.',
    sqlite: 'CREATE TABLE demo_flag(active INTEGER DEFAULT 1);',
    useCases: ['Valori predefiniti', 'Compatibilità schema'],
    pitfalls: ['Default non si applica retroattivamente']
  }),
  baseEntry({
    keyword: 'UNIQUE',
    category: 'Constraint',
    syntax: 'UNIQUE(col1, col2)',
    description: 'Garantisce unicità combinata.',
    sqlite: 'CREATE UNIQUE INDEX idx_unique_session ON events(session_id, event_time);',
    useCases: ['Prevenire duplicati', 'Business key'],
    pitfalls: ['Duplicati esistenti impediscono creazione']
  }),
  baseEntry({
    keyword: 'BEGIN',
    category: 'Transaction',
    syntax: 'BEGIN [IMMEDIATE|EXCLUSIVE];',
    description: 'Apre una transazione.',
    sqlite: 'BEGIN; UPDATE orders SET status=\'PENDING\' WHERE id=1; COMMIT;',
    useCases: ['Operazioni multiple atomiche', 'Simulare rollback'],
    pitfalls: ['Dimenticare COMMIT/ROLLBACK lascia transazione aperta']
  }),
  baseEntry({
    keyword: 'COMMIT',
    category: 'Transaction',
    syntax: 'COMMIT;',
    description: 'Conferma transazione.',
    sqlite: 'COMMIT;',
    useCases: ['Persistenza modifiche', 'Chiusura batch'],
    pitfalls: ['Non annullabile dopo esecuzione']
  }),
  baseEntry({
    keyword: 'ROLLBACK',
    category: 'Transaction',
    syntax: 'ROLLBACK;',
    description: 'Annulla transazione in corso.',
    sqlite: 'ROLLBACK;',
    useCases: ['Ripristino dopo errore', 'Testing safe'],
    pitfalls: ['Nessun effetto fuori transazione']
  }),
  baseEntry({
    keyword: 'SAVEPOINT',
    category: 'Transaction',
    syntax: 'SAVEPOINT name; ... RELEASE name;',
    description: 'Crea punto di ripristino parziale.',
    sqlite: 'SAVEPOINT sp1; UPDATE orders SET status=\'PENDING\' WHERE id=2; ROLLBACK TO sp1;',
    useCases: ['Rollback parziale', 'Transazioni annidate'],
    pitfalls: ['Ricordare RELEASE per liberare']
  }),
  baseEntry({
    keyword: 'EXPLAIN',
    category: 'Performance',
    syntax: 'EXPLAIN QUERY PLAN ...',
    description: 'Mostra il piano di esecuzione.',
    sqlite: 'EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 10;',
    useCases: ['Analisi performance', 'Verifica uso indici'],
    pitfalls: ['Output diverso per dialetto', 'Non esegue query']
  }),
  baseEntry({
    keyword: 'ANALYZE',
    category: 'Performance',
    syntax: 'ANALYZE [table/index];',
    description: 'Aggiorna statistiche per optimizer.',
    sqlite: 'ANALYZE orders;',
    useCases: ['Migliorare piani', 'Dopo grossi cambi dati'],
    pitfalls: ['Non necessario su piccoli dataset demo']
  }),
  baseEntry({
    keyword: 'VACUUM',
    category: 'Maintenance',
    syntax: 'VACUUM;',
    description: 'Compatta database SQLite.',
    sqlite: 'VACUUM;',
    useCases: ['Recuperare spazio', 'Pulizia demo'],
    pitfalls: ['Blocca DB durante esecuzione']
  }),
  baseEntry({
    keyword: 'PRAGMA',
    category: 'Maintenance',
    syntax: 'PRAGMA setting=value;',
    description: 'Configura opzioni SQLite.',
    sqlite: 'PRAGMA foreign_keys = ON;',
    useCases: ['Abilitare FK', 'Ispezione schema'],
    pitfalls: ['Specifico SQLite, ignorato in altri dialetti']
  }),
  baseEntry({
    keyword: 'CREATE VIEW',
    category: 'DDL',
    syntax: 'CREATE VIEW v AS SELECT ...;',
    description: 'Definisce vista logica.',
    sqlite: 'CREATE VIEW top_customers AS SELECT customer_id, SUM(total_amount) AS revenue FROM orders GROUP BY customer_id;',
    useCases: ['Riutilizzo query', 'Sicurezza su subset dati'],
    pitfalls: ['Modificare schema di base può invalidare la vista']
  }),
  baseEntry({
    keyword: 'DROP VIEW',
    category: 'DDL',
    syntax: 'DROP VIEW nome;',
    description: 'Rimuove vista.',
    sqlite: 'DROP VIEW IF EXISTS top_customers;',
    useCases: ['Pulizia viste obsolete'],
    pitfalls: ['Dipendenze di app possono rompersi']
  }),
  baseEntry({
    keyword: 'CREATE TRIGGER',
    category: 'DDL',
    syntax: 'CREATE TRIGGER name AFTER|BEFORE event ON table BEGIN ... END;',
    description: 'Esegue logica automatica su eventi DML.',
    sqlite: "CREATE TRIGGER audit_order AFTER UPDATE ON orders BEGIN INSERT INTO returns(order_id, reason, refund_amount) SELECT NEW.id, 'audit', 0; END;",
    useCases: ['Audit log', 'Sincronizzazioni'],
    pitfalls: ['Può introdurre loop o rallentamenti']
  }),
  baseEntry({
    keyword: 'DROP TRIGGER',
    category: 'DDL',
    syntax: 'DROP TRIGGER name;',
    description: 'Rimuove trigger.',
    sqlite: 'DROP TRIGGER IF EXISTS audit_order;',
    useCases: ['Disabilitare logica automatica'],
    pitfalls: ['Azioni non più garantite']
  }),
  baseEntry({
    keyword: 'JSON_EXTRACT',
    category: 'Function',
    syntax: "JSON_EXTRACT(col, '$.path')",
    description: 'Estrae valore da JSON (SQLite JSON1).',
    sqlite: "SELECT JSON_EXTRACT(metadata, '$.cart_size') FROM events WHERE event_type='add_to_cart' LIMIT 10;",
    postgresql: "SELECT metadata->>'cart_size' FROM events WHERE event_type='add_to_cart' LIMIT 10;",
    sqlserver: "SELECT JSON_VALUE(metadata, '$.cart_size') FROM events WHERE event_type='add_to_cart';",
    useCases: ['Eventi semi-strutturati', 'Logs'],
    pitfalls: ['Indici su JSON richiedono strategie dedicate']
  }),
  baseEntry({
    keyword: 'STRFTIME',
    category: 'Function',
    syntax: "STRFTIME('%Y-%m', date)",
    description: 'Formatta date in SQLite.',
    sqlite: "SELECT STRFTIME('%Y-%m', order_date) AS ym, SUM(total_amount) FROM orders GROUP BY ym;",
    postgresql: "SELECT TO_CHAR(order_date::date, 'YYYY-MM') AS ym, SUM(total_amount) FROM orders GROUP BY ym;",
    sqlserver: "SELECT FORMAT(CAST(order_date AS date), 'yyyy-MM') AS ym, SUM(total_amount) FROM orders GROUP BY FORMAT(CAST(order_date AS date), 'yyyy-MM');",
    useCases: ['Bucket mensili', 'Calendar table join'],
    pitfalls: ['Format differente per dialetto']
  }),
  baseEntry({
    keyword: 'DATE_ADD',
    category: 'Function',
    syntax: 'date + interval',
    description: 'Aggiunge intervallo a una data.',
    sqlite: "SELECT date(order_date, '+7 day') FROM orders LIMIT 5;",
    postgresql: "SELECT order_date + INTERVAL '7 days' FROM orders LIMIT 5;",
    sqlserver: "SELECT DATEADD(day,7,order_date) FROM orders;",
    useCases: ['Finestre mobili', 'SLA date'],
    pitfalls: ['Type affinity in SQLite']
  }),
  baseEntry({
    keyword: 'DATE_DIFF',
    category: 'Function',
    syntax: 'DATEDIFF(unit, start, end)',
    description: 'Calcola differenza tra date.',
    sqlite: "SELECT julianday(delivered_at) - julianday(shipped_at) AS days FROM shipments LIMIT 10;",
    postgresql: "SELECT EXTRACT(EPOCH FROM delivered_at - shipped_at)/86400 AS days FROM shipments;",
    sqlserver: "SELECT DATEDIFF(day, shipped_at, delivered_at) AS days FROM shipments;",
    useCases: ['Lead time', 'Cycle time'],
    pitfalls: ['Unità differiscono per dialetto']
  }),
  baseEntry({
    keyword: 'STRING_AGG',
    category: 'Function',
    syntax: 'STRING_AGG(expr, sep)',
    description: 'Concatena valori aggregati.',
    sqlite: "SELECT GROUP_CONCAT(page, ' -> ') FROM events WHERE session_id='sess-1-1';",
    postgresql: "SELECT STRING_AGG(page, ' -> ') FROM events WHERE session_id='sess-1-1';",
    sqlserver: "SELECT STRING_AGG(page, ' -> ') FROM events WHERE session_id='sess-1-1';",
    useCases: ['Percorsi utente', 'Listini concatenati'],
    pitfalls: ['Ordine non garantito senza ORDER BY in funzione']
  }),
  baseEntry({
    keyword: 'SUBQUERY',
    category: 'Query',
    syntax: '(SELECT ...)',
    description: 'Query nidificata usata come sorgente o filtro.',
    sqlite: 'SELECT * FROM customers WHERE credit_limit > (SELECT AVG(credit_limit) FROM customers);',
    useCases: ['Filtri dipendenti dal dataset', 'Anti-join'],
    pitfalls: ['Correlate subquery possono essere lente']
  }),
  baseEntry({
    keyword: 'SCALAR SUBQUERY',
    category: 'Query',
    syntax: '(SELECT expr)',
    description: 'Subquery che restituisce un solo valore.',
    sqlite: 'SELECT id, (SELECT COUNT(*) FROM orders o WHERE o.customer_id=c.id) AS n_orders FROM customers c;',
    useCases: ['Metriche per riga', 'Lookups rapidi'],
    pitfalls: ['Assicurarsi che la subquery restituisca una sola riga']
  }),
  baseEntry({
    keyword: 'CORRELATED SUBQUERY',
    category: 'Query',
    syntax: 'subquery che referenzia alias esterni',
    description: 'Subquery valutata per ogni riga esterna.',
    sqlite: 'SELECT id FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=c.id AND o.status=\'PAID\');',
    useCases: ['Filtri esistenziali', 'Valori dipendenti da riga'],
    pitfalls: ['Può degradare performance senza indici']
  }),
  baseEntry({
    keyword: 'ANTI JOIN',
    category: 'Join',
    syntax: 'WHERE NOT EXISTS / LEFT JOIN ... IS NULL',
    description: 'Seleziona righe senza match.',
    sqlite: 'SELECT p.id FROM products p LEFT JOIN order_items oi ON oi.product_id=p.id WHERE oi.id IS NULL;',
    useCases: ['Gap detection', 'Data quality missing'],
    pitfalls: ['Assicurare condizione IS NULL sulla tabella destra']
  })
];

const extras = [
  baseEntry({
    keyword: 'IS NULL',
    category: 'Filter',
    syntax: 'col IS NULL',
    description: 'Controlla presenza di valori NULL.',
    sqlite: 'SELECT id, name FROM customers WHERE email IS NULL AND phone IS NULL;',
    useCases: ['Data quality per contatti', 'Filtri su colonne opzionali'],
    pitfalls: ['= NULL restituisce sempre FALSE', 'IS NOT NULL per complementare']
  }),
  baseEntry({
    keyword: 'IS NOT NULL',
    category: 'Filter',
    syntax: 'col IS NOT NULL',
    description: 'Filtra righe con valore presente.',
    sqlite: 'SELECT id, total_amount FROM orders WHERE total_amount IS NOT NULL LIMIT 20;',
    useCases: ['Escludere outlier NULL', 'Preparare metriche corrette'],
    pitfalls: ['NULL nei join richiedono gestione esplicita']
  }),
  baseEntry({
    keyword: 'AND / OR / NOT',
    category: 'Logic',
    syntax: 'cond1 AND cond2; cond1 OR cond2; NOT cond',
    description: 'Operatori booleani per combinare condizioni.',
    sqlite: "SELECT id FROM orders WHERE status='PAID' AND total_amount > 100 AND NOT channel='partner';",
    useCases: ['Filtri complessi', 'Esclusioni mirate'],
    pitfalls: ['Aggiungere parentesi per priorità chiara']
  }),
  baseEntry({
    keyword: 'LIKE ESCAPE',
    category: 'Filter',
    syntax: "col LIKE 'pattern' ESCAPE '\\\\'",
    description: 'Gestisce caratteri speciali in pattern LIKE.',
    sqlite: "SELECT name FROM customers WHERE name LIKE 'Customer\\_%' ESCAPE '\\\\' LIMIT 5;",
    postgresql: "SELECT name FROM customers WHERE name LIKE 'Customer\\_%' ESCAPE '\\\\' LIMIT 5;",
    sqlserver: "SELECT TOP 5 name FROM customers WHERE name LIKE 'Customer\\_%' ESCAPE '\\\\';",
    useCases: ['Cerca valori contenenti _ o % letterali'],
    pitfalls: ['Ricordare escape double in stringhe']
  }),
  baseEntry({
    keyword: 'ILIKE',
    category: 'Filter',
    syntax: 'col ILIKE pattern',
    description: 'Pattern match case-insensitive (PostgreSQL).',
    sqlite: "SELECT name FROM customers WHERE LOWER(name) LIKE 'customer 1%';",
    postgresql: "SELECT name FROM customers WHERE name ILIKE 'customer 1%';",
    sqlserver: "SELECT name FROM customers WHERE name LIKE 'customer 1%' COLLATE Latin1_general_CI_AI;",
    useCases: ['Ricerca user-friendly', 'Filtri UI case-insensitive'],
    pitfalls: ['Non supportato nativamente in SQLite/SQL Server']
  }),
  baseEntry({
    keyword: 'OFFSET FETCH',
    category: 'Pagination',
    syntax: 'ORDER BY col OFFSET n ROWS FETCH NEXT m ROWS ONLY',
    description: 'Paginazione ANSI alternativa a LIMIT/TOP.',
    sqlite: 'SELECT id, name FROM customers ORDER BY id LIMIT 10 OFFSET 20;',
    postgresql: 'SELECT id, name FROM customers ORDER BY id OFFSET 20 LIMIT 10;',
    sqlserver: 'SELECT id, name FROM customers ORDER BY id OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;',
    useCases: ['UI con pagina corrente', 'Compatibilità multi-dialect'],
    pitfalls: ['Costoso su offset grandi; preferire keyset pagination']
  }),
  baseEntry({
    keyword: 'TOP',
    category: 'Pagination',
    syntax: 'SELECT TOP n ...',
    description: 'Limita righe in SQL Server.',
    sqlite: 'SELECT * FROM orders ORDER BY total_amount DESC LIMIT 5;',
    postgresql: 'SELECT * FROM orders ORDER BY total_amount DESC LIMIT 5;',
    sqlserver: 'SELECT TOP 5 * FROM orders ORDER BY total_amount DESC;',
    useCases: ['Snippet T-SQL', 'Porting da SQL Server'],
    pitfalls: ['TOP senza ORDER BY è nondeterministico']
  }),
  baseEntry({
    keyword: 'MERGE',
    category: 'DML',
    syntax: 'MERGE target USING source ON cond WHEN MATCHED ...',
    description: 'Upsert multi-azione in SQL Server/PostgreSQL (15+).',
    sqlite: "INSERT INTO customers (id, name, segment)\nVALUES (9999,'Temp','SMB')\nON CONFLICT(id) DO UPDATE SET name=excluded.name;",
    postgresql: "MERGE INTO customers AS t USING (VALUES (9999,'Temp','SMB')) AS s(id,name,segment)\nON t.id = s.id\nWHEN MATCHED THEN UPDATE SET name = s.name\nWHEN NOT MATCHED THEN INSERT (id,name,segment) VALUES (s.id,s.name,s.segment);",
    sqlserver: "MERGE customers AS t USING (VALUES (9999,'Temp','SMB')) AS s(id,name,segment)\nON t.id = s.id\nWHEN MATCHED THEN UPDATE SET name = s.name\nWHEN NOT MATCHED THEN INSERT (id,name,segment) VALUES (s.id,s.name,s.segment);",
    useCases: ['Sync dimensioni', 'CDC applicazioni'],
    pitfalls: ['MERGE in SQL Server ha rischi di race; valutare UPSERT separato']
  }),
  baseEntry({
    keyword: 'UPSERT / ON CONFLICT',
    category: 'DML',
    syntax: 'INSERT ... ON CONFLICT (...) DO UPDATE',
    description: 'Evita duplicati aggiornando o ignorando.',
    sqlite: "INSERT INTO orders(id, customer_id, order_date, status, total_amount)\nVALUES (6000, 10, '2025-02-10', 'PAID', 100)\nON CONFLICT(id) DO UPDATE SET status='PAID';",
    postgresql: "INSERT INTO orders(id, customer_id, order_date, status, total_amount)\nVALUES (6000, 10, '2025-02-10', 'PAID', 100)\nON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status;",
    sqlserver: "MERGE orders AS t USING (VALUES (6000,10,'2025-02-10','PAID',100)) AS s(id,customer_id,order_date,status,total_amount)\nON t.id = s.id\nWHEN MATCHED THEN UPDATE SET status=s.status\nWHEN NOT MATCHED THEN INSERT (id,customer_id,order_date,status,total_amount) VALUES (s.id,s.customer_id,s.order_date,s.status,s.total_amount);",
    useCases: ['Idempotent load', 'CDC ingest'],
    pitfalls: ['Definire univocità chiara']
  }),
  baseEntry({
    keyword: 'WINDOW FRAME',
    category: 'Window',
    syntax: 'ROWS BETWEEN n PRECEDING AND CURRENT ROW',
    description: 'Definisce l’intervallo per funzioni finestra.',
    sqlite: "SELECT date, total_amount,\n       AVG(total_amount) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS avg_7d\nFROM fact_orders;",
    useCases: ['Medie mobili', 'Smoothing serie temporali'],
    pitfalls: ['RANGE default comporta risultati diversi', 'FRAME manca in alcune funzioni aggregate']
  }),
  baseEntry({
    keyword: 'FILTER (WHERE ...)',
    category: 'Aggregation',
    syntax: 'agg(expr) FILTER (WHERE cond)',
    description: 'Applica condizione per singola aggregazione.',
    sqlite: "SELECT COUNT(*) AS all_orders,\n       SUM(CASE WHEN status='PAID' THEN 1 ELSE 0 END) AS paid_orders\nFROM orders;",
    postgresql: "SELECT COUNT(*) AS all_orders,\n       COUNT(*) FILTER (WHERE status='PAID') AS paid_orders\nFROM orders;",
    sqlserver: "SELECT COUNT(*) AS all_orders,\n       SUM(CASE WHEN status='PAID' THEN 1 ELSE 0 END) AS paid_orders\nFROM orders;",
    useCases: ['Metriche multiple in una query', 'Conditional aggregation'],
    pitfalls: ['FILTER non disponibile in SQLite/SQL Server — usare CASE']
  }),
  baseEntry({
    keyword: 'PERCENTILE_CONT',
    category: 'Analytics',
    syntax: 'PERCENTILE_CONT(x) WITHIN GROUP (ORDER BY col)',
    description: 'Calcola percentile continuo.',
    sqlite: "SELECT total_amount FROM orders ORDER BY total_amount LIMIT 1 OFFSET (SELECT COUNT(*)/2 FROM orders); -- approx median",
    postgresql: "SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_amount) AS median FROM orders;",
    sqlserver: "SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_amount) OVER() AS median FROM orders;",
    useCases: ['Median ticket', 'Soglie percentile'],
    pitfalls: ['SQLite richiede workaround manuale']
  }),
  baseEntry({
    keyword: 'TABLESAMPLE',
    category: 'Sampling',
    syntax: 'FROM tab TABLESAMPLE SYSTEM (n PERCENT)',
    description: 'Campiona righe per analisi veloce.',
    sqlite: 'SELECT * FROM orders WHERE ABS(RANDOM()) % 10 = 0 LIMIT 50;',
    postgresql: 'SELECT * FROM orders TABLESAMPLE SYSTEM (10);',
    sqlserver: 'SELECT * FROM orders TABLESAMPLE (10 PERCENT);',
    useCases: ['Exploratory analysis', 'Ridurre costi test'],
    pitfalls: ['Campione non sempre uniforme', 'In SQLite workaround non deterministico']
  }),
  baseEntry({
    keyword: 'SEQUENCE',
    category: 'DDL',
    syntax: 'CREATE SEQUENCE seq START WITH ...',
    description: 'Genera valori incrementali.',
    sqlite: '/* SQLite usa AUTOINCREMENT su INTEGER PRIMARY KEY */\nCREATE TABLE demo_seq(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);',
    postgresql: 'CREATE SEQUENCE order_seq START 10000; SELECT nextval(\'order_seq\');',
    sqlserver: 'CREATE SEQUENCE order_seq START WITH 10000 INCREMENT BY 1; SELECT NEXT VALUE FOR order_seq;',
    useCases: ['Surrogate key', 'CDC offset'],
    pitfalls: ['Gestire gap dopo rollback']
  }),
  baseEntry({
    keyword: 'IDENTITY',
    category: 'DDL',
    syntax: 'col INT IDENTITY(1,1)',
    description: 'Colonna auto-increment SQL Server.',
    sqlite: 'CREATE TABLE demo_identity(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);',
    postgresql: 'CREATE TABLE demo_identity(id SERIAL PRIMARY KEY, name text);',
    sqlserver: 'CREATE TABLE demo_identity(id INT IDENTITY(1,1) PRIMARY KEY, name NVARCHAR(50));',
    useCases: ['Chiavi surrogate', 'Migration T-SQL'],
    pitfalls: ['Reset richiede DBCC CHECKIDENT in SQL Server']
  }),
  baseEntry({
    keyword: 'COHORT',
    category: 'Analytics',
    syntax: 'bucket clienti per prima data',
    description: 'Definisce gruppo di ingresso per analisi retention.',
    sqlite: "SELECT customer_id, substr(MIN(order_date),1,7) AS cohort FROM orders GROUP BY customer_id;",
    postgresql: "SELECT customer_id, to_char(MIN(order_date)::date,'YYYY-MM') AS cohort FROM orders GROUP BY customer_id;",
    sqlserver: "SELECT customer_id, FORMAT(MIN(CAST(order_date AS date)),'yyyy-MM') AS cohort FROM orders GROUP BY customer_id;",
    useCases: ['Retention', 'Growth analysis'],
    pitfalls: ['Definire regola di coorte chiara (primo ordine vs signup)']
  }),
  baseEntry({
    keyword: 'RETENTION',
    category: 'Analytics',
    syntax: 'coorte + attivita successiva',
    description: 'Misura utenti che ritornano in periodi successivi.',
    sqlite: "WITH cohort AS (\n  SELECT customer_id, substr(MIN(order_date),1,7) AS cohort FROM orders GROUP BY customer_id\n), activity AS (\n  SELECT c.cohort, substr(o.order_date,1,7) AS ym, o.customer_id FROM cohort c JOIN orders o ON o.customer_id = c.customer_id\n)\nSELECT cohort, ym, COUNT(DISTINCT customer_id) AS active FROM activity GROUP BY cohort, ym ORDER BY cohort, ym;",
    postgresql: "WITH cohort AS (\n  SELECT customer_id, to_char(MIN(order_date)::date,'YYYY-MM') AS cohort FROM orders GROUP BY customer_id\n), activity AS (\n  SELECT c.cohort, to_char(o.order_date::date,'YYYY-MM') AS ym, o.customer_id FROM cohort c JOIN orders o ON o.customer_id = c.customer_id\n)\nSELECT cohort, ym, COUNT(DISTINCT customer_id) AS active FROM activity GROUP BY cohort, ym ORDER BY cohort, ym;",
    sqlserver: "WITH cohort AS (\n  SELECT customer_id, FORMAT(MIN(CAST(order_date AS date)),'yyyy-MM') AS cohort FROM orders GROUP BY customer_id\n), activity AS (\n  SELECT c.cohort, FORMAT(CAST(o.order_date AS date),'yyyy-MM') AS ym, o.customer_id FROM cohort c JOIN orders o ON o.customer_id = c.customer_id\n)\nSELECT cohort, ym, COUNT(DISTINCT customer_id) AS active FROM activity GROUP BY cohort, ym ORDER BY cohort, ym;",
    useCases: ['Health prodotto', 'Engagement'],
    pitfalls: ['COUNT DISTINCT costoso; valutare approx']
  }),
  baseEntry({
    keyword: 'SESSIONIZATION',
    category: 'Analytics',
    syntax: 'LAG timestamp + gap',
    description: 'Crea sessioni con timeout inattività.',
    sqlite: "WITH ordered AS (\n  SELECT user_id, event_time,\n         LAG(event_time) OVER(PARTITION BY user_id ORDER BY event_time) AS prev_time\n  FROM events\n), flagged AS (\n  SELECT *, CASE WHEN prev_time IS NULL OR (julianday(event_time)-julianday(prev_time))*86400 > 1800 THEN 1 ELSE 0 END AS new_session\n  FROM ordered\n)\nSELECT user_id, SUM(new_session) OVER(PARTITION BY user_id ORDER BY event_time) AS session_num, event_time\nFROM flagged;",
    postgresql: "WITH ordered AS (\n  SELECT user_id, event_time,\n         LAG(event_time) OVER(PARTITION BY user_id ORDER BY event_time) AS prev_time\n  FROM events\n), flagged AS (\n  SELECT *, CASE WHEN prev_time IS NULL OR EXTRACT(EPOCH FROM event_time - prev_time) > 1800 THEN 1 ELSE 0 END AS new_session\n  FROM ordered\n)\nSELECT user_id, SUM(new_session) OVER(PARTITION BY user_id ORDER BY event_time) AS session_num, event_time\nFROM flagged;",
    sqlserver: "WITH ordered AS (\n  SELECT user_id, event_time,\n         LAG(event_time) OVER(PARTITION BY user_id ORDER BY event_time) AS prev_time\n  FROM events\n), flagged AS (\n  SELECT *, CASE WHEN prev_time IS NULL OR DATEDIFF(second, prev_time, event_time) > 1800 THEN 1 ELSE 0 END AS new_session\n  FROM ordered\n)\nSELECT user_id, SUM(new_session) OVER(PARTITION BY user_id ORDER BY event_time ROWS UNBOUNDED PRECEDING) AS session_num, event_time\nFROM flagged;",
    useCases: ['Web analytics', 'RFM recency'],
    pitfalls: ['Gestire timezone e formati timestamp']
  }),
  baseEntry({
    keyword: 'GAP AND ISLANDS',
    category: 'Analytics',
    syntax: 'ROW_NUMBER delta trick',
    description: 'Identifica intervalli continui in serie ordinate.',
    sqlite: "WITH ordered AS (\n  SELECT date, ROW_NUMBER() OVER(ORDER BY date) AS rn FROM fact_orders\n), grp AS (\n  SELECT date, rn - ROW_NUMBER() OVER(ORDER BY date) AS g FROM ordered\n)\nSELECT MIN(date) AS start_date, MAX(date) AS end_date, COUNT(*) AS len FROM grp GROUP BY g ORDER BY start_date;",
    postgresql: "WITH ordered AS (\n  SELECT date::date AS date, ROW_NUMBER() OVER(ORDER BY date) AS rn FROM fact_orders\n), grp AS (\n  SELECT date, rn - ROW_NUMBER() OVER(ORDER BY date) AS g FROM ordered\n)\nSELECT MIN(date) AS start_date, MAX(date) AS end_date, COUNT(*) AS len FROM grp GROUP BY g ORDER BY start_date;",
    sqlserver: "WITH ordered AS (\n  SELECT CAST([date] AS date) AS [date], ROW_NUMBER() OVER(ORDER BY [date]) AS rn FROM fact_orders\n), grp AS (\n  SELECT [date], rn - ROW_NUMBER() OVER(ORDER BY [date]) AS g FROM ordered\n)\nSELECT MIN([date]) AS start_date, MAX([date]) AS end_date, COUNT(*) AS len FROM grp GROUP BY g ORDER BY start_date;",
    useCases: ['Periodi attivi', 'Run length encoding'],
    pitfalls: ['Richiede ordinamento stabile']
  }),
  baseEntry({
    keyword: 'INCREMENTAL LOAD',
    category: 'Data Engineering',
    syntax: 'WHERE col > last_watermark',
    description: 'Carica solo righe nuove rispetto a un watermark.',
    sqlite: "INSERT INTO fact_orders(order_id, date, customer_id, total_amount, status, channel)\nSELECT o.id, o.order_date, o.customer_id, o.total_amount, o.status, o.channel\nFROM orders o\nWHERE o.order_date > (SELECT COALESCE(MAX(date),'1970-01-01') FROM fact_orders);",
    useCases: ['ETL/ELT daily', 'CDC semplificato'],
    pitfalls: ['Non copre update di righe vecchie; usare checksum/versione']
  }),
  baseEntry({
    keyword: 'DEDUPLICATION',
    category: 'Data Quality',
    syntax: 'ROW_NUMBER + filter',
    description: 'Rimuove duplicati scegliendo record preferito.',
    sqlite: "WITH ranked AS (\n  SELECT event_id, session_id, event_time,\n         ROW_NUMBER() OVER(PARTITION BY session_id, event_time ORDER BY event_id) AS rn\n  FROM events\n)\nDELETE FROM events WHERE event_id IN (SELECT event_id FROM ranked WHERE rn > 1);",
    postgresql: "WITH ranked AS (\n  SELECT event_id, session_id, event_time,\n         ROW_NUMBER() OVER(PARTITION BY session_id, event_time ORDER BY event_id) AS rn\n  FROM events\n)\nDELETE FROM events WHERE event_id IN (SELECT event_id FROM ranked WHERE rn > 1);",
    sqlserver: "WITH ranked AS (\n  SELECT event_id, session_id, event_time,\n         ROW_NUMBER() OVER(PARTITION BY session_id, event_time ORDER BY event_id) AS rn\n  FROM events\n)\nDELETE FROM ranked WHERE rn > 1;",
    useCases: ['Pulizia log duplicati', 'Preparazione firme output'],
    pitfalls: ['DELETE muta dati demo; eseguire dopo backup']
  }),
  baseEntry({
    keyword: 'AUDIT LOG',
    category: 'Governance',
    syntax: 'INSERT trigger su modifiche',
    description: 'Registra cambi su tabelle critiche.',
    sqlite: "CREATE TABLE IF NOT EXISTS audit_log_demo(entity TEXT, event_type TEXT, created_at TEXT);\nINSERT INTO audit_log_demo VALUES('orders','UPDATE', datetime('now'));",
    useCases: ['Traccia modifiche', 'Forensics'],
    pitfalls: ['Trigger possono impattare performance']
  }),
  baseEntry({
    keyword: 'MASKING',
    category: 'Security',
    syntax: 'funzioni per offuscare dati sensibili',
    description: 'Oscura PII in query o viste.',
    sqlite: "SELECT id, substr(email,1,3) || '***' AS masked_email FROM customers LIMIT 10;",
    postgresql: "SELECT id, regexp_replace(email, '(^...).*(.@.*$)', '\\1***\\2') AS masked_email FROM customers;",
    sqlserver: "SELECT id, CONCAT(LEFT(email,3),'***',RIGHT(email,5)) AS masked_email FROM customers;",
    useCases: ['Condivisione dataset demo', 'Limitare esposizione PII'],
    pitfalls: ['Non sostituisce controlli di accesso']
  }),
  baseEntry({
    keyword: 'ROW LEVEL SECURITY',
    category: 'Security',
    syntax: 'POLICY per utente/ruolo',
    description: 'Restringe righe visibili in base al ruolo.',
    sqlite: "SELECT id, name FROM customers WHERE segment='SMB'; -- simulazione RLS",
    postgresql: "ALTER TABLE customers ENABLE ROW LEVEL SECURITY;\nCREATE POLICY smb_only ON customers USING (segment='SMB');",
    sqlserver: "CREATE SECURITY POLICY segment_policy ADD FILTER PREDICATE segment = 'SMB' ON dbo.customers WITH (STATE=ON);",
    useCases: ['Multi-tenant', 'Least privilege'],
    pitfalls: ['Non supportato in SQLite; simulare via WHERE']
  }),
  baseEntry({
    keyword: 'GRANT',
    category: 'DCL',
    syntax: 'GRANT perm ON object TO role',
    description: 'Concede privilegi su oggetti.',
    sqlite: "SELECT 'GRANT non supportato in SQLite demo' AS note;",
    postgresql: "GRANT SELECT ON customers TO analyst;",
    sqlserver: "GRANT SELECT ON dbo.customers TO analyst;",
    useCases: ['Access control', 'Segregazione dei ruoli'],
    pitfalls: ['Non supportato nel playground SQLite']
  }),
  baseEntry({
    keyword: 'REVOKE',
    category: 'DCL',
    syntax: 'REVOKE perm ON object FROM role',
    description: 'Revoca privilegi precedentemente concessi.',
    sqlite: "SELECT 'REVOKE non supportato in SQLite demo' AS note;",
    postgresql: "REVOKE INSERT ON orders FROM analyst;",
    sqlserver: "REVOKE INSERT ON dbo.orders FROM analyst;",
    useCases: ['Revocare accessi errati', 'Ridurre superficie rischio'],
    pitfalls: ['Ordine GRANT/REVOKE influenza risultato effettivo']
  }),
  baseEntry({
    keyword: 'SET TRANSACTION',
    category: 'TCL',
    syntax: 'SET TRANSACTION ISOLATION LEVEL ...',
    description: 'Configura isolamento/readonly per la transazione corrente.',
    sqlite: "BEGIN IMMEDIATE; -- SQLite ha lock a livello DB\nSELECT COUNT(*) FROM orders; COMMIT;",
    postgresql: "BEGIN; SET TRANSACTION ISOLATION LEVEL REPEATABLE READ; SELECT COUNT(*) FROM orders; COMMIT;",
    sqlserver: "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ; BEGIN TRAN; SELECT COUNT(*) FROM orders; COMMIT;",
    useCases: ['Controllo concorrenza', 'Letture consistenti'],
    pitfalls: ['SQLite non supporta livelli granulari; lock più ampi']
  })
];

export const KEYWORD_ENTRIES = [...base, ...extras];
