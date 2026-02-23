const KEYWORD_ENTRIES = [
  {
    keyword: "SELECT",
    category: "Query",
    syntax: "SELECT col1, col2, espressione AS alias FROM sorgente;",
    description: "Proietta colonne o espressioni calcolate e costruisce il result set finale della query.",
    examples: {
      sqlite: "SELECT c.name, c.segment,\n       ROUND(SUM(o.total_amount), 2) AS lifetime_value\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.status IN ('PAID','SHIPPED')\nGROUP BY c.id\nORDER BY lifetime_value DESC\nLIMIT 20;",
      postgresql: "SELECT c.name, c.segment,\n       ROUND(SUM(o.total_amount)::numeric, 2) AS lifetime_value\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.status IN ('PAID','SHIPPED')\nGROUP BY c.id, c.name, c.segment\nORDER BY lifetime_value DESC\nLIMIT 20;",
      sqlserver: "SELECT TOP 20 c.name, c.segment,\n       ROUND(SUM(o.total_amount), 2) AS lifetime_value\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.status IN ('PAID','SHIPPED')\nGROUP BY c.id, c.name, c.segment\nORDER BY lifetime_value DESC;"
    },
    useCases: [
      "Estrarre dataset analitici per dashboard e report.",
      "Ridurre il payload selezionando solo le colonne necessarie.",
      "Calcolare metriche derivate (somme, medie, conteggi) inline."
    ],
    pitfalls: [
      "SELECT * su tabelle larghe aumenta I/O e accoppia il codice allo schema.",
      "Alias mancanti rendono illeggibili le query con molte espressioni calcolate.",
      "In PostgreSQL e SQL Server, tutte le colonne non aggregate devono essere nel GROUP BY."
    ],
    dialectNotes: {
      sqlite: "SQLite e permissivo: colonne non aggregate fuori dal GROUP BY non generano errore ma il valore restituito e non deterministico.",
      postgresql: "PostgreSQL richiede che ogni colonna nel SELECT sia nel GROUP BY oppure dentro una funzione aggregata.",
      sqlserver: "SQL Server usa TOP n al posto di LIMIT n. Richiede tutte le colonne non aggregate nel GROUP BY."
    }
  },
  {
    keyword: "FROM",
    category: "Query",
    syntax: "SELECT ... FROM tabella_o_subquery [AS alias];",
    description: "Specifica la sorgente dati primaria: tabella fisica, vista, CTE o subquery derivata.",
    examples: {
      sqlite: "SELECT o.id, o.order_date, o.total_amount\nFROM orders o\nWHERE o.status = 'PAID'\nLIMIT 15;",
      postgresql: "SELECT o.id, o.order_date, o.total_amount\nFROM orders o\nWHERE o.status = 'PAID'\nLIMIT 15;",
      sqlserver: "SELECT TOP 15 o.id, o.order_date, o.total_amount\nFROM orders o\nWHERE o.status = 'PAID';"
    },
    useCases: [
      "Indicare la tabella principale da interrogare.",
      "Usare alias per abbreviare riferimenti in query complesse.",
      "Derivare dati da subquery inline come sorgente virtuale."
    ],
    pitfalls: [
      "Subquery nel FROM senza alias causano errore di sintassi in tutti i dialetti.",
      "Self-join senza alias distinti rendono ambigue le colonne referenziate."
    ],
    dialectNotes: {
      sqlite: "SQLite accetta FROM con subquery, CTE e tabelle virtuali.",
      postgresql: "PostgreSQL supporta LATERAL join per subquery correlate nel FROM.",
      sqlserver: "SQL Server supporta CROSS APPLY / OUTER APPLY come alternativa a subquery correlate nel FROM."
    }
  },
  {
    keyword: "WHERE",
    category: "Query",
    syntax: "SELECT ... FROM tabella WHERE condizione_booleana;",
    description: "Filtra le righe prima di aggregazioni e window functions valutando un predicato booleano riga per riga.",
    examples: {
      sqlite: "SELECT id, name, segment\nFROM customers\nWHERE country = 'Italy'\n  AND credit_limit > 5000\n  AND segment IN ('Enterprise','Premium');",
      postgresql: "SELECT id, name, segment\nFROM customers\nWHERE country = 'Italy'\n  AND credit_limit > 5000\n  AND segment IN ('Enterprise','Premium');",
      sqlserver: "SELECT id, name, segment\nFROM customers\nWHERE country = 'Italy'\n  AND credit_limit > 5000\n  AND segment IN ('Enterprise','Premium');"
    },
    useCases: [
      "Applicare regole business prima di aggregare (es. solo ordini pagati).",
      "Limitare scansioni a finestre temporali o stati specifici.",
      "Ridurre dataset a un segmento target prima di join costose."
    ],
    pitfalls: [
      "Filtri su funzioni (es. DATE(colonna)) impediscono l'uso di indici in tutti i DBMS.",
      "Mescolare AND e OR senza parentesi produce risultati logici errati.",
      "Condizioni su colonne con NULL richiedono IS NULL, non = NULL."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta GLOB per pattern case-sensitive e REGEXP se l'estensione e caricata.",
      postgresql: "PostgreSQL supporta ILIKE per pattern case-insensitive e operatori regex (~, ~*, !~).",
      sqlserver: "SQL Server non ha ILIKE; per case-insensitive si usa collation o LOWER()/UPPER() espliciti."
    }
  },
  {
    keyword: "ORDER BY",
    category: "Query",
    syntax: "SELECT ... FROM tabella ORDER BY espressione [ASC|DESC] [NULLS FIRST|LAST];",
    description: "Ordina il result set finale secondo una o piu espressioni con direzione ascendente o discendente.",
    examples: {
      sqlite: "SELECT id, order_date, total_amount\nFROM orders\nWHERE status = 'PAID'\nORDER BY total_amount DESC, order_date ASC\nLIMIT 20;",
      postgresql: "SELECT id, order_date, total_amount\nFROM orders\nWHERE status = 'PAID'\nORDER BY total_amount DESC NULLS LAST, order_date ASC\nLIMIT 20;",
      sqlserver: "SELECT TOP 20 id, order_date, total_amount\nFROM orders\nWHERE status = 'PAID'\nORDER BY total_amount DESC, order_date ASC;"
    },
    useCases: [
      "Creare classifiche top-N (migliori clienti, prodotti piu venduti).",
      "Garantire ordine deterministico per paginazione server-side.",
      "Prioritizzare code operative per importo, data o SLA."
    ],
    pitfalls: [
      "ORDER BY non univoco rende instabile la paginazione tra esecuzioni successive.",
      "Ordinare su colonne non indicizzate e costoso su grandi volumi di dati.",
      "NULLS FIRST/LAST non e supportato in SQL Server: usare CASE WHEN col IS NULL."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta NULLS FIRST / NULLS LAST dalla versione 3.30.0.",
      postgresql: "PostgreSQL supporta nativamente NULLS FIRST / NULLS LAST in ORDER BY.",
      sqlserver: "SQL Server non supporta NULLS FIRST/LAST. Workaround: ORDER BY CASE WHEN col IS NULL THEN 1 ELSE 0 END, col."
    }
  },
  {
    keyword: "LIMIT",
    category: "Query",
    syntax: "SELECT ... FROM tabella ORDER BY col LIMIT n [OFFSET m];",
    description: "Restringe il numero massimo di righe restituite dalla query, tipicamente usato con ORDER BY.",
    examples: {
      sqlite: "SELECT name, segment, credit_limit\nFROM customers\nORDER BY credit_limit DESC\nLIMIT 10;",
      postgresql: "SELECT name, segment, credit_limit\nFROM customers\nORDER BY credit_limit DESC\nLIMIT 10;",
      sqlserver: "-- SQL Server usa TOP invece di LIMIT\nSELECT TOP 10 name, segment, credit_limit\nFROM customers\nORDER BY credit_limit DESC;"
    },
    useCases: [
      "Paginazione: LIMIT 20 OFFSET 40 per la terza pagina.",
      "Top-N analitici per report e dashboard.",
      "Limitare output durante sviluppo e debug."
    ],
    pitfalls: [
      "LIMIT senza ORDER BY non garantisce ordine deterministico delle righe.",
      "OFFSET elevati peggiorano le performance: preferire keyset pagination su grandi tabelle."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta LIMIT n OFFSET m. Sinonimo: LIMIT m, n (sintassi legacy MySQL-compatibile).",
      postgresql: "PostgreSQL supporta LIMIT n OFFSET m e anche la sintassi standard FETCH FIRST n ROWS ONLY.",
      sqlserver: "SQL Server usa SELECT TOP n oppure OFFSET m ROWS FETCH NEXT n ROWS ONLY (richiede ORDER BY)."
    }
  },
  {
    keyword: "DISTINCT",
    category: "Query",
    syntax: "SELECT DISTINCT col1 [, col2 ...] FROM tabella;",
    description: "Elimina le righe duplicate nel result set basandosi sulla combinazione di tutte le colonne selezionate.",
    examples: {
      sqlite: "SELECT DISTINCT segment, country\nFROM customers\nORDER BY segment;",
      postgresql: "SELECT DISTINCT ON (segment) segment, name, country\nFROM customers\nORDER BY segment, credit_limit DESC;",
      sqlserver: "SELECT DISTINCT segment, country\nFROM customers\nORDER BY segment;"
    },
    useCases: [
      "Ottenere valori unici per popolare filtri o dropdown.",
      "Verificare la cardinalita effettiva di una colonna.",
      "Deduplicare dataset prima di aggregazioni successive."
    ],
    pitfalls: [
      "DISTINCT su molte colonne puo essere costoso perche richiede sort o hash.",
      "DISTINCT ON e solo PostgreSQL: non funziona in SQLite e SQL Server."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta DISTINCT standard. Non supporta DISTINCT ON.",
      postgresql: "PostgreSQL supporta DISTINCT ON (colonne) per selezionare la prima riga per gruppo — molto utile e unico di PostgreSQL.",
      sqlserver: "SQL Server supporta solo DISTINCT standard. Per DISTINCT ON, usare ROW_NUMBER() OVER(PARTITION BY ...)."
    }
  },
  {
    keyword: "JOIN",
    category: "Query",
    syntax: "SELECT ... FROM tabella_a JOIN tabella_b ON a.chiave = b.chiave;",
    description: "Combina righe di due tabelle restituendo solo le coppie che soddisfano la condizione ON (INNER JOIN implicito).",
    examples: {
      sqlite: "SELECT o.id, o.order_date,\n       c.name AS customer_name,\n       c.segment\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE o.status = 'PAID'\nORDER BY o.order_date DESC\nLIMIT 20;",
      postgresql: "SELECT o.id, o.order_date,\n       c.name AS customer_name,\n       c.segment\nFROM orders o\nINNER JOIN customers c ON c.id = o.customer_id\nWHERE o.status = 'PAID'\nORDER BY o.order_date DESC\nLIMIT 20;",
      sqlserver: "SELECT TOP 20 o.id, o.order_date,\n       c.name AS customer_name,\n       c.segment\nFROM orders o\nINNER JOIN customers c ON c.id = o.customer_id\nWHERE o.status = 'PAID'\nORDER BY o.order_date DESC;"
    },
    useCases: [
      "Arricchire ordini con dati cliente (nome, segmento, paese).",
      "Collegare order_items a products per ottenere nome e prezzo prodotto.",
      "Ricostruire flussi end-to-end tra vendite, logistica e supporto."
    ],
    pitfalls: [
      "Join senza indice sulla chiave di join causa full table scan costose.",
      "Chiavi con tipi diversi (TEXT vs INTEGER) generano mismatch silenzioso.",
      "JOIN senza ON restituisce un prodotto cartesiano (CROSS JOIN implicito)."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta INNER, LEFT, CROSS e NATURAL JOIN. Non supporta RIGHT JOIN ne FULL OUTER JOIN.",
      postgresql: "PostgreSQL supporta tutti i tipi di JOIN incluso FULL OUTER JOIN e LATERAL.",
      sqlserver: "SQL Server supporta INNER, LEFT, RIGHT, FULL OUTER, CROSS JOIN e CROSS/OUTER APPLY."
    }
  },
  {
    keyword: "LEFT JOIN",
    category: "Query",
    syntax: "SELECT ... FROM tabella_a LEFT JOIN tabella_b ON condizione;",
    description: "Mantiene tutte le righe della tabella sinistra anche quando non esiste corrispondenza nella tabella destra (colonne destra = NULL).",
    examples: {
      sqlite: "SELECT c.name,\n       COUNT(o.id) AS total_orders,\n       COALESCE(SUM(o.total_amount), 0) AS total_spent\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.id\nORDER BY total_spent DESC;",
      postgresql: "SELECT c.name,\n       COUNT(o.id) AS total_orders,\n       COALESCE(SUM(o.total_amount), 0) AS total_spent\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.id, c.name\nORDER BY total_spent DESC;",
      sqlserver: "SELECT c.name,\n       COUNT(o.id) AS total_orders,\n       COALESCE(SUM(o.total_amount), 0) AS total_spent\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.id, c.name\nORDER BY total_spent DESC;"
    },
    useCases: [
      "Trovare clienti senza ordini (WHERE o.id IS NULL).",
      "Contare ordini per cliente includendo chi ha zero ordini.",
      "Arricchire dati senza escludere righe senza corrispondenza."
    ],
    pitfalls: [
      "Filtro nel WHERE sulla tabella destra trasforma LEFT JOIN in INNER JOIN. Spostare il filtro nella clausola ON.",
      "LEFT JOIN con tabella destra molto grande senza indice puo essere lento."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta LEFT JOIN. Non supporta RIGHT JOIN: invertire l'ordine delle tabelle come workaround.",
      postgresql: "PostgreSQL supporta LEFT JOIN e anche LEFT OUTER JOIN (sono sinonimi).",
      sqlserver: "SQL Server supporta LEFT JOIN. La vecchia sintassi *= e deprecata: usare sempre LEFT JOIN esplicito."
    }
  },
  {
    keyword: "GROUP BY",
    category: "Query",
    syntax: "SELECT chiave, funzione_aggregata(col) FROM tabella GROUP BY chiave;",
    description: "Raggruppa le righe con lo stesso valore nelle colonne chiave per calcolare funzioni aggregate (SUM, COUNT, AVG, MIN, MAX).",
    examples: {
      sqlite: "SELECT c.segment,\n       COUNT(*) AS n_customers,\n       ROUND(AVG(c.credit_limit), 2) AS avg_credit\nFROM customers c\nGROUP BY c.segment\nORDER BY n_customers DESC;",
      postgresql: "SELECT c.segment,\n       COUNT(*) AS n_customers,\n       ROUND(AVG(c.credit_limit), 2) AS avg_credit\nFROM customers c\nGROUP BY c.segment\nORDER BY n_customers DESC;",
      sqlserver: "SELECT c.segment,\n       COUNT(*) AS n_customers,\n       ROUND(AVG(c.credit_limit), 2) AS avg_credit\nFROM customers c\nGROUP BY c.segment\nORDER BY n_customers DESC;"
    },
    useCases: [
      "Calcolare KPI per segmento, canale, area geografica.",
      "Produrre report aggregati per periodo (mese, trimestre, anno).",
      "Verificare distribuzione dati per capacity planning."
    ],
    pitfalls: [
      "Colonne nel SELECT non aggregate e non nel GROUP BY causano errore in PostgreSQL e SQL Server.",
      "Granularita GROUP BY errata altera i KPI risultanti.",
      "GROUP BY su espressioni calcolate puo impedire l'uso di indici."
    ],
    dialectNotes: {
      sqlite: "SQLite e permissivo: colonne non aggregate fuori dal GROUP BY non generano errore ma il risultato e arbitrario.",
      postgresql: "PostgreSQL richiede rigidamente che ogni colonna non aggregata sia nel GROUP BY. Supporta GROUP BY GROUPING SETS, CUBE, ROLLUP.",
      sqlserver: "SQL Server richiede tutte le colonne non aggregate nel GROUP BY. Supporta GROUPING SETS, CUBE e ROLLUP."
    }
  },
  {
    keyword: "HAVING",
    category: "Query",
    syntax: "SELECT chiave, AGG(col) FROM tabella GROUP BY chiave HAVING condizione_su_aggregata;",
    description: "Filtra i gruppi dopo il calcolo delle funzioni aggregate — complemento di WHERE che agisce prima dell'aggregazione.",
    examples: {
      sqlite: "SELECT p.category,\n       COUNT(*) AS n_products,\n       ROUND(AVG(p.price), 2) AS avg_price\nFROM products p\nGROUP BY p.category\nHAVING COUNT(*) >= 5\nORDER BY avg_price DESC;",
      postgresql: "SELECT p.category,\n       COUNT(*) AS n_products,\n       ROUND(AVG(p.price)::numeric, 2) AS avg_price\nFROM products p\nGROUP BY p.category\nHAVING COUNT(*) >= 5\nORDER BY avg_price DESC;",
      sqlserver: "SELECT p.category,\n       COUNT(*) AS n_products,\n       ROUND(AVG(p.price), 2) AS avg_price\nFROM products p\nGROUP BY p.category\nHAVING COUNT(*) >= 5\nORDER BY avg_price DESC;"
    },
    useCases: [
      "Filtrare categorie con almeno N prodotti.",
      "Selezionare solo segmenti con revenue superiore a una soglia.",
      "Identificare gruppi anomali o outlier nelle metriche aggregate."
    ],
    pitfalls: [
      "Usare HAVING per filtri non aggregati e uno spreco: WHERE e piu efficiente perche filtra prima.",
      "Riferire alias del SELECT in HAVING non funziona in PostgreSQL e SQL Server (solo SQLite lo permette)."
    ],
    dialectNotes: {
      sqlite: "SQLite permette di usare alias definiti nel SELECT all'interno di HAVING.",
      postgresql: "PostgreSQL non permette alias nel HAVING: ripetere l'espressione aggregata o usare una subquery.",
      sqlserver: "SQL Server non permette alias nel HAVING: ripetere la funzione aggregata completa."
    }
  },
  {
    keyword: "WITH",
    category: "Query",
    syntax: "WITH nome_cte AS (SELECT ...) SELECT ... FROM nome_cte;",
    description: "Definisce una Common Table Expression (CTE): un blocco query con nome riutilizzabile nella query principale.",
    examples: {
      sqlite: "WITH monthly AS (\n  SELECT substr(order_date, 1, 7) AS mese,\n         ROUND(SUM(total_amount), 2) AS revenue\n  FROM orders\n  WHERE status IN ('PAID','SHIPPED')\n  GROUP BY substr(order_date, 1, 7)\n)\nSELECT mese, revenue\nFROM monthly\nORDER BY mese;",
      postgresql: "WITH monthly AS (\n  SELECT to_char(order_date::date, 'YYYY-MM') AS mese,\n         ROUND(SUM(total_amount)::numeric, 2) AS revenue\n  FROM orders\n  WHERE status IN ('PAID','SHIPPED')\n  GROUP BY to_char(order_date::date, 'YYYY-MM')\n)\nSELECT mese, revenue\nFROM monthly\nORDER BY mese;",
      sqlserver: "WITH monthly AS (\n  SELECT LEFT(order_date, 7) AS mese,\n         ROUND(SUM(total_amount), 2) AS revenue\n  FROM orders\n  WHERE status IN ('PAID','SHIPPED')\n  GROUP BY LEFT(order_date, 7)\n)\nSELECT mese, revenue\nFROM monthly\nORDER BY mese;"
    },
    useCases: [
      "Spezzare query lunghe in blocchi logici manutenibili.",
      "Riutilizzare risultati intermedi senza duplicare subquery.",
      "Preparare dati aggregati da usare in join successive."
    ],
    pitfalls: [
      "CTE non materializzate possono essere rieseguite piu volte dal query planner, degradando le performance.",
      "Troppe CTE concatenate rendono la query difficile da debuggare."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta CTE e CTE ricorsive. Le CTE non sono materializzate (rieseguite come subquery).",
      postgresql: "PostgreSQL materializza le CTE di default fino alla v12. Dalla v12+ il planner puo fare inline. Usa MATERIALIZED/NOT MATERIALIZED per controllare.",
      sqlserver: "SQL Server non materializza le CTE: sono equivalenti a subquery inline. Per materializzare, usare tabelle temporanee."
    }
  },
  {
    keyword: "CASE",
    category: "Query",
    syntax: "CASE WHEN condizione THEN valore [WHEN ... THEN ...] ELSE fallback END",
    description: "Introduce logica condizionale inline dentro SELECT, WHERE, ORDER BY o UPDATE SET — equivalente SQL di if/else.",
    examples: {
      sqlite: "SELECT name,\n       total_amount,\n       CASE\n         WHEN total_amount > 1000 THEN 'Alto'\n         WHEN total_amount > 200  THEN 'Medio'\n         ELSE 'Basso'\n       END AS fascia\nFROM orders\nORDER BY total_amount DESC\nLIMIT 20;",
      postgresql: "SELECT name,\n       total_amount,\n       CASE\n         WHEN total_amount > 1000 THEN 'Alto'\n         WHEN total_amount > 200  THEN 'Medio'\n         ELSE 'Basso'\n       END AS fascia\nFROM orders\nORDER BY total_amount DESC\nLIMIT 20;",
      sqlserver: "SELECT TOP 20 name,\n       total_amount,\n       CASE\n         WHEN total_amount > 1000 THEN 'Alto'\n         WHEN total_amount > 200  THEN 'Medio'\n         ELSE 'Basso'\n       END AS fascia\nFROM orders\nORDER BY total_amount DESC;"
    },
    useCases: [
      "Classificare righe in bucket business (alto/medio/basso).",
      "Calcolare tariffe o sconti condizionali in query analitiche.",
      "Creare flag 0/1 per metriche di conversion rate."
    ],
    pitfalls: [
      "Omettere ELSE produce NULL implicito — puo causare errori a valle.",
      "Rami WHEN con tipi incompatibili (TEXT vs INTEGER) forzano cast impliciti non portabili.",
      "CASE valuta i rami in ordine: il primo WHEN TRUE vince, gli altri vengono ignorati."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta CASE semplice e CASE ricercato. I tipi dei rami vengono convertiti implicitamente.",
      postgresql: "PostgreSQL e rigoroso sui tipi dei rami THEN/ELSE: devono essere compatibili o richiedono CAST esplicito.",
      sqlserver: "SQL Server valuta la precedenza dei tipi tra i rami e converte implicitamente al tipo con precedenza piu alta."
    }
  },
  {
    keyword: "UNION",
    category: "Query",
    syntax: "SELECT ... UNION [ALL] SELECT ...;",
    description: "Combina i result set di due o piu SELECT in un unico output. UNION elimina duplicati; UNION ALL li mantiene.",
    examples: {
      sqlite: "SELECT 'Ordini' AS fonte, COUNT(*) AS totale FROM orders\nUNION ALL\nSELECT 'Resi', COUNT(*) FROM returns\nUNION ALL\nSELECT 'Ticket', COUNT(*) FROM support_tickets;",
      postgresql: "SELECT 'Ordini' AS fonte, COUNT(*) AS totale FROM orders\nUNION ALL\nSELECT 'Resi', COUNT(*) FROM returns\nUNION ALL\nSELECT 'Ticket', COUNT(*) FROM support_tickets;",
      sqlserver: "SELECT 'Ordini' AS fonte, COUNT(*) AS totale FROM orders\nUNION ALL\nSELECT 'Resi', COUNT(*) FROM returns\nUNION ALL\nSELECT 'Ticket', COUNT(*) FROM support_tickets;"
    },
    useCases: [
      "Comporre feed da sorgenti diverse con schema uniforme.",
      "Creare tabelle pivot manuali unendo query per categoria.",
      "Confrontare conteggi tra tabelle in un unico risultato."
    ],
    pitfalls: [
      "Le SELECT unite devono avere lo stesso numero e tipo compatibile di colonne.",
      "UNION senza ALL deduplica e richiede sort/hash: piu costoso di UNION ALL.",
      "ORDER BY si applica all'intero UNION, non alla singola SELECT componente."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta UNION, UNION ALL, INTERSECT, EXCEPT.",
      postgresql: "PostgreSQL supporta UNION, INTERSECT, EXCEPT e le varianti ALL per ciascuno.",
      sqlserver: "SQL Server supporta UNION, INTERSECT, EXCEPT. EXCEPT equivale a MINUS di Oracle."
    }
  },
  {
    keyword: "EXISTS",
    category: "Query",
    syntax: "SELECT ... WHERE EXISTS (SELECT 1 FROM tabella WHERE condizione_correlata);",
    description: "Restituisce TRUE se la subquery correlata produce almeno una riga — piu efficiente di IN per grandi dataset.",
    examples: {
      sqlite: "SELECT c.name, c.segment\nFROM customers c\nWHERE EXISTS (\n  SELECT 1 FROM orders o\n  WHERE o.customer_id = c.id\n    AND o.status = 'PAID'\n);",
      postgresql: "SELECT c.name, c.segment\nFROM customers c\nWHERE EXISTS (\n  SELECT 1 FROM orders o\n  WHERE o.customer_id = c.id\n    AND o.status = 'PAID'\n);",
      sqlserver: "SELECT c.name, c.segment\nFROM customers c\nWHERE EXISTS (\n  SELECT 1 FROM orders o\n  WHERE o.customer_id = c.id\n    AND o.status = 'PAID'\n);"
    },
    useCases: [
      "Verificare esistenza di almeno un record correlato (es. clienti con ordini).",
      "Sostituire IN con subquery per performance migliori su grandi tabelle.",
      "Implementare logica semi-join nel piano di esecuzione."
    ],
    pitfalls: [
      "NOT EXISTS con subquery che restituisce NULL funziona correttamente (a differenza di NOT IN).",
      "Subquery non correlata in EXISTS e sempre TRUE se ha almeno una riga — quasi mai voluto."
    ],
    dialectNotes: {
      sqlite: "SQLite ottimizza EXISTS come semi-join quando possibile.",
      postgresql: "PostgreSQL converte automaticamente EXISTS in semi-join nell'ottimizzatore.",
      sqlserver: "SQL Server supporta EXISTS e lo ottimizza bene. Per anti-join preferire NOT EXISTS a NOT IN con NULL."
    }
  },
  {
    keyword: "IN",
    category: "Query",
    syntax: "SELECT ... WHERE colonna IN (valore1, valore2, ... | SELECT ...);",
    description: "Verifica se un valore appartiene a una lista esplicita o al result set di una subquery.",
    examples: {
      sqlite: "SELECT id, name, status\nFROM orders\nWHERE status IN ('PAID', 'SHIPPED', 'REFUNDED')\nORDER BY order_date DESC\nLIMIT 20;",
      postgresql: "SELECT id, name, status\nFROM orders\nWHERE status IN ('PAID', 'SHIPPED', 'REFUNDED')\nORDER BY order_date DESC\nLIMIT 20;",
      sqlserver: "SELECT TOP 20 id, name, status\nFROM orders\nWHERE status IN ('PAID', 'SHIPPED', 'REFUNDED')\nORDER BY order_date DESC;"
    },
    useCases: [
      "Filtrare righe per un set finito di valori noti.",
      "Selezionare record i cui ID appaiono in un'altra tabella.",
      "Rimpiazzare catene di OR con sintassi piu leggibile."
    ],
    pitfalls: [
      "NOT IN con subquery che contiene NULL restituisce sempre zero righe — usare NOT EXISTS come alternativa.",
      "Liste IN molto lunghe possono rallentare il parsing e non usare indici efficientemente."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta IN con lista e subquery. Limite pratico di elementi nella lista: dipende da SQLITE_MAX_VARIABLE_NUMBER.",
      postgresql: "PostgreSQL supporta IN e anche = ANY(ARRAY[...]) come alternativa con array nativi.",
      sqlserver: "SQL Server supporta IN con lista e subquery. Per liste molto grandi, considerare una tabella temporanea con JOIN."
    }
  },
  {
    keyword: "BETWEEN",
    category: "Query",
    syntax: "SELECT ... WHERE colonna BETWEEN valore_min AND valore_max;",
    description: "Filtra righe il cui valore e compreso nell'intervallo chiuso [min, max] — inclusivo su entrambi gli estremi.",
    examples: {
      sqlite: "SELECT id, order_date, total_amount\nFROM orders\nWHERE order_date BETWEEN '2025-01-01' AND '2025-12-31'\nORDER BY order_date;",
      postgresql: "SELECT id, order_date, total_amount\nFROM orders\nWHERE order_date BETWEEN '2025-01-01' AND '2025-12-31'\nORDER BY order_date;",
      sqlserver: "SELECT id, order_date, total_amount\nFROM orders\nWHERE order_date BETWEEN '2025-01-01' AND '2025-12-31'\nORDER BY order_date;"
    },
    useCases: [
      "Filtrare per intervallo di date (trimestre, anno, mese).",
      "Selezionare ordini con importo in una fascia specifica.",
      "Filtrare ID in un range noto per batch processing."
    ],
    pitfalls: [
      "BETWEEN su DATETIME include le 00:00:00 del giorno finale: per escluderlo usare < giorno+1.",
      "BETWEEN su testo usa ordinamento lessicografico dipendente dalla collation del database."
    ],
    dialectNotes: {
      sqlite: "SQLite confronta date come stringhe: funziona correttamente solo con formato ISO 'YYYY-MM-DD'.",
      postgresql: "PostgreSQL confronta date con tipo DATE nativo e gestisce correttamente fusi orari con TIMESTAMPTZ.",
      sqlserver: "SQL Server confronta DATETIME includendo la parte oraria: attenzione a BETWEEN con date senza ora."
    }
  },
  {
    keyword: "LIKE",
    category: "Query",
    syntax: "SELECT ... WHERE colonna LIKE 'pattern';",
    description: "Filtra righe tramite pattern matching testuale con wildcard % (zero o piu caratteri) e _ (un carattere).",
    examples: {
      sqlite: "SELECT name, segment\nFROM customers\nWHERE name LIKE 'A%'\nORDER BY name;",
      postgresql: "-- ILIKE per case-insensitive\nSELECT name, segment\nFROM customers\nWHERE name ILIKE 'a%'\nORDER BY name;",
      sqlserver: "-- Case sensitivity dipende dalla collation\nSELECT name, segment\nFROM customers\nWHERE name LIKE 'A%'\nORDER BY name;"
    },
    useCases: [
      "Cercare clienti il cui nome inizia con una lettera specifica.",
      "Filtrare prodotti per pattern di categoria.",
      "Validare formati testuali (es. codici con prefisso fisso)."
    ],
    pitfalls: [
      "Pattern con wildcard iniziale (%abc) impedisce l'uso di indici in tutti i DBMS.",
      "Case sensitivity di LIKE varia tra dialetti: SQLite e case-insensitive su ASCII, PostgreSQL e case-sensitive."
    ],
    dialectNotes: {
      sqlite: "SQLite LIKE e case-insensitive per caratteri ASCII, case-sensitive per Unicode. Usa GLOB per matching case-sensitive.",
      postgresql: "PostgreSQL LIKE e case-sensitive. Usare ILIKE per matching case-insensitive. Supporta anche regex con ~ e ~*.",
      sqlserver: "SQL Server LIKE segue la collation del database. Con collation CI (Case Insensitive) il matching e case-insensitive."
    }
  },
  {
    keyword: "CAST",
    category: "Query",
    syntax: "CAST(espressione AS tipo_destinazione)",
    description: "Converte esplicitamente un valore da un tipo a un altro — standard SQL supportato da tutti i DBMS.",
    examples: {
      sqlite: "SELECT name,\n       CAST(total_amount AS INTEGER) AS importo_intero,\n       CAST(order_date AS TEXT) AS data_testo\nFROM orders\nLIMIT 10;",
      postgresql: "SELECT name,\n       CAST(total_amount AS INTEGER) AS importo_intero,\n       total_amount::text AS importo_testo\nFROM orders\nLIMIT 10;",
      sqlserver: "SELECT TOP 10 name,\n       CAST(total_amount AS INT) AS importo_intero,\n       CAST(total_amount AS VARCHAR(50)) AS importo_testo\nFROM orders;"
    },
    useCases: [
      "Uniformare tipi in join (es. TEXT vs INTEGER sulle chiavi).",
      "Preparare output per report (decimali arrotondati a interi).",
      "Convertire date in testo per concatenazione in label."
    ],
    pitfalls: [
      "Cast di valori non validi genera errore fatale: usare TRY_CAST/TRY_CONVERT in SQL Server.",
      "CAST in WHERE/JOIN puo impedire l'uso di indici sulla colonna.",
      "Tipi destinazione hanno nomi diversi tra dialetti (INT vs INTEGER, VARCHAR vs TEXT)."
    ],
    dialectNotes: {
      sqlite: "SQLite ha tipizzazione flessibile (affinity): CAST forza la conversione ma il motore non ha tipi rigidi.",
      postgresql: "PostgreSQL supporta CAST standard e l'operatore :: come shortcut (es. col::integer). Supporta anche ::regclass per tipi OID.",
      sqlserver: "SQL Server supporta CAST e anche TRY_CAST (ritorna NULL se conversione fallisce). Tipi: INT, BIGINT, VARCHAR(n), NVARCHAR(n), FLOAT, DECIMAL."
    }
  },
  {
    keyword: "CONVERT",
    category: "Query",
    syntax: "CONVERT(tipo_destinazione, espressione [, stile])",
    description: "Funzione di conversione tipo con sintassi specifica per dialetto — in SQL Server supporta parametro stile per formattazione date/numeri.",
    examples: {
      sqlite: "-- Nel lab SQLite, CONVERT e una funzione custom\nSELECT CONVERT('REAL', total_amount) AS importo_reale,\n       CONVERT('TEXT', order_date) AS data_testo\nFROM orders\nLIMIT 10;",
      postgresql: "-- PostgreSQL non ha CONVERT: usare CAST o ::\nSELECT total_amount::numeric AS importo_reale,\n       order_date::text AS data_testo\nFROM orders\nLIMIT 10;",
      sqlserver: "SELECT CONVERT(VARCHAR(10), GETDATE(), 120) AS data_iso,\n       CONVERT(FLOAT, total_amount) AS importo_float,\n       CONVERT(NVARCHAR(50), total_amount) AS importo_testo\nFROM orders;"
    },
    useCases: [
      "Formattare date in formato specifico (solo SQL Server con stile).",
      "Normalizzare input eterogenei prima delle aggregazioni.",
      "Migrare dati da staging con tipizzazione esplicita."
    ],
    pitfalls: [
      "CONVERT non e standard SQL: il codice non e portabile tra DBMS.",
      "In SQL Server, lo stile numerico errato produce output inatteso su date.",
      "PostgreSQL non ha CONVERT: usare CAST(...) o operatore :: come equivalente."
    ],
    dialectNotes: {
      sqlite: "SQLite non ha CONVERT nativo. In questo lab e implementata come funzione custom CONVERT(tipo, valore).",
      postgresql: "PostgreSQL non supporta CONVERT. Equivalente: CAST(expr AS tipo) oppure expr::tipo. Per formattare date: to_char().",
      sqlserver: "SQL Server CONVERT(tipo, expr [, stile]) e nativa. Il parametro stile controlla il formato di output per date e numeri."
    }
  },
  {
    keyword: "COALESCE",
    category: "Query",
    syntax: "COALESCE(valore1, valore2, ..., valore_default)",
    description: "Restituisce il primo valore non NULL nella lista di argomenti — utile per sostituire NULL con valori default.",
    examples: {
      sqlite: "SELECT c.name,\n       COALESCE(c.phone, c.email, 'N/A') AS contatto,\n       COALESCE(SUM(o.total_amount), 0) AS totale_ordini\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.id;",
      postgresql: "SELECT c.name,\n       COALESCE(c.phone, c.email, 'N/A') AS contatto,\n       COALESCE(SUM(o.total_amount), 0) AS totale_ordini\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.id, c.name;",
      sqlserver: "SELECT c.name,\n       COALESCE(c.phone, c.email, 'N/A') AS contatto,\n       COALESCE(SUM(o.total_amount), 0) AS totale_ordini\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.id, c.name;"
    },
    useCases: [
      "Fornire valori default per colonne nullable nei report.",
      "Gestire LEFT JOIN dove il lato destro puo essere NULL.",
      "Scegliere il primo contatto disponibile tra piu canali."
    ],
    pitfalls: [
      "COALESCE valuta tutti gli argomenti: se uno contiene subquery costosa, viene eseguita anche se preceduta da valore non NULL.",
      "Tipi degli argomenti devono essere compatibili: mescolare INTEGER e TEXT puo causare errori in dialetti rigidi."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta COALESCE con qualsiasi numero di argomenti. Tipizzazione flessibile.",
      postgresql: "PostgreSQL richiede tipi compatibili tra gli argomenti. Alternativa per due valori: funzione IFNULL non esiste, usare COALESCE.",
      sqlserver: "SQL Server supporta COALESCE e anche ISNULL(a, b) come alternativa per due valori. ISNULL e leggermente piu veloce."
    }
  },
  {
    keyword: "NULLIF",
    category: "Query",
    syntax: "NULLIF(espressione_a, espressione_b)",
    description: "Restituisce NULL se i due argomenti sono uguali, altrimenti restituisce il primo — usato per evitare divisioni per zero.",
    examples: {
      sqlite: "SELECT order_id,\n       total_amount,\n       discount_amount,\n       ROUND(total_amount / NULLIF(discount_amount, 0), 2) AS ratio_safe\nFROM orders\nWHERE discount_amount >= 0\nLIMIT 15;",
      postgresql: "SELECT order_id,\n       total_amount,\n       discount_amount,\n       ROUND((total_amount / NULLIF(discount_amount, 0))::numeric, 2) AS ratio_safe\nFROM orders\nWHERE discount_amount >= 0\nLIMIT 15;",
      sqlserver: "SELECT TOP 15 order_id,\n       total_amount,\n       discount_amount,\n       ROUND(total_amount / NULLIF(discount_amount, 0), 2) AS ratio_safe\nFROM orders\nWHERE discount_amount >= 0;"
    },
    useCases: [
      "Proteggere divisioni dal denominatore zero.",
      "Convertire stringhe vuote '' in NULL per pulizia dati.",
      "Annullare valori sentinella (es. -1, 0) trasformandoli in NULL."
    ],
    pitfalls: [
      "NULLIF(a, b) confronta solo uguaglianza: non gestisce intervalli o pattern.",
      "Il risultato e NULL, che si propaga in tutte le espressioni successive (es. SUM ignora NULL)."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta NULLIF con confronto basato su affinity.",
      postgresql: "PostgreSQL supporta NULLIF con tipizzazione rigorosa. I due argomenti devono avere tipi compatibili.",
      sqlserver: "SQL Server supporta NULLIF. Equivalente a: CASE WHEN a = b THEN NULL ELSE a END."
    }
  },
  {
    keyword: "OVER",
    category: "Query",
    syntax: "funzione() OVER ([PARTITION BY col] [ORDER BY col] [frame])",
    description: "Definisce la finestra di righe su cui calcolare una funzione analitica, senza collassare il result set come GROUP BY.",
    examples: {
      sqlite: "SELECT customer_id,\n       order_date,\n       total_amount,\n       SUM(total_amount) OVER (\n         PARTITION BY customer_id\n         ORDER BY order_date\n       ) AS running_total\nFROM orders\nWHERE status = 'PAID'\nORDER BY customer_id, order_date;",
      postgresql: "SELECT customer_id,\n       order_date,\n       total_amount,\n       SUM(total_amount) OVER (\n         PARTITION BY customer_id\n         ORDER BY order_date\n       ) AS running_total\nFROM orders\nWHERE status = 'PAID'\nORDER BY customer_id, order_date;",
      sqlserver: "SELECT customer_id,\n       order_date,\n       total_amount,\n       SUM(total_amount) OVER (\n         PARTITION BY customer_id\n         ORDER BY order_date\n       ) AS running_total\nFROM orders\nWHERE status = 'PAID'\nORDER BY customer_id, order_date;"
    },
    useCases: [
      "Running total / cumulativo per cliente o periodo.",
      "Ranking senza perdere il dettaglio riga (ROW_NUMBER, RANK, DENSE_RANK).",
      "Moving average per analisi trend (ROWS BETWEEN n PRECEDING AND CURRENT ROW)."
    ],
    pitfalls: [
      "OVER() senza ORDER BY rende il frame non deterministico per alcune funzioni.",
      "Il frame di default con ORDER BY e RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW — non ROWS.",
      "Frame diversi (ROWS vs RANGE) producono risultati diversi quando ci sono valori duplicati nell'ORDER BY."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta window functions dalla versione 3.25.0. Supporta ROWS, RANGE e GROUPS frame.",
      postgresql: "PostgreSQL supporta la sintassi completa delle window functions incluso GROUPS, EXCLUDE e named windows (WINDOW w AS ...).",
      sqlserver: "SQL Server supporta ROWS e RANGE frame. Non supporta GROUPS frame. Named windows non supportate prima di SQL Server 2022."
    }
  },
  {
    keyword: "ROW_NUMBER",
    category: "Query",
    syntax: "ROW_NUMBER() OVER (PARTITION BY col ORDER BY col)",
    description: "Assegna un numero progressivo univoco a ogni riga nella partizione, utile per deduplicazione e top-N per gruppo.",
    examples: {
      sqlite: "SELECT *\nFROM (\n  SELECT customer_id, order_date, total_amount,\n         ROW_NUMBER() OVER (\n           PARTITION BY customer_id\n           ORDER BY total_amount DESC\n         ) AS rn\n  FROM orders\n  WHERE status = 'PAID'\n) ranked\nWHERE rn <= 3;",
      postgresql: "SELECT *\nFROM (\n  SELECT customer_id, order_date, total_amount,\n         ROW_NUMBER() OVER (\n           PARTITION BY customer_id\n           ORDER BY total_amount DESC\n         ) AS rn\n  FROM orders\n  WHERE status = 'PAID'\n) ranked\nWHERE rn <= 3;",
      sqlserver: "SELECT *\nFROM (\n  SELECT customer_id, order_date, total_amount,\n         ROW_NUMBER() OVER (\n           PARTITION BY customer_id\n           ORDER BY total_amount DESC\n         ) AS rn\n  FROM orders\n  WHERE status = 'PAID'\n) ranked\nWHERE rn <= 3;"
    },
    useCases: [
      "Top-N per gruppo (es. i 3 ordini piu alti per cliente).",
      "Deduplicazione: tenere solo la riga piu recente per chiave.",
      "Paginazione avanzata con OFFSET simulato."
    ],
    pitfalls: [
      "ORDER BY non univoco nel ROW_NUMBER produce numerazione non deterministica.",
      "Non si puo filtrare su ROW_NUMBER nel WHERE della stessa query: serve una subquery o CTE."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta ROW_NUMBER() dalla versione 3.25.0.",
      postgresql: "PostgreSQL supporta ROW_NUMBER(). Alternativa per dedup: DISTINCT ON e piu conciso.",
      sqlserver: "SQL Server supporta ROW_NUMBER(). Molto usato con CTE per paginazione e dedup."
    }
  },
  {
    keyword: "LAG",
    category: "Query",
    syntax: "LAG(colonna [, offset [, default]]) OVER (ORDER BY col)",
    description: "Accede al valore di una riga precedente nella stessa finestra senza self-join — utile per calcoli delta e confronti temporali.",
    examples: {
      sqlite: "WITH monthly AS (\n  SELECT substr(order_date, 1, 7) AS mese,\n         ROUND(SUM(total_amount), 2) AS revenue\n  FROM orders WHERE status IN ('PAID','SHIPPED')\n  GROUP BY substr(order_date, 1, 7)\n)\nSELECT mese, revenue,\n       LAG(revenue) OVER (ORDER BY mese) AS prev_revenue,\n       ROUND(revenue - COALESCE(LAG(revenue) OVER (ORDER BY mese), 0), 2) AS delta\nFROM monthly;",
      postgresql: "WITH monthly AS (\n  SELECT to_char(order_date::date, 'YYYY-MM') AS mese,\n         ROUND(SUM(total_amount)::numeric, 2) AS revenue\n  FROM orders WHERE status IN ('PAID','SHIPPED')\n  GROUP BY to_char(order_date::date, 'YYYY-MM')\n)\nSELECT mese, revenue,\n       LAG(revenue) OVER (ORDER BY mese) AS prev_revenue,\n       ROUND(revenue - COALESCE(LAG(revenue) OVER (ORDER BY mese), 0), 2) AS delta\nFROM monthly;",
      sqlserver: "WITH monthly AS (\n  SELECT LEFT(order_date, 7) AS mese,\n         ROUND(SUM(total_amount), 2) AS revenue\n  FROM orders WHERE status IN ('PAID','SHIPPED')\n  GROUP BY LEFT(order_date, 7)\n)\nSELECT mese, revenue,\n       LAG(revenue) OVER (ORDER BY mese) AS prev_revenue,\n       ROUND(revenue - COALESCE(LAG(revenue) OVER (ORDER BY mese), 0), 2) AS delta\nFROM monthly;"
    },
    useCases: [
      "Calcolare variazione mese-su-mese (delta revenue).",
      "Confrontare il valore attuale con il precedente nella serie temporale.",
      "Identificare inversioni di trend in dashboard analitiche."
    ],
    pitfalls: [
      "La prima riga della partizione non ha riga precedente: LAG restituisce NULL (usare il terzo parametro come default).",
      "LAG richiede ORDER BY nella clausola OVER: senza, il risultato e non deterministico."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta LAG/LEAD dalla versione 3.25.0. Il terzo parametro (default) e opzionale.",
      postgresql: "PostgreSQL supporta LAG con tutte le opzioni: offset e default. Supporta anche IGNORE NULLS (v16+).",
      sqlserver: "SQL Server supporta LAG con offset e default. IGNORE NULLS non e supportato: usare subquery o OUTER APPLY."
    }
  },
  {
    keyword: "INSERT",
    category: "DML",
    syntax: "INSERT INTO tabella (col1, col2, ...) VALUES (v1, v2, ...);",
    description: "Aggiunge una o piu righe a una tabella specificando valori per le colonne indicate.",
    examples: {
      sqlite: "INSERT INTO customer_notes\n  (customer_id, note_date, note_type, note_text, author_employee_id)\nVALUES\n  (1, '2026-02-01', 'followup', 'Customer requested renewal', 2),\n  (3, '2026-02-01', 'alert', 'Payment overdue by 30 days', 5);",
      postgresql: "INSERT INTO customer_notes\n  (customer_id, note_date, note_type, note_text, author_employee_id)\nVALUES\n  (1, '2026-02-01', 'followup', 'Customer requested renewal', 2)\nRETURNING id, note_date;",
      sqlserver: "INSERT INTO customer_notes\n  (customer_id, note_date, note_type, note_text, author_employee_id)\nOUTPUT INSERTED.id, INSERTED.note_date\nVALUES\n  (1, '2026-02-01', 'followup', 'Customer requested renewal', 2);"
    },
    useCases: [
      "Popolare tabelle di staging con dati importati.",
      "Aggiungere record operativi (note, log, audit).",
      "Bulk insert con VALUES multipli per caricare dati di test."
    ],
    pitfalls: [
      "Ordine dei valori deve corrispondere esattamente all'ordine delle colonne specificate.",
      "INSERT senza lista colonne esplicita e fragile: rompe se la tabella cambia schema.",
      "Violazioni di vincoli (PK duplicata, FK inesistente) causano errore e rollback della riga."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta INSERT OR REPLACE e INSERT OR IGNORE per gestire conflitti senza errore.",
      postgresql: "PostgreSQL supporta INSERT ... ON CONFLICT (col) DO UPDATE (upsert) e RETURNING per ottenere i valori inseriti.",
      sqlserver: "SQL Server supporta OUTPUT INSERTED.* per restituire le righe inserite. Per upsert usare MERGE."
    }
  },
  {
    keyword: "UPDATE",
    category: "DML",
    syntax: "UPDATE tabella SET colonna = valore [, ...] WHERE condizione;",
    description: "Modifica i valori di colonne esistenti nelle righe che soddisfano la condizione WHERE.",
    examples: {
      sqlite: "UPDATE products\nSET price = ROUND(price * 1.05, 2),\n    is_active = 1\nWHERE category = 'Software'\n  AND stock > 0;",
      postgresql: "UPDATE products\nSET price = ROUND(price * 1.05, 2),\n    is_active = true\nWHERE category = 'Software'\n  AND stock > 0\nRETURNING id, name, price;",
      sqlserver: "UPDATE products\nSET price = ROUND(price * 1.05, 2),\n    is_active = 1\nOUTPUT INSERTED.id, INSERTED.name, INSERTED.price\nWHERE category = 'Software'\n  AND stock > 0;"
    },
    useCases: [
      "Repricing massivo su una categoria di prodotti.",
      "Aggiornare status ordini dopo conferma pagamento.",
      "Correggere dati errati in batch con filtro WHERE preciso."
    ],
    pitfalls: [
      "UPDATE senza WHERE aggiorna TUTTE le righe della tabella — errore gravissimo in produzione.",
      "Aggiornamenti massivi senza transazione rendono impossibile il rollback in caso di errore.",
      "UPDATE su colonne con indici causa aggiornamento degli indici stessi: impatto su performance."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta UPDATE con FROM clause (dalla versione 3.33.0) per aggiornare con join.",
      postgresql: "PostgreSQL supporta UPDATE ... FROM tabella_join WHERE ... e RETURNING per ottenere righe aggiornate.",
      sqlserver: "SQL Server supporta UPDATE ... FROM con JOIN nella clausola FROM e OUTPUT per restituire righe modificate."
    }
  },
  {
    keyword: "DELETE",
    category: "DML",
    syntax: "DELETE FROM tabella WHERE condizione;",
    description: "Rimuove le righe che soddisfano la condizione WHERE dalla tabella specificata.",
    examples: {
      sqlite: "DELETE FROM customer_notes\nWHERE note_type = 'obsolete'\n  AND note_date < '2024-01-01';",
      postgresql: "DELETE FROM customer_notes\nWHERE note_type = 'obsolete'\n  AND note_date < '2024-01-01'\nRETURNING id, customer_id;",
      sqlserver: "DELETE FROM customer_notes\nOUTPUT DELETED.id, DELETED.customer_id\nWHERE note_type = 'obsolete'\n  AND note_date < '2024-01-01';"
    },
    useCases: [
      "Pulizia dati obsoleti secondo retention policy.",
      "Rimuovere record duplicati verificati dopo dedup.",
      "Cancellare dati di test prima di rilascio in produzione."
    ],
    pitfalls: [
      "DELETE senza WHERE cancella TUTTE le righe — controllare sempre la condizione prima.",
      "DELETE con FK senza CASCADE fallisce se ci sono righe referenziate.",
      "Su tabelle grandi, DELETE massivo genera molto WAL/log: considerare batch con LIMIT."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta DELETE con LIMIT (non standard). Le righe cancellate non rilasciano spazio senza VACUUM.",
      postgresql: "PostgreSQL supporta DELETE ... USING tabella_join WHERE ... e RETURNING. Spazio rilasciato da VACUUM o autovacuum.",
      sqlserver: "SQL Server supporta DELETE con FROM e JOIN nella clausola FROM. TRUNCATE TABLE e piu veloce per svuotare completamente."
    }
  },
  {
    keyword: "BEGIN",
    category: "Transazioni",
    syntax: "BEGIN [TRANSACTION];",
    description: "Apre un blocco transazionale: tutte le operazioni successive saranno atomiche fino a COMMIT o ROLLBACK.",
    examples: {
      sqlite: "BEGIN;\nUPDATE products SET price = ROUND(price * 0.95, 2)\nWHERE category = 'Hardware' AND stock > 50;\nSELECT name, price FROM products WHERE category = 'Hardware' LIMIT 5;\nROLLBACK;",
      postgresql: "BEGIN;\nUPDATE products SET price = ROUND(price * 0.95, 2)\nWHERE category = 'Hardware' AND stock > 50;\nSELECT name, price FROM products WHERE category = 'Hardware' LIMIT 5;\nROLLBACK;",
      sqlserver: "BEGIN TRANSACTION;\nUPDATE products SET price = ROUND(price * 0.95, 2)\nWHERE category = 'Hardware' AND stock > 50;\nSELECT TOP 5 name, price FROM products WHERE category = 'Hardware';\nROLLBACK TRANSACTION;"
    },
    useCases: [
      "Raggruppare piu UPDATE/DELETE in un'operazione atomica.",
      "Testare modifiche con BEGIN + SELECT + ROLLBACK senza persistere.",
      "Implementare logica tutto-o-niente in flussi ETL."
    ],
    pitfalls: [
      "Transazione aperta senza COMMIT/ROLLBACK tiene lock attivi e blocca altri processi.",
      "In SQLite solo una transazione write alla volta e permessa (serialized)."
    ],
    dialectNotes: {
      sqlite: "SQLite usa BEGIN (o BEGIN DEFERRED | IMMEDIATE | EXCLUSIVE) per controllare il livello di lock.",
      postgresql: "PostgreSQL usa BEGIN o START TRANSACTION. Supporta SAVEPOINT per rollback parziale. Isolation level configurabile per transazione.",
      sqlserver: "SQL Server usa BEGIN TRANSACTION (o BEGIN TRAN). Supporta SAVE TRANSACTION per savepoint e @@TRANCOUNT per verificare nesting."
    }
  },
  {
    keyword: "COMMIT",
    category: "Transazioni",
    syntax: "COMMIT [TRANSACTION];",
    description: "Conferma permanentemente tutte le modifiche effettuate nella transazione corrente e rilascia i lock.",
    examples: {
      sqlite: "BEGIN;\nINSERT INTO customer_notes (customer_id, note_date, note_type, note_text, author_employee_id)\nVALUES (5, '2026-02-15', 'info', 'Account verified', 3);\nCOMMIT;",
      postgresql: "BEGIN;\nINSERT INTO customer_notes (customer_id, note_date, note_type, note_text, author_employee_id)\nVALUES (5, '2026-02-15', 'info', 'Account verified', 3);\nCOMMIT;",
      sqlserver: "BEGIN TRANSACTION;\nINSERT INTO customer_notes (customer_id, note_date, note_type, note_text, author_employee_id)\nVALUES (5, '2026-02-15', 'info', 'Account verified', 3);\nCOMMIT TRANSACTION;"
    },
    useCases: [
      "Finalizzare un batch di inserimenti dopo validazione.",
      "Confermare aggiornamenti dopo verifica con SELECT intermedio.",
      "Chiudere transazione dopo logica condizionale senza errori."
    ],
    pitfalls: [
      "COMMIT senza BEGIN e un no-op in autocommit mode — non genera errore ma non fa nulla.",
      "Dopo COMMIT i dati sono permanenti: non e possibile fare rollback."
    ],
    dialectNotes: {
      sqlite: "SQLite: COMMIT e sinonimo di END TRANSACTION. In autocommit mode, ogni statement e gia auto-committed.",
      postgresql: "PostgreSQL: COMMIT chiude la transazione. Se la transazione e in stato di errore, COMMIT equivale a ROLLBACK.",
      sqlserver: "SQL Server: COMMIT TRANSACTION (o COMMIT TRAN). Con transazioni nidificate, solo il COMMIT piu esterno persiste i dati."
    }
  },
  {
    keyword: "ROLLBACK",
    category: "Transazioni",
    syntax: "ROLLBACK [TRANSACTION] [TO SAVEPOINT nome];",
    description: "Annulla tutte le modifiche della transazione corrente e ripristina lo stato precedente al BEGIN.",
    examples: {
      sqlite: "BEGIN;\nDELETE FROM customer_notes WHERE note_type = 'obsolete';\n-- Verifica quante righe restano\nSELECT COUNT(*) FROM customer_notes;\nROLLBACK;\n-- Le note 'obsolete' sono ancora presenti",
      postgresql: "BEGIN;\nDELETE FROM customer_notes WHERE note_type = 'obsolete';\nSELECT COUNT(*) FROM customer_notes;\nROLLBACK;\n-- Le note 'obsolete' sono ancora presenti",
      sqlserver: "BEGIN TRANSACTION;\nDELETE FROM customer_notes WHERE note_type = 'obsolete';\nSELECT COUNT(*) FROM customer_notes;\nROLLBACK TRANSACTION;\n-- Le note 'obsolete' sono ancora presenti"
    },
    useCases: [
      "Annullare modifiche dopo aver rilevato un errore durante la transazione.",
      "Testing: verificare impatto di UPDATE/DELETE senza persistere.",
      "Rollback parziale a un SAVEPOINT per ripristinare solo parte delle operazioni."
    ],
    pitfalls: [
      "ROLLBACK senza BEGIN non ha effetto in autocommit mode.",
      "ROLLBACK TO SAVEPOINT non chiude la transazione — serve comunque COMMIT o ROLLBACK finale."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta ROLLBACK e ROLLBACK TO nome_savepoint. Le transazioni sono serializzate: una sola write transaction alla volta.",
      postgresql: "PostgreSQL supporta ROLLBACK e ROLLBACK TO SAVEPOINT. Una transazione in stato di errore richiede ROLLBACK prima di nuovi comandi.",
      sqlserver: "SQL Server: ROLLBACK TRANSACTION annulla tutto. ROLLBACK TRAN TO nome_savepoint annulla fino al savepoint."
    }
  },
  {
    keyword: "CREATE TABLE",
    category: "DDL",
    syntax: "CREATE TABLE nome_tabella (colonna tipo [vincoli], ...);",
    description: "Definisce una nuova tabella con struttura colonne, tipi e vincoli (PRIMARY KEY, NOT NULL, FOREIGN KEY, UNIQUE, CHECK).",
    examples: {
      sqlite: "CREATE TABLE audit_log (\n  id INTEGER PRIMARY KEY,\n  entity TEXT NOT NULL,\n  event_type TEXT NOT NULL CHECK(event_type IN ('INSERT','UPDATE','DELETE')),\n  payload TEXT,\n  created_at TEXT NOT NULL DEFAULT (datetime('now'))\n);",
      postgresql: "CREATE TABLE audit_log (\n  id BIGSERIAL PRIMARY KEY,\n  entity TEXT NOT NULL,\n  event_type TEXT NOT NULL CHECK(event_type IN ('INSERT','UPDATE','DELETE')),\n  payload JSONB,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);",
      sqlserver: "CREATE TABLE audit_log (\n  id BIGINT IDENTITY(1,1) PRIMARY KEY,\n  entity NVARCHAR(120) NOT NULL,\n  event_type NVARCHAR(20) NOT NULL CHECK(event_type IN ('INSERT','UPDATE','DELETE')),\n  payload NVARCHAR(MAX),\n  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()\n);"
    },
    useCases: [
      "Definire schema con vincoli di integrita referenziale.",
      "Creare tabelle di staging per caricamento dati.",
      "Impostare tabelle di audit/log con default automatici."
    ],
    pitfalls: [
      "CREATE TABLE senza IF NOT EXISTS fallisce se la tabella esiste gia.",
      "Tipi dati hanno nomi diversi tra dialetti (TEXT vs VARCHAR vs NVARCHAR).",
      "Foreign key in SQLite richiedono PRAGMA foreign_keys = ON per essere enforced."
    ],
    dialectNotes: {
      sqlite: "SQLite: tipi sono suggerimenti (affinity). INTEGER PRIMARY KEY diventa automaticamente ROWID. Supporta IF NOT EXISTS.",
      postgresql: "PostgreSQL: tipi rigorosi. SERIAL/BIGSERIAL per auto-increment. Supporta GENERATED ALWAYS AS IDENTITY (standard SQL).",
      sqlserver: "SQL Server: IDENTITY(1,1) per auto-increment. Tipi: INT, BIGINT, NVARCHAR(n), DATETIME2. Supporta computed columns."
    }
  },
  {
    keyword: "ALTER TABLE",
    category: "DDL",
    syntax: "ALTER TABLE nome_tabella operazione;",
    description: "Modifica la struttura di una tabella esistente: aggiungere colonne, rinominare, modificare vincoli.",
    examples: {
      sqlite: "ALTER TABLE customers ADD COLUMN churn_risk REAL;\nALTER TABLE customers RENAME COLUMN churn_risk TO churn_score;",
      postgresql: "ALTER TABLE customers ADD COLUMN churn_risk NUMERIC(5,2);\nALTER TABLE customers ALTER COLUMN churn_risk SET DEFAULT 0;\nALTER TABLE customers RENAME COLUMN churn_risk TO churn_score;",
      sqlserver: "ALTER TABLE customers ADD churn_risk DECIMAL(5,2);\nALTER TABLE customers ALTER COLUMN churn_risk DECIMAL(5,2) NOT NULL;\nEXEC sp_rename 'customers.churn_risk', 'churn_score', 'COLUMN';"
    },
    useCases: [
      "Aggiungere nuove colonne per feature evolutive.",
      "Rinominare colonne per allineamento naming convention.",
      "Aggiungere o rimuovere vincoli (CHECK, UNIQUE, FK)."
    ],
    pitfalls: [
      "SQLite ha ALTER TABLE limitato: non supporta DROP COLUMN (pre 3.35.0) ne ALTER COLUMN.",
      "ALTER TABLE su tabelle grandi puo richiedere lock esclusivo e bloccare le query concorrenti.",
      "In produzione, ALTER TABLE senza piano di migrazione puo rompere query esistenti."
    ],
    dialectNotes: {
      sqlite: "SQLite supporta ADD COLUMN e RENAME COLUMN. DROP COLUMN dalla 3.35.0. Non supporta ALTER COLUMN type.",
      postgresql: "PostgreSQL supporta ADD/DROP/ALTER COLUMN, ADD/DROP CONSTRAINT, RENAME. Molte operazioni sono non-blocking.",
      sqlserver: "SQL Server supporta ADD/ALTER/DROP COLUMN. Rinominare richiede sp_rename. Alcune operazioni richiedono schema lock."
    }
  },
  {
    keyword: "CREATE INDEX",
    category: "DDL",
    syntax: "CREATE [UNIQUE] INDEX nome_indice ON tabella (col1 [, col2 ...]);",
    description: "Crea una struttura di accesso che accelera le ricerche su colonne specifiche, riducendo le full table scan.",
    examples: {
      sqlite: "CREATE INDEX idx_orders_customer_date\nON orders (customer_id, order_date);",
      postgresql: "CREATE INDEX CONCURRENTLY idx_orders_customer_date\nON orders (customer_id, order_date);",
      sqlserver: "CREATE NONCLUSTERED INDEX idx_orders_customer_date\nON orders (customer_id, order_date)\nINCLUDE (total_amount);"
    },
    useCases: [
      "Accelerare JOIN su foreign key usate frequentemente.",
      "Velocizzare WHERE su colonne ad alta selettivita.",
      "Supportare ORDER BY su colonne di ordinamento comuni."
    ],
    pitfalls: [
      "Troppi indici rallentano INSERT/UPDATE/DELETE perche ogni indice va aggiornato.",
      "Indici su colonne con bassa cardinalita (es. boolean) sono poco efficaci.",
      "CREATE INDEX senza CONCURRENTLY (PostgreSQL) blocca la tabella durante la creazione."
    ],
    dialectNotes: {
      sqlite: "SQLite usa B-tree per gli indici. Non supporta INCLUDE columns. Supporta partial index con WHERE.",
      postgresql: "PostgreSQL supporta B-tree, Hash, GIN, GiST, BRIN. Supporta CONCURRENTLY per creazione non-blocking e INCLUDE.",
      sqlserver: "SQL Server supporta CLUSTERED e NONCLUSTERED index. INCLUDE per covering index. ONLINE = ON per creazione non-blocking."
    }
  },
  {
    keyword: "EXPLAIN",
    category: "Avanzato/SQLite",
    syntax: "EXPLAIN QUERY PLAN SELECT ...;",
    description: "Mostra il piano di esecuzione della query senza eseguirla, rivelando scansioni, indici usati e costi stimati.",
    examples: {
      sqlite: "EXPLAIN QUERY PLAN\nSELECT c.name, SUM(o.total_amount)\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE c.segment = 'Enterprise'\nGROUP BY c.id;",
      postgresql: "EXPLAIN ANALYZE\nSELECT c.name, SUM(o.total_amount)\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE c.segment = 'Enterprise'\nGROUP BY c.id, c.name;",
      sqlserver: "SET STATISTICS IO ON;\nSELECT c.name, SUM(o.total_amount)\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE c.segment = 'Enterprise'\nGROUP BY c.id, c.name;\nSET STATISTICS IO OFF;"
    },
    useCases: [
      "Identificare full table scan costose e decidere dove creare indici.",
      "Validare che un indice appena creato venga effettivamente utilizzato.",
      "Confrontare piani di esecuzione tra varianti di una stessa query."
    ],
    pitfalls: [
      "Il piano stimato puo differire dal runtime reale: usare EXPLAIN ANALYZE (PostgreSQL) per dati effettivi.",
      "Ottimizzare solo su dataset piccolo porta a conclusioni fuorvianti: testare su volumi realistici.",
      "Costi nel piano sono relativi al DBMS e non confrontabili tra motori diversi."
    ],
    dialectNotes: {
      sqlite: "SQLite: EXPLAIN QUERY PLAN mostra la strategia ad alto livello (SCAN, SEARCH, USE INDEX). EXPLAIN mostra i bytecode opcodes.",
      postgresql: "PostgreSQL: EXPLAIN mostra il piano stimato. EXPLAIN ANALYZE esegue la query e mostra tempi reali. EXPLAIN (BUFFERS, FORMAT YAML) per dettagli avanzati.",
      sqlserver: "SQL Server: SET SHOWPLAN_TEXT ON per piano testuale. SET STATISTICS IO ON per I/O effettivo. Actual Execution Plan in SSMS per vista grafica."
    }
  }
];

