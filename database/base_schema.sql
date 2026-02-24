CREATE TABLE IF NOT EXISTS __SCHEMA__.customers (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  segment text NOT NULL,
  country text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.orders (
  id bigserial PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES __SCHEMA__.customers(id),
  total_amount numeric(12,2) NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO __SCHEMA__.customers(name, segment, country)
VALUES
('Acme Corp', 'Enterprise', 'IT'),
('Nordwind', 'SMB', 'DE'),
('DataNova', 'Enterprise', 'US')
ON CONFLICT DO NOTHING;

INSERT INTO __SCHEMA__.orders(customer_id, total_amount, status)
VALUES
(1, 1200.00, 'PAID'),
(2, 150.50, 'PENDING'),
(3, 830.00, 'SHIPPED')
ON CONFLICT DO NOTHING;
