import { createEngine } from '../../db-core.js';
import { parsePlaygroundParams } from '../ui/links.js';
import { escapeHtml, renderTable } from '../ui/dom.js';
import { DEFAULT_QUERY, DIALECT_DEFAULT_QUERIES, DIALECTS } from '../data/dialects.js';
import { showToast } from '../ui/toast.js';

const dom = {};
let engine = null;
let schemaSnapshot = null;
const HISTORY_KEY = 'sql_history';
const DATASET_LABEL = 'Dataset: Demo e-commerce';

function setStatus(message) {
  if (dom.status) dom.status.textContent = message;
}

function renderResultSets(result) {
  if (!dom.result) return;
  dom.result.innerHTML = '';
  if (!result || !result.length) {
    dom.result.innerHTML = '<p class="placeholder">Nessun dato</p>';
    return;
  }
  const tabs = document.createElement('div');
  tabs.className = 'tab-list';
  const panels = document.createElement('div');
  panels.className = 'tab-panels';
  result.forEach((set, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = idx === 0 ? 'tab active' : 'tab';
    btn.textContent = `Result ${idx + 1}`;
    const panel = document.createElement('div');
    panel.className = idx === 0 ? 'tab-panel active' : 'tab-panel';
    renderTable(panel, { columns: set.columns || [], rows: set.values || [] });
    btn.addEventListener('click', () => {
      tabs.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      panels.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      panel.classList.add('active');
    });
    tabs.appendChild(btn);
    panels.appendChild(panel);
  });
  dom.result.appendChild(tabs);
  dom.result.appendChild(panels);
}

function getSelectedSql() {
  if (!dom.editor) return '';
  const sel = dom.editor.value.substring(dom.editor.selectionStart || 0, dom.editor.selectionEnd || 0).trim();
  return sel || dom.editor.value.trim();
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveHistory(entries) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 50)));
}

function addHistory(sql) {
  const trimmed = sql.trim();
  if (!trimmed) return;
  const entries = loadHistory().filter((e) => e.sql !== trimmed);
  const newEntry = { sql: trimmed, ts: Date.now(), pinned: false };
  const pinned = entries.filter((e) => e.pinned);
  const unpinned = entries.filter((e) => !e.pinned);
  saveHistory([...pinned, newEntry, ...unpinned]);
  renderHistory();
}

function renderHistory() {
  if (!dom.historyList) return;
  const entries = loadHistory();
  if (!entries.length) {
    dom.historyList.innerHTML = '<p class="placeholder">Nessuna query salvata</p>';
    return;
  }
  dom.historyList.innerHTML = '';
  entries
    .sort((a, b) => (a.pinned === b.pinned ? b.ts - a.ts : a.pinned ? -1 : 1))
    .forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'history-row';
      const text = document.createElement('code');
      text.textContent = entry.sql.slice(0, 160);
      row.appendChild(text);
      const actions = document.createElement('div');
      actions.className = 'history-actions';
      const runBtn = document.createElement('button');
      runBtn.type = 'button';
      runBtn.className = 'btn btn-secondary';
      runBtn.textContent = 'Run';
      runBtn.addEventListener('click', () => {
        if (dom.editor) dom.editor.value = entry.sql;
        runQuery();
      });
      const pinBtn = document.createElement('button');
      pinBtn.type = 'button';
      pinBtn.className = 'btn btn-secondary';
      pinBtn.textContent = entry.pinned ? 'Unpin' : 'Pin';
      pinBtn.addEventListener('click', () => {
        entry.pinned = !entry.pinned;
        saveHistory(entries);
        renderHistory();
      });
      actions.appendChild(runBtn);
      actions.appendChild(pinBtn);
      row.appendChild(actions);
      dom.historyList.appendChild(row);
    });
}

