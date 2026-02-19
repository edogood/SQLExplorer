const FORBIDDEN = [
  /\bcopy\b/i,
  /\bcreate\s+extension\b/i,
  /\balter\s+system\b/i,
  /\bforeign\s+data\s+wrapper\b/i,
  /\binformation_schema\b/i,
  /\bpg_sleep\b/i,
  /\bbenchmark\s*\(/i,
  /\bload_file\s*\(/i
];

export function validateSql(sql: string): { ok: boolean; reason?: string } {
  for (const pattern of FORBIDDEN) {
    if (pattern.test(sql)) return { ok: false, reason: `Forbidden pattern: ${pattern.source}` };
  }
  return { ok: true };
}

export function enforceResultLimits(rows: unknown[][], maxRows = 200, maxBytes = 1_000_000) {
  const limited = rows.slice(0, maxRows);
  const bytes = Buffer.byteLength(JSON.stringify(limited), "utf8");
  if (bytes > maxBytes) {
    throw new Error("Result size exceeds limit");
  }
  return limited;
}
