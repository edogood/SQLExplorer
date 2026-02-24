export function stripSqlComments(sql: string): string {
  let out = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        out += ch;
      }
      i += 1;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (!inSingle && !inDouble) {
      if (ch === '-' && next === '-') {
        inLineComment = true;
        i += 2;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i += 2;
        continue;
      }
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      out += ch;
      i += 1;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

export function normalizeSql(sql: string): string {
  return stripSqlComments(sql).replace(/\s+/g, ' ').trim();
}

export function hasMultipleStatements(sql: string): boolean {
  const stripped = stripSqlComments(sql);
  let inSingle = false;
  let inDouble = false;
  let inDollar = false;
  let dollarTag = '';

  for (let i = 0; i < stripped.length; i += 1) {
    const ch = stripped[i];

    if (!inSingle && !inDouble) {
      if (!inDollar && ch === '$') {
        const rest = stripped.slice(i);
        const m = rest.match(/^\$[a-zA-Z0-9_]*\$/);
        if (m) {
          inDollar = true;
          dollarTag = m[0];
          i += dollarTag.length - 1;
          continue;
        }
      } else if (inDollar) {
        if (stripped.startsWith(dollarTag, i)) {
          inDollar = false;
          i += dollarTag.length - 1;
          continue;
        }
      }
    }

    if (inDollar) continue;

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (ch === ';' && !inSingle && !inDouble) {
      if (stripped.slice(i + 1).trim().length > 0) {
        return true;
      }
    }
  }

  return false;
}
