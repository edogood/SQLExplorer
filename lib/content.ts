import { getPool } from './db';

export type PageRow = { slug: string; title: string; description: string };

export async function fetchPages() {
  const res = await getPool().query<PageRow>(
    `SELECT slug, title, description FROM content.pages WHERE is_published = true ORDER BY "order"`
  );
  return res.rows;
}

export async function fetchLessons(pageSlug: string) {
  const res = await getPool().query(
    `SELECT id, title, body_md, difficulty, tags FROM content.lessons WHERE page_slug = $1 ORDER BY id`,
    [pageSlug]
  );
  return res.rows;
}

export async function fetchKeywords() {
  const res = await getPool().query(
    `SELECT slug, name, category, description_md FROM content.keywords ORDER BY name`
  );
  return res.rows;
}

export async function fetchKeyword(slug: string) {
  const res = await getPool().query(
    `SELECT slug, name, category, description_md, examples_json, related_slugs FROM content.keywords WHERE slug = $1`,
    [slug]
  );
  return res.rows[0] ?? null;
}

export async function fetchExercises() {
  const res = await getPool().query(
    `SELECT id, title, prompt_md, difficulty, tags FROM content.exercises ORDER BY id`
  );
  return res.rows;
}

export async function fetchExercise(id: number) {
  const res = await getPool().query(
    `SELECT id, title, prompt_md, starter_sql, expected_json, validator_type, difficulty, tags FROM content.exercises WHERE id = $1`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function fetchGuided() {
  const res = await getPool().query(
    `SELECT id, title, description_md, page_slug, "order" FROM content.guided_steps ORDER BY "order"`
  );
  return res.rows;
}

export async function fetchTrainerItems() {
  const res = await getPool().query(
    `SELECT id, question_md, answer_md, tags, difficulty FROM content.trainer_items ORDER BY id`
  );
  return res.rows;
}