async function runQuery() {
  if (!engine || !dom.editor || !dom.result) return;
  const sql = getSelectedSql();
  if (!sql) {
    setStatus('Nessuna query da eseguire');
    return;
  }
  try {
    const { result } = await engine.execute(sql);
    renderResultSets(result);
    addHistory(sql);
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
  if (dom.plan) dom.plan.innerHTML = '<p class="placeholder">Premi Explain per EXPLAIN QUERY PLAN</p>';
  refreshSchema();
}

async function runExplain() {
  if (!engine || !dom.editor || !dom.plan) return;
  const sql = getSelectedSql();
  if (!sql) {
    setStatus('Nessuna query da spiegare');
    return;
  }
  const explainSql = /^EXPLAIN/i.test(sql.trim()) ? sql : `EXPLAIN QUERY PLAN ${sql}`;
  try {
    const { result } = await engine.execute(explainSql);
    const first = result[0];
    const rowset = first ? { columns: first.columns, rows: first.values } : { columns: [], rows: [] };
    renderTable(dom.plan, rowset);
    if (dom.execSql) dom.execSql.textContent = explainSql;
    setStatus('Explain completato');
  } catch (err) {
    dom.plan.innerHTML = `<pre class="error-block">${escapeHtml(err.message || String(err))}</pre>`;
    setStatus('Errore explain');
  }
}

function wireControls(params) {
  if (dom.runBtn) dom.runBtn.addEventListener('click', runQuery);
  if (dom.explainBtn) dom.explainBtn.addEventListener('click', runExplain);
  if (dom.resetBtn) dom.resetBtn.addEventListener('click', resetDemo);
  if (dom.dialect) {
    dom.dialect.addEventListener('change', () => {
      const q = DIALECT_DEFAULT_QUERIES[dom.dialect.value] || DEFAULT_QUERY;
      if (!params.query) dom.editor.value = q;
      if (dom.dialectBadge) dom.dialectBadge.textContent = `Dialetto esempi: ${DIALECTS[dom.dialect.value] || 'SQLite'}`;
      if (dom.dialectNotice) {
        const isSqlite = dom.dialect.value === 'sqlite';
        dom.dialectNotice.hidden = isSqlite;
        dom.dialectNotice.textContent = isSqlite ? '' : 'Esecuzione: SQLite. Dialetto selezionato = esempi.';
      }
    });
  }
  if (dom.editor) {
    dom.editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        runQuery();
      }
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
  dom.datasetBadge = document.getElementById('datasetBadge');
  dom.dialectNotice = document.getElementById('dialectNotice');
  dom.execSql = document.getElementById('executedSqlText');
  dom.schemaSidebar = document.getElementById('schemaSidebar');
  dom.historyList = document.getElementById('historyList');
  dom.plan = document.getElementById('planContainer');
  dom.explainBtn = document.getElementById('explainBtn');
}

function refreshSchema() {
  if (!engine) return;
  schemaSnapshot = engine.describe();
  renderSidebar();
}

function insertAtCursor(text) {
  if (!dom.editor) return;
  const start = dom.editor.selectionStart || 0;
  const end = dom.editor.selectionEnd || 0;
  const value = dom.editor.value;
  dom.editor.value = `${value.slice(0, start)}${text}${value.slice(end)}`;
  const cursor = start + text.length;
  dom.editor.setSelectionRange(cursor, cursor);
  dom.editor.focus();
}

function renderSidebar() {
  if (!dom.schemaSidebar || !schemaSnapshot) return;
  dom.schemaSidebar.innerHTML = '';
  schemaSnapshot.tables.forEach((table) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'schema-entry';
    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'link-button';
    title.textContent = table.name;
    title.addEventListener('click', () => insertAtCursor(table.name));
    wrapper.appendChild(title);

    const cols = document.createElement('ul');
    cols.className = 'schema-columns';
    table.columns.forEach((col) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'link-button';
      btn.textContent = col.name;
      btn.addEventListener('click', () => insertAtCursor(`${table.name}.${col.name}`));
      li.appendChild(btn);
      cols.appendChild(li);
    });
    wrapper.appendChild(cols);
    dom.schemaSidebar.appendChild(wrapper);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  cacheDom();
  const params = parsePlaygroundParams();
  if (dom.dialect) dom.dialect.value = params.dialect || 'sqlite';
  if (dom.dialectBadge) dom.dialectBadge.textContent = `Dialetto esempi: ${DIALECTS[params.dialect] || 'SQLite'}`;
  if (dom.engineBadge) dom.engineBadge.textContent = 'Engine: SQLite (sql.js)';
  if (dom.datasetBadge) dom.datasetBadge.textContent = DATASET_LABEL;
  if (dom.dialectNotice) {
    dom.dialectNotice.hidden = params.dialect === 'sqlite';
    if (params.dialect !== 'sqlite') {
      dom.dialectNotice.textContent = 'Esecuzione: SQLite. Dialetto selezionato = esempi.';
    }
  }
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
  renderHistory();

  const shouldAutorun = params.autorun && params.dialect === 'sqlite';
  if (params.dialect && params.dialect !== 'sqlite' && params.autorun) {
    setStatus('Dialetto non eseguibile qui, premi Esegui per usare SQLite');
  } else if (shouldAutorun && params.query) {
    runQuery();
  }
});
