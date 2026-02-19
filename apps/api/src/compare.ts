export type CompareMode = "multiset" | "ordered";

export function normalizeRows(rows: unknown[][]): unknown[][] {
  return rows.map((r) => r.map((v) => (typeof v === "number" && !Number.isInteger(v) ? Number(v.toFixed(8)) : v)));
}

export function compareRows(actual: unknown[][], expected: unknown[][], mode: CompareMode) {
  const a = normalizeRows(actual);
  const e = normalizeRows(expected);
  const serialize = (rows: unknown[][]) => rows.map((x) => JSON.stringify(x));
  if (mode === "ordered") {
    return JSON.stringify(a) === JSON.stringify(e);
  }
  const sa = serialize(a).sort();
  const se = serialize(e).sort();
  return JSON.stringify(sa) === JSON.stringify(se);
}