const kwDom = {};

document.addEventListener("DOMContentLoaded", () => {
  kwDom.search = document.getElementById("kwSearch");
  kwDom.category = document.getElementById("kwCategory");
  kwDom.dialect = document.getElementById("kwDialect");
  kwDom.count = document.getElementById("kwCount");
  kwDom.list = document.getElementById("kwList");
  kwDom.live = document.getElementById("kwLive");

  const categories = ["Tutte", ...new Set(KEYWORD_ENTRIES.map((e) => e.category))];
  kwDom.category.innerHTML = categories
    .map((c) => `<option value="${esc(c)}">${esc(c)}</option>`)
    .join("");

  kwDom.search.addEventListener("input", renderKwList);
  kwDom.category.addEventListener("change", renderKwList);
  kwDom.dialect.addEventListener("change", renderKwList);
  kwDom.list.addEventListener("click", handleActions);
  renderKwList();
  window.addEventListener("hashchange", focusAnchor);
});

function renderKwList() {
  const term = (kwDom.search.value || "").trim().toLowerCase();
  const cat = kwDom.category.value || "Tutte";
  const dialect = kwDom.dialect.value || "all";

  const filtered = KEYWORD_ENTRIES.filter((e) => {
    if (cat !== "Tutte" && e.category !== cat) return false;
    if (!term) return true;
    const blob = [
      e.keyword, e.description, e.syntax,
      ...(e.useCases || []), ...(e.pitfalls || []),
      e.examples.sqlite, e.examples.postgresql, e.examples.sqlserver
    ].join(" ").toLowerCase();
    return blob.includes(term);
  });

  kwDom.count.textContent = `${filtered.length} keyword`;

  if (!filtered.length) {
    kwDom.list.innerHTML = '<p class="info-block">Nessuna keyword trovata con i filtri correnti.</p>';
    announce("Nessuna keyword trovata.");
    return;
  }

  kwDom.list.innerHTML = filtered.map((e) => {
    const slug = slugify(e.keyword);
    const dialects = dialect === "all" ? ["sqlite", "postgresql", "sqlserver"] : [dialect];
    const snippets = dialects.map((d) => {
      const label = d === "sqlite" ? "SQLite" : d === "postgresql" ? "PostgreSQL" : "SQL Server";
      return `<div class="kw-snippet-block">
        <span class="kw-snippet-label">${esc(label)}</span>
        <pre class="example-line"><code>${esc(e.examples[d])}</code></pre>
        <div class="syntax-actions">
          <button class="btn btn-secondary btn-sm" type="button" data-copy="${encodeURIComponent(e.examples[d])}">Copia</button>
          <a class="btn btn-primary btn-sm" href="${buildPlaygroundLink(d, e.examples[d])}">Apri nel Playground</a>
        </div>
      </div>`;
    }).join("");

    const useCaseLines = (e.useCases || []).map((l) => `<li>${esc(l)}</li>`).join("");
    const pitfallLines = (e.pitfalls || []).map((l) => `<li>${esc(l)}</li>`).join("");

    const dialectNotes = dialects.map((d) => {
      if (!e.dialectNotes || !e.dialectNotes[d]) return "";
      const label = d === "sqlite" ? "SQLite" : d === "postgresql" ? "PostgreSQL" : "SQL Server";
      return `<p class="dialect-note"><strong>${esc(label)}:</strong> ${esc(e.dialectNotes[d])}</p>`;
    }).join("");

    return `
    <article class="keyword-card" id="${slug}" tabindex="-1">
      <div class="keyword-head">
        <h3><a href="#${slug}">${esc(e.keyword)}</a></h3>
        <span class="tag">${esc(e.category)}</span>
      </div>
      <p>${esc(e.description)}</p>
      <pre class="syntax-line">${esc(e.syntax)}</pre>
      <h4 class="keyword-subtitle">Esempi per dialetto</h4>
      ${snippets}
      <h4 class="keyword-subtitle">Casi d'uso</h4>
      <ul class="keyword-points">${useCaseLines}</ul>
      <h4 class="keyword-subtitle">Attenzione a</h4>
      <ul class="keyword-points">${pitfallLines}</ul>
      <h4 class="keyword-subtitle">Note di dialetto</h4>
      ${dialectNotes}
    </article>`;
  }).join("");

  announce(`${filtered.length} keyword mostrate.`);
  focusAnchor();
}

function handleActions(event) {
  const btn = event.target.closest("[data-copy]");
  if (!btn) return;
  const text = decodeURIComponent(btn.dataset.copy || "");
  navigator.clipboard.writeText(text).then(() => announce("Snippet copiato."));
}

function buildPlaygroundLink(dialect, snippet) {
  const params = new URLSearchParams({ dialect, q: snippet, autorun: "1" });
  return `playground.html?${params.toString()}`;
}

function focusAnchor() {
  const hash = window.location.hash.replace("#", "");
  if (!hash) return;
  const el = document.getElementById(hash);
  if (el) el.focus();
}

function slugify(v) {
  return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function announce(msg) {
  if (kwDom.live) kwDom.live.textContent = msg;
}

function esc(v) {
  return String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
}
