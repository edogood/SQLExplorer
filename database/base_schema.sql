CREATE TABLE IF NOT EXISTS __SCHEMA__.customers (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  segment text NOT NULL,
  country text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.products (
  id bigserial PRIMARY KEY,
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.orders (
  id bigserial PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES __SCHEMA__.customers(id),
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.order_items (
  id bigserial PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES __SCHEMA__.orders(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES __SCHEMA__.products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0)
);

INSERT INTO __SCHEMA__.customers (name, segment, country)
VALUES
  ('Acme Corp', 'Enterprise', 'IT'),
  ('Northwind GmbH', 'SMB', 'DE'),
  ('DataNova Inc', 'Enterprise', 'US'),
  ('Blue Ocean LLC', 'Startup', 'UK');

INSERT INTO __SCHEMA__.products (sku, name, category, unit_price)
VALUES
  ('DB-100', 'Database Hosting', 'Services', 129.00),
  ('BI-220', 'Analytics License', 'Software', 399.00),
  ('TR-320', 'Training Pack', 'Education', 89.00),
  ('SU-090', 'Premium Support', 'Services', 199.00);

INSERT INTO __SCHEMA__.orders (customer_id, status, created_at)
VALUES
  (1, 'PAID', now() - interval '3 days'),
  (2, 'PENDING', now() - interval '2 days'),
  (3, 'PAID', now() - interval '1 day'),
  (1, 'SHIPPED', now() - interval '12 hours');

INSERT INTO __SCHEMA__.order_items (order_id, product_id, quantity, unit_price)
VALUES
  (1, 1, 3, 129.00),
  (1, 4, 1, 199.00),
  (2, 3, 2, 89.00),
  (3, 2, 1, 399.00),
  (4, 1, 1, 129.00),
  (4, 2, 1, 399.00);
