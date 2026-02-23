export const DIALECTS = {
  sqlite: 'SQLite',
  postgresql: 'PostgreSQL',
  sqlserver: 'SQL Server'
};

export const DIALECT_DEFAULT_QUERIES = {
  sqlite: `WITH kpi AS (
  SELECT c.segment,
         o.currency,
         ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount_pct)), 2) AS gross_revenue,
         ROUND(SUM((oi.unit_price - p.cost_price) * oi.quantity), 2) AS gross_margin
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
  WHERE o.status IN ('PAID', 'SHIPPED', 'REFUNDED')
  GROUP BY c.segment, o.currency
)
SELECT segment,
       currency,
       CAST(gross_revenue AS INTEGER) AS revenue_int,
       CONVERT('TEXT', gross_margin) AS margin_text,
       gross_revenue,
       gross_margin
FROM kpi
ORDER BY gross_revenue DESC
LIMIT 25;`,
  postgresql: `WITH kpi AS (
  SELECT c.segment,
         o.currency,
         ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount_pct)), 2) AS gross_revenue,
         ROUND(SUM((oi.unit_price - p.cost_price) * oi.quantity), 2) AS gross_margin
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
  WHERE o.status IN ('PAID', 'SHIPPED', 'REFUNDED')
  GROUP BY c.segment, o.currency
)
SELECT segment,
       currency,
       CAST(gross_revenue AS INTEGER) AS revenue_int,
       gross_margin::text AS margin_text,
       gross_revenue,
       gross_margin
FROM kpi
ORDER BY gross_revenue DESC
LIMIT 25;`,
  sqlserver: `WITH kpi AS (
  SELECT c.segment,
         o.currency,
         ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount_pct)), 2) AS gross_revenue,
         ROUND(SUM((oi.unit_price - p.cost_price) * oi.quantity), 2) AS gross_margin
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
  WHERE o.status IN ('PAID', 'SHIPPED', 'REFUNDED')
  GROUP BY c.segment, o.currency
)
SELECT TOP 25
       segment,
       currency,
       CAST(gross_revenue AS INT) AS revenue_int,
       CONVERT(VARCHAR(50), gross_margin) AS margin_text,
       gross_revenue,
       gross_margin
FROM kpi
ORDER BY gross_revenue DESC;`
};

export const DEFAULT_QUERY = DIALECT_DEFAULT_QUERIES.sqlite;
