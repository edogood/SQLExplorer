CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS content.pages (
  id bigserial PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  "order" integer NOT NULL,
  is_published boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS content.lessons (
  id bigserial PRIMARY KEY,
  page_slug text NOT NULL,
  title text NOT NULL,
  body_md text NOT NULL,
  difficulty text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS content.keywords (
  id bigserial PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description_md text NOT NULL,
  examples_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  related_slugs text[] NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS content.exercises (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  prompt_md text NOT NULL,
  starter_sql text NOT NULL,
  expected_json jsonb NOT NULL,
  validator_type text NOT NULL,
  difficulty text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS content.guided_steps (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  description_md text NOT NULL,
  page_slug text NOT NULL,
  "order" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS content.trainer_items (
  id bigserial PRIMARY KEY,
  question_md text NOT NULL,
  answer_md text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  difficulty text NOT NULL
);

CREATE TABLE IF NOT EXISTS app.progress (
  user_fingerprint text PRIMARY KEY,
  completed_exercises integer[] NOT NULL DEFAULT '{}',
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
