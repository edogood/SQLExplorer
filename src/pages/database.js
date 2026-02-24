import { createEngine } from '../../db-core.js';
import { createElement, renderTable } from '../ui/dom.js';
import { showToast } from '../ui/toast.js';

const dom = {};
let engine = null;
let erd = null;
let schemaSnapshot = null;
let createErd = null;

function cacheDom() {
  dom.status = document.getElementById('dbStatus');
  dom.tableSelect = document.getElementById('tableSelect');
  dom.tablePreview = document.getElementById('tablePreview');
  dom.tableTemplates = document.getElementById('tableTemplates');
  dom.dbVisualizer = document.getElementById('dbVisualizer');
  dom.createBtn = document.getElementById('createTableBtn');
  dom.resetBtn = document.getElementById('resetDbBtn');
  dom.customTableName = document.getElementById('customTableName');
  dom.customColumns = document.getElementById('customColumns');
  dom.customRows = document.getElementById('customRows');
}

function validateTableName(name) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name || '');
}

function validateColumns(columns) {
  return columns && !/(;|--|\/\*)/.test(columns);
}

function setStatus(message) {
  if (dom.status) dom.status.textContent = message;
}

function populateTables(tables) {
  if (!dom.tableSelect) return;
  dom.tableSelect.innerHTML = '';
  tables.forEach((t) => {
    dom.tableSelect.appendChild(createElement('option', { text: t, attrs: { value: t.name || t } }));
  });
}

function previewFirstTable(tables) {
  const first = tables[0];
  if (!first) {
    if (dom.tablePreview) dom.tablePreview.innerHTML = '<p class="muted">Nessuna tabella disponibile</p>';
    return;
  }
  const data = engine.queryRows(`SELECT * FROM ${first.name || first} LIMIT 15`);
  renderTable(dom.tablePreview, data);
  renderTemplates(first.name || first);
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
  if (!dom.tableTemplates) return;
  const templates = buildTemplates(tableName);
  if (!templates.length) {
    dom.tableTemplates.innerHTML = '<p class="muted">Nessun template disponibile</p>';
    return;
  }
  dom.tableTemplates.innerHTML = '';
  templates.forEach((tpl) => {
    const pre = document.createElement('pre');
    pre.className = 'syntax-block';
    pre.textContent = tpl;
    dom.tableTemplates.appendChild(pre);
  });
}

async function refreshTables() {
  schemaSnapshot = engine.describe();
  populateTables(schemaSnapshot.tables);
  if (!createErd && typeof document !== 'undefined') {
    ({ createErd } = await import('../ui/erd.js'));
  }
  if (dom.dbVisualizer && createErd && !erd) {
    erd = createErd(dom.dbVisualizer, {
      onTableClick: (name) => {
        if (dom.tableSelect) dom.tableSelect.value = name;
        const data = engine.queryRows(`SELECT * FROM ${name} LIMIT 15`);
        renderTable(dom.tablePreview, data);
        renderTemplates(name);
      }
    });
  }
  if (erd) erd.update(schemaSnapshot);
  previewFirstTable(schemaSnapshot.tables);
}

async function createTable() {
  const name = (dom.customTableName && dom.customTableName.value || 'custom_table').trim();
  const cols = (dom.customColumns && dom.customColumns.value || '').trim();
  const rows = Number((dom.customRows && dom.customRows.value) || 0);

  if (!validateTableName(name)) {
    showToast('Nome tabella non valido (usa lettere, numeri, underscore).');
    return;
  }
  if (!validateColumns(cols)) {
    showToast('Definizione colonne non valida (no ;, --, /* */).');
    return;
  }

  await engine.execute(`CREATE TABLE IF NOT EXISTS ${name} (${cols});`);
  const canSeed = /label/i.test(cols);
  if (rows > 0 && canSeed) {
    for (let i = 1; i <= rows; i += 1) {
      await engine.execute(`INSERT INTO ${name} (label) VALUES ('Row ${i}')`);
    }
  }
  await engine.persist();
  refreshTables();
  setStatus(`${name} creata`);
}

async function resetDemo() {
  await engine.resetDemo();
  refreshTables();
  setStatus('Database demo ripristinato');
}

function wireEvents() {
  if (dom.tableSelect) {
    dom.tableSelect.addEventListener('change', () => {
      const table = dom.tableSelect.value;
      if (!table) return;
      const data = engine.queryRows(`SELECT * FROM ${table} LIMIT 15`);
      renderTable(dom.tablePreview, data);
      renderTemplates(table);
    });
  }
  if (dom.createBtn) dom.createBtn.addEventListener('click', createTable);
  if (dom.resetBtn) dom.resetBtn.addEventListener('click', resetDemo);
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    cacheDom();
    setStatus('Caricamento database...');
    engine = await createEngine();
    await refreshTables();
    setStatus('Database pronto');
    wireEvents();
  });
}
