import { createEngine } from '../core/engine.js';
import { parsePlaygroundParams } from '../ui/links.js';
import { escapeHtml, renderTable } from '../ui/dom.js';
import { DEFAULT_QUERY, DIALECT_DEFAULT_QUERIES, DIALECTS } from '../data/dialects.js';
import { showToast } from '../ui/toast.js';

const dom = {};
let engine = null;

function setStatus(message) {
  if (dom.status) dom.status.textContent = message;
}

async function runQuery() {
  if (!engine || !dom.editor || !dom.result) return;
  const sql = dom.editor.value.trim();
  if (!sql) {
    setStatus('Nessuna query da eseguire');
    return;
  }
  try {
    const { result } = await engine.execute(sql);
    const first = result[0];
    const rowset = first ? { columns: first.columns, rows: first.values } : { columns: [], rows: [] };
    renderTable(dom.result, rowset);
    setStatus('Query eseguita');
    if (dom.execSql) dom.execSql.textContent = sql;
  } catch (err) {
    dom.result.innerHTML = `<pre class="error-block">${escapeHtml(err.message || String(err))}</pre>`;
    setStatus('Errore durante esecuzione');
  }
}

async function resetDemo() {
  if (!engine) return;
  await engine.resetDemo();
  setStatus('Database demo ripristinato');
  if (dom.editor && dom.dialect) {
    const q = DIALECT_DEFAULT_QUERIES[dom.dialect.value] || DEFAULT_QUERY;
    dom.editor.value = q;
  }
  dom.result.innerHTML = '<p class="placeholder">Database reimpostato.</p>';
}

function wireControls(params) {
  if (dom.runBtn) dom.runBtn.addEventListener('click', runQuery);
  if (dom.resetBtn) dom.resetBtn.addEventListener('click', resetDemo);
  if (dom.dialect) {
    dom.dialect.addEventListener('change', () => {
      const q = DIALECT_DEFAULT_QUERIES[dom.dialect.value] || DEFAULT_QUERY;
      if (!params.query) dom.editor.value = q;
      if (dom.dialectBadge) dom.dialectBadge.textContent = `Dialetto esempi: ${DIALECTS[dom.dialect.value] || 'SQLite'}`;
    });
  }
}

function cacheDom() {
  dom.editor = document.getElementById('queryInput');
  dom.runBtn = document.getElementById('runQueryBtn');
  dom.resetBtn = document.getElementById('resetDbBtn');
  dom.result = document.getElementById('resultContainer');
  dom.status = document.getElementById('dbStatus');
  dom.dialect = document.getElementById('dialectSelect');
  dom.engineBadge = document.getElementById('engineBadge');
  dom.dialectBadge = document.getElementById('dialectBadge');
  dom.execSql = document.getElementById('executedSqlText');
}

document.addEventListener('DOMContentLoaded', async () => {
  cacheDom();
  const params = parsePlaygroundParams();
  if (dom.dialect) dom.dialect.value = params.dialect || 'sqlite';
  if (dom.dialectBadge) dom.dialectBadge.textContent = `Dialetto esempi: ${DIALECTS[params.dialect] || 'SQLite'}`;
  if (dom.engineBadge) dom.engineBadge.textContent = 'Engine: SQLite (sql.js)';
  if (dom.status) dom.status.textContent = 'Caricamento engine...';

  try {
    engine = await createEngine();
    setStatus('Database pronto');
  } catch (err) {
    setStatus('Errore caricamento engine');
    showToast(err.message || String(err));
    return;
  }

  if (dom.editor) {
    const baseQuery = params.query || DIALECT_DEFAULT_QUERIES[params.dialect] || DEFAULT_QUERY;
    dom.editor.value = baseQuery;
  }

  wireControls(params);

  if (params.autorun && params.query) {
    runQuery();
  }
});
