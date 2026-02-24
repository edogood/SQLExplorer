import { createEngine } from '../core/engine.js';
import { parsePlaygroundParams } from '../ui/links.js';
import { escapeHtml, renderTable } from '../ui/dom.js';
import { DEFAULT_QUERY, DIALECT_DEFAULT_QUERIES, DIALECTS } from '../data/dialects.js';
import { showToast } from '../ui/toast.js';
import { createErd } from '../ui/erd.js';

const dom = {};
let engine = null;
let erd = null;
let schemaSnapshot = null;

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
  refreshSchema();
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
  dom.erd = document.getElementById('playgroundErd');
  dom.erdSelect = document.getElementById('erdTableSelect');
  dom.erdPreview = document.getElementById('erdTablePreview');
  dom.erdTemplates = document.getElementById('erdTemplateQueries');
}

function populateErdSelect(tables) {
  if (!dom.erdSelect) return;
  dom.erdSelect.innerHTML = '';
  tables.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t.name;
    opt.textContent = t.name;
    dom.erdSelect.appendChild(opt);
  });
}

function previewTable(name) {
  if (!engine || !dom.erdPreview || !name) return;
  const data = engine.queryRows(`SELECT * FROM ${name} LIMIT 15`);
  renderTable(dom.erdPreview, data);
  renderTemplates(name);
}

function refreshSchema() {
  if (!engine) return;
  schemaSnapshot = engine.describe();
  populateErdSelect(schemaSnapshot.tables);
  if (dom.erd && !erd) {
    erd = createErd(dom.erd, {
      onTableClick: (name) => {
        if (dom.erdSelect) dom.erdSelect.value = name;
        previewTable(name);
      }
    });
  }
  if (erd) erd.update(schemaSnapshot);
  previewTable(schemaSnapshot.tables[0] && schemaSnapshot.tables[0].name);
}

function buildTemplates(tableName) {
  if (!schemaSnapshot) return [];
  const table = schemaSnapshot.tables.find((t) => t.name === tableName);
  if (!table) return [];
  const cols = table.columns.map((c) => c.name);
  const firstCol = cols[0] || '*';
  const distinctCol = cols.find((c) => c !== firstCol) || firstCol;
  const edge = schemaSnapshot.edges.find((e) => e.from === tableName) || schemaSnapshot.edges.find((e) => e.to === tableName);
  const joinSql = edge
    ? `SELECT *\nFROM ${edge.from} f\nJOIN ${edge.to} d ON f.${edge.fromColumn} = d.${edge.toColumn}\nLIMIT 20;`
    : null;
  return [
    `SELECT COUNT(*) AS rows_count FROM ${tableName};`,
    `SELECT ${distinctCol}, COUNT(*) AS occurrences\nFROM ${tableName}\nGROUP BY ${distinctCol}\nORDER BY occurrences DESC\nLIMIT 10;`,
    joinSql
  ].filter(Boolean);
}

function renderTemplates(tableName) {
  if (!dom.erdTemplates) return;
  const templates = buildTemplates(tableName);
  if (!templates.length) {
    dom.erdTemplates.innerHTML = '<p class="placeholder">Nessun template disponibile</p>';
    return;
  }
  dom.erdTemplates.innerHTML = '';
  templates.forEach((tpl) => {
    const pre = document.createElement('pre');
    pre.className = 'syntax-block';
    pre.textContent = tpl;
    dom.erdTemplates.appendChild(pre);
  });
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
    refreshSchema();
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
  if (dom.erdSelect) {
    dom.erdSelect.addEventListener('change', () => {
      const table = dom.erdSelect.value;
      previewTable(table);
    });
  }

  if (params.autorun && params.query) {
    runQuery();
  }
});
