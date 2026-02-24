import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

async function extractTitles() {
  const files = ['syntax.html', 'guided.html', 'trainer.html', 'exercises.html'];
  const out = [];
  for (const file of files) {
    const html = await fs.readFile(path.join(process.cwd(), file), 'utf8');
    const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '') ?? file;
    out.push({ slug: file.replace('.html', ''), title: h1, body: `Contenuto migrato da ${file}` });
  }
  return out;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query(await fs.readFile('database/migrations/001_content.sql', 'utf8'));
  await client.query(await fs.readFile('database/seed/content.sql', 'utf8'));
  const lessons = await extractTitles();
  for (const l of lessons) {
    await client.query(
      `INSERT INTO content.lessons(page_slug,title,body_md,difficulty,tags) VALUES($1,$2,$3,'easy',ARRAY['migrated'])`,
      [l.slug, l.title, l.body]
    );
  }
} finally {
  client.release();
  await pool.end();
}
