CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.sessions (
  session_id text PRIMARY KEY,
  schema_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON app.sessions (expires_at);

CREATE OR REPLACE FUNCTION app.drop_schema(schema_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF schema_name !~ '^session_[a-f0-9]{32}$' THEN
    RAISE EXCEPTION 'invalid schema name';
  END IF;
  EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name);
END;
$$;
