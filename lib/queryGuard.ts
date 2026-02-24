import { hasMultipleStatements, normalizeSql } from './sqlUtils';

const FORBIDDEN_PATTERNS = [
  /\bdrop\s+database\b/i,
  /\balter\s+system\b/i,
  /\bcreate\s+role\b/i,
  /\balter\s+role\b/i,
  /\balter\s+user\b/i,
  /\bgrant\b/i,
  /\brevoke\b/i,
  /(^|\s)copy\s+/i,
  /\\copy/i,
  /\bvacuum\s+full\b/i,
  /\bcluster\b/i,
  /\bpg_sleep\b/i,
  /\bdblink\b/i,
  /\bcreate\s+extension\b/i,
  /\bdo\s+\$\$/i,
  /\blisten\b/i,
  /\bnotify\b/i
];

const UNSAFE_WRAP_PATTERNS = [/\bfor\s+update\b/i, /\bcopy\b/i];

function hasForbiddenOps(normalizedSql: string): boolean {
  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(normalizedSql));
}

export type GuardedSql = {
  sql: string;
  normalizedSql: string;
};

export function guardAndPrepareSql(rawSql: string, maxRows: number): GuardedSql {
  if (!rawSql || !rawSql.trim()) {
    throw new Error('SQL is required.');
  }

  if (hasMultipleStatements(rawSql)) {
    throw new Error('Multiple statements are not allowed.');
  }

  const normalizedSql = normalizeSql(rawSql);

  if (hasForbiddenOps(normalizedSql)) {
    throw new Error('Query blocked by safety policy.');
  }

  const isSelectLike = /^(select|with)\b/i.test(normalizedSql);
  const hasLimit = /\blimit\s+\d+\b/i.test(normalizedSql);

  if (!isSelectLike) {
    return { sql: rawSql.trim().replace(/;\s*$/, ''), normalizedSql };
  }

  if (hasLimit) {
    return { sql: rawSql.trim().replace(/;\s*$/, ''), normalizedSql };
  }

  if (UNSAFE_WRAP_PATTERNS.some((pattern) => pattern.test(normalizedSql))) {
    throw new Error('SELECT/CTE query requires explicit LIMIT for this operation.');
  }

  return {
    sql: `SELECT * FROM (${rawSql.trim().replace(/;\s*$/, '')}) AS q LIMIT ${maxRows}`,
    normalizedSql
  };
}
