import { normalizeScalar, sortRows, stableStringify } from './utils.js';

export function normalizeRows(rows, { tolerance = 0 } = {}) {
  return (rows || []).map((row) => {
    const entries = Object.entries(row || {}).map(([key, value]) => [key.toLowerCase(), normalizeScalar(value, tolerance)]);
    return Object.fromEntries(entries);
  });
}

function compareValue(actual, expected, tolerance) {
  if (actual === expected) return true;
  if (typeof actual === 'number' && typeof expected === 'number') {
    return Math.abs(actual - expected) <= tolerance;
  }
  return false;
}

export function compareRowsDetailed(actualRows, expectedRows, options = {}) {
  const { ignoreOrder = true, tolerance = 0.0001 } = options;
  const actualNorm = normalizeRows(actualRows, { tolerance });
  const expectedNorm = normalizeRows(expectedRows, { tolerance });
  const aRows = ignoreOrder ? sortRows(actualNorm) : actualNorm;
  const eRows = ignoreOrder ? sortRows(expectedNorm) : expectedNorm;

  const mismatches = [];
  if (aRows.length !== eRows.length) {
    mismatches.push(`Row count mismatch: expected ${eRows.length}, got ${aRows.length}`);
  }

  const len = Math.min(aRows.length, eRows.length);
  for (let i = 0; i < len; i += 1) {
    const actual = aRows[i];
    const expected = eRows[i];
    const keys = Array.from(new Set([...Object.keys(expected), ...Object.keys(actual)])).sort();
    const diff = [];
    keys.forEach((key) => {
      if (!compareValue(actual[key], expected[key], tolerance)) {
        diff.push(`${key}: expected=${JSON.stringify(expected[key])} actual=${JSON.stringify(actual[key])}`);
      }
    });
    if (diff.length) {
      mismatches.push(`Row ${i + 1} differs -> ${diff.join(' | ')}`);
    }
  }

  return {
    ok: mismatches.length === 0,
    summary: mismatches.length ? 'Verification failed' : 'Verification passed',
    diff: mismatches,
    normalized: {
      actual: stableStringify(aRows),
      expected: stableStringify(eRows)
    }
  };
}
