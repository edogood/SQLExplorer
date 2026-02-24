import { KEYWORD_ENTRIES } from './src/data/keyword-entries.js';

function toDialectMap(entry, field) {
  const fallback = entry[field] || entry.examples?.sqlite || '';
  return {
    sqlite: entry[field]?.sqlite || entry.examples?.sqlite || fallback,
    postgresql: entry[field]?.postgresql || entry.examples?.postgresql || fallback,
    sqlserver: entry[field]?.sqlserver || entry.examples?.sqlserver || fallback
  };
}

export const KEYWORD_DATA = KEYWORD_ENTRIES.map((entry) => ({
  ...entry,
  syntaxByDialect: toDialectMap(entry, 'syntaxByDialect'),
  argumentsByDialect: toDialectMap(entry, 'argumentsByDialect'),
  notesByDialect: entry.dialectNotes || {
    sqlite: 'Eseguito su SQLite (engine browser).',
    postgresql: 'Verificare varianti PostgreSQL.',
    sqlserver: 'Verificare varianti SQL Server.'
  },
  realExampleByDialect: entry.examples,
  engineExample: entry.examples?.sqlite || ''
}));
