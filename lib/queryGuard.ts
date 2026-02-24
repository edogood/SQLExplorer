const FORBIDDEN_PATTERNS = [
  /\bdrop\s+database\b/i,
  /\balter\s+system\b/i,
  /\bcreate\s+role\b/i,
  /\bgrant\b/i,
  /\brevoke\b/i,
  /\bcopy\b/i,
  /\\copy/i,
  /\bvacuum\s+full\b/i,
  /\bcluster\b/i,
  /\bpg_sleep\b/i,
  /\bdblink\b/i,
  /\bcreate\s+extension\b/i,
  /\balter\s+extension\b/i,
  /\bdrop\s+extension\b/i
];

const DISALLOWED_WRAP = [/\bfor\s+update\b/i, /\bcopy\b/i];

function hasSqlComments(sql: string) {
  return /--|\/\*/.test(sql);
}

export function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, ' ').trim();
}

export function enforceSingleStatement(sql: string) {
  let inSingle = false;
  let inDouble = false;
  let prev = '';
  for (const ch of sql) {
    if (ch === "'" && !inDouble && prev !== '\\') inSingle = !inSingle;
    if (ch === '"' && !inSingle && prev !== '\\') inDouble = !inDouble;
    if (ch === ';' && !inSingle && !inDouble) {
      throw new Error('Multiple statements are not allowed.');
    }
    prev = ch;
  }
}

export function guardAndPrepareSql(rawSql: string, maxRows: number) {
  if (!rawSql || !rawSql.trim()) throw new Error('SQL is required.');
  if (hasSqlComments(rawSql)) throw new Error('Comments are not allowed in SQL input.');
  enforceSingleStatement(rawSql);

  const normalized = normalizeSql(rawSql);
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(normalized)) throw new Error('Query blocked by safety policy.');
  }

  const isSelectLike = /^(select|with)\b/i.test(normalized);
  const hasLimit = /\blimit\s+\d+\b/i.test(normalized);
  if (isSelectLike && !hasLimit) {
    for (const pattern of DISALLOWED_WRAP) {
      if (pattern.test(normalized)) throw new Error('SELECT wrapping with LIMIT is unsafe for this query.');
    }
    return `SELECT * FROM (${rawSql}) AS q LIMIT ${maxRows}`;
  }
  return rawSql;
}
