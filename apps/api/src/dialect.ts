import type { Dialect } from "@sql-explorer/shared";

export function translateSql(sql: string, from: Dialect, to: Dialect): { sql: string; warnings: string[] } {
  if (from === to) return { sql, warnings: [] };
  let out = sql;
  const warnings: string[] = [];

  if (to === "sqlserver") out = out.replace(/\blimit\s+(\d+)/i, "TOP $1");
  if (to === "oracle") {
    out = out.replace(/\blimit\s+(\d+)/i, "FETCH FIRST $1 ROWS ONLY");
    warnings.push("Oracle may require FROM dual in scalar selects.");
  }
  if (to === "postgres") out = out.replace(/\btop\s+(\d+)/i, "LIMIT $1");
  if (to === "mysql") out = out.replace(/\bdate_trunc\(([^)]+)\)/gi, "DATE_FORMAT($1, '%Y-%m-01')");

  warnings.push("Best-effort translation; verify semantic differences for JSON and upsert clauses.");
  return { sql: out, warnings };
}
