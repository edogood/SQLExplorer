export function buildPlaygroundUrl({ dialect = 'sqlite', query = '', autorun = false } = {}) {
  const params = new URLSearchParams();
  if (dialect) params.set('dialect', dialect);
  if (query) params.set('q', query);
  if (autorun) params.set('autorun', '1');
  const queryString = params.toString();
  return queryString ? `playground.html?${queryString}` : 'playground.html';
}

export function parsePlaygroundParams(search = window.location.search) {
  const qs = new URLSearchParams(search || '');
  const dialect = qs.get('dialect') || 'sqlite';
  return {
    dialect,
    query: qs.get('q') || '',
    autorun: qs.get('autorun') === '1' || qs.get('autorun') === 'true'
  };
}
