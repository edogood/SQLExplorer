export const GUIDED_STEPS = [
  {
    id: 's1',
    title: 'Filtro base clienti',
    goal: 'Trova i clienti Enterprise ordinati per credit_limit decrescente.',
    hint: 'Usa WHERE sul segmento, ORDER BY e LIMIT/TOP.',
    topics: ['SELECT', 'WHERE', 'ORDER BY', 'LIMIT/TOP'],
    starter: {
      sqlite: "SELECT id, name, segment, credit_limit\nFROM customers\n/* TODO: filtra segmento Enterprise */\nORDER BY credit_limit DESC\nLIMIT 20;",
      postgresql: "SELECT id, name, segment, credit_limit\nFROM customers\n/* TODO: filtra segmento Enterprise */\nORDER BY credit_limit DESC\nLIMIT 20;",
      sqlserver: "SELECT TOP 20 id, name, segment, credit_limit\nFROM customers\n/* TODO: filtra segmento Enterprise */\nORDER BY credit_limit DESC;"
    },
    solution: {
      sqlite: "SELECT id, name, segment, credit_limit\nFROM customers\nWHERE segment = 'Enterprise'\nORDER BY credit_limit DESC\nLIMIT 20;",
      postgresql: "SELECT id, name, segment, credit_limit\nFROM customers\nWHERE segment = 'Enterprise'\nORDER BY credit_limit DESC\nLIMIT 20;",
      sqlserver: "SELECT TOP 20 id, name, segment, credit_limit\nFROM customers\nWHERE segment = 'Enterprise'\nORDER BY credit_limit DESC;"
    },
    requiredTokens: ['SELECT', 'WHERE', 'ORDER BY', 'ENTERPRISE']
  },
  {
    id: 's2',
    title: 'Join + aggregazione revenue',
    goal: 'Calcola il revenue per segmento e valuta media ordine.',
    hint: 'Join customers-orders, poi GROUP BY segment con SUM/AVG.',
    topics: ['JOIN', 'GROUP BY', 'SUM', 'AVG'],
    starter: {
      sqlite: 'SELECT c.segment,\n       ROUND(SUM(o.total_amount), 2) AS revenue,\n       ROUND(AVG(o.total_amount), 2) AS avg_order\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.status IN (\'PAID\',\'SHIPPED\',\'REFUNDED\')\nGROUP BY c.segment\nORDER BY revenue DESC;',
      postgresql: 'SELECT c.segment,\n       ROUND(SUM(o.total_amount), 2) AS revenue,\n       ROUND(AVG(o.total_amount), 2) AS avg_order\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.status IN (\'PAID\',\'SHIPPED\',\'REFUNDED\')\nGROUP BY c.segment\nORDER BY revenue DESC;',
      sqlserver: 'SELECT c.segment,\n       ROUND(SUM(o.total_amount), 2) AS revenue,\n       ROUND(AVG(o.total_amount), 2) AS avg_order\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.status IN (\'PAID\',\'SHIPPED\',\'REFUNDED\')\nGROUP BY c.segment\nORDER BY revenue DESC;'
    },
    solution: {},
    requiredTokens: ['JOIN', 'GROUP BY', 'SUM', 'AVG']
  },
  {
    id: 's3',
    title: 'CTE e trend mensile',
    goal: 'Costruisci trend mensile e delta col mese precedente.',
    hint: 'CTE monthly + LAG OVER (ORDER BY mese).',
    topics: ['WITH', 'LAG', 'OVER', 'ORDER BY'],
    starter: {
      sqlite: "WITH monthly AS (\n  SELECT substr(order_date, 1, 7) AS mese,\n         ROUND(SUM(total_amount), 2) AS totale\n  FROM orders\n  WHERE status IN ('PAID','SHIPPED','REFUNDED')\n  GROUP BY substr(order_date, 1, 7)\n)\nSELECT mese,\n       totale,\n       ROUND(totale - LAG(totale) OVER (ORDER BY mese), 2) AS delta\nFROM monthly\nORDER BY mese;",
      postgresql: "WITH monthly AS (\n  SELECT to_char(CAST(order_date AS date), 'YYYY-MM') AS mese,\n         ROUND(SUM(total_amount), 2) AS totale\n  FROM orders\n  WHERE status IN ('PAID','SHIPPED','REFUNDED')\n  GROUP BY to_char(CAST(order_date AS date), 'YYYY-MM')\n)\nSELECT mese,\n       totale,\n       ROUND(totale - LAG(totale) OVER (ORDER BY mese), 2) AS delta\nFROM monthly\nORDER BY mese;",
      sqlserver: "WITH monthly AS (\n  SELECT LEFT(order_date, 7) AS mese,\n         ROUND(SUM(total_amount), 2) AS totale\n  FROM orders\n  WHERE status IN ('PAID','SHIPPED','REFUNDED')\n  GROUP BY LEFT(order_date, 7)\n)\nSELECT mese,\n       totale,\n       ROUND(totale - LAG(totale) OVER (ORDER BY mese), 2) AS delta\nFROM monthly\nORDER BY mese;"
    },
    solution: {},
    requiredTokens: ['WITH', 'LAG', 'OVER']
  },
  {
    id: 's4',
    title: 'Cast e Convert',
    goal: 'Mostra totale ordine come numero intero e come testo nel dialetto attivo.',
    hint: 'Usa CAST sempre; CONVERT e TRY_CONVERT sono differenze tipiche SQL Server.',
    topics: ['CAST', 'CONVERT', 'TRY_CONVERT'],
    starter: {
      sqlite: "SELECT o.id,\n       CAST(o.total_amount AS INTEGER) AS total_int,\n       CONVERT('TEXT', o.total_amount) AS total_text,\n       TRY_CONVERT('REAL', o.total_amount) AS total_real\nFROM orders o\nORDER BY o.total_amount DESC\nLIMIT 20;",
      postgresql: "SELECT o.id,\n       CAST(o.total_amount AS INTEGER) AS total_int,\n       o.total_amount::text AS total_text,\n       CAST(o.total_amount AS NUMERIC) AS total_real\nFROM orders o\nORDER BY o.total_amount DESC\nLIMIT 20;",
      sqlserver: "SELECT TOP 20 o.id,\n       CAST(o.total_amount AS INT) AS total_int,\n       CONVERT(VARCHAR(80), o.total_amount) AS total_text,\n       TRY_CONVERT(FLOAT, o.total_amount) AS total_real\nFROM orders o\nORDER BY o.total_amount DESC;"
    },
    solution: {},
    requiredTokensByDialect: {
      sqlite: ['CAST', 'CONVERT', 'TRY_CONVERT'],
      postgresql: ['CAST', '::TEXT'],
      sqlserver: ['CAST', 'CONVERT', 'TRY_CONVERT']
    }
  },
  {
    id: 's5',
    title: 'Transazione con rollback',
    goal: 'Simula aumento prezzi software e annulla tutto con ROLLBACK.',
    hint: 'BEGIN ... UPDATE ... SELECT di controllo ... ROLLBACK.',
    topics: ['BEGIN', 'UPDATE', 'ROLLBACK'],
    starter: {
      sqlite: "BEGIN;\nUPDATE products\nSET price = ROUND(price * 1.02, 2)\nWHERE category = 'Software';\nSELECT category, ROUND(AVG(price), 2) AS avg_price\nFROM products\nGROUP BY category;\nROLLBACK;",
      postgresql: "BEGIN;\nUPDATE products\nSET price = ROUND(price * 1.02, 2)\nWHERE category = 'Software';\nSELECT category, ROUND(AVG(price), 2) AS avg_price\nFROM products\nGROUP BY category;\nROLLBACK;",
      sqlserver: "BEGIN TRANSACTION;\nUPDATE products\nSET price = ROUND(price * 1.02, 2)\nWHERE category = 'Software';\nSELECT category, ROUND(AVG(price), 2) AS avg_price\nFROM products\nGROUP BY category;\nROLLBACK TRANSACTION;"
    },
    solution: {},
    requiredTokensByDialect: {
      sqlite: ['BEGIN', 'UPDATE', 'ROLLBACK'],
      postgresql: ['BEGIN', 'UPDATE', 'ROLLBACK'],
      sqlserver: ['BEGIN', 'UPDATE', 'ROLLBACK']
    }
  }
];
