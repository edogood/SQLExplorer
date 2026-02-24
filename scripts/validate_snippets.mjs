import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { createDemoDb } from '../src/core/engine.js';
import { KEYWORD_ENTRIES } from '../src/data/keyword-entries.js';
import { SYNTAX_TOPICS } from '../src/data/syntax-topics.js';
import { GUIDED_STEPS } from '../src/data/guided-data.js';
import { TRAINER_CHALLENGES } from '../src/data/trainer-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const wasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

async function loadSql() {
  return initSqlJs({ locateFile: () => wasmPath });
}

function pushSnippet(target, label, sql) {
  if (!sql || !String(sql).trim()) return;
  target.push({ label, sql: String(sql) });
}

async function main() {
  const SQL = await loadSql();
  const snippets = [];

  KEYWORD_ENTRIES.forEach((entry) => pushSnippet(snippets, `keyword:${entry.keyword}`, entry.examples?.sqlite || entry.engineExample));
  SYNTAX_TOPICS.forEach((topic) => pushSnippet(snippets, `syntax:${topic.title}`, topic.snippets?.sqlite));
  GUIDED_STEPS.forEach((step) => pushSnippet(snippets, `guided:${step.id || step.title}`, step.starter?.sqlite));
  TRAINER_CHALLENGES.forEach((challenge) => pushSnippet(snippets, `trainer:${challenge.id || challenge.name}`, challenge.query));

  const failures = [];
  snippets.forEach(({ label, sql }) => {
    const db = createDemoDb(SQL);
    try {
      db.exec(sql);
    } catch (err) {
      failures.push({ label, error: err.message || String(err) });
    } finally {
      db.close();
    }
  });

  if (failures.length) {
    console.error('Snippet validation failed:');
    failures.forEach((f) => {
      console.error(`- ${f.label}: ${f.error}`);
    });
    process.exitCode = 1;
  } else {
    console.log(`Validated ${snippets.length} SQLite snippets successfully.`);
  }
}

main().catch((err) => {
  console.error('Unexpected error during snippet validation:', err);
  process.exit(1);
});
