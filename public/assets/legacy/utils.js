export function normalizeScalar(value, tolerance = 0) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (Number.isFinite(num)) {
    return tolerance > 0 ? Number(num.toFixed(8)) : Number(num.toFixed(8));
  }
  return String(value).trim().toLowerCase();
}

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sortRows(rows) {
  return rows.slice().sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));
}
