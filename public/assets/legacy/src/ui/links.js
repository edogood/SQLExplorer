export function buildPlaygroundUrl({ dialect = 'sqlite', query = '', autorun = false, sqliteSafe = false } = {}) {
  const params = new URLSearchParams();
  const effectiveDialect = dialect || 'sqlite';
  params.set('dialect', effectiveDialect);
  if (query) params.set('q', query);
  const allowAutorun = autorun && (effectiveDialect === 'sqlite' || sqliteSafe);
  if (allowAutorun) params.set('autorun', '1');
  const queryString = params.toString();
  return queryString ? `playground.html?${queryString}` : 'playground.html';
}

export function parsePlaygroundParams(search = window.location.search) {
  const qs = new URLSearchParams(search || '');
  const dialect = qs.get('dialect') || 'sqlite';
  const autorunRequested = qs.get('autorun') === '1' || qs.get('autorun') === 'true';
  return {
    dialect,
    query: qs.get('q') || '',
    autorun: autorunRequested,
    autorunRequested
  };
}
