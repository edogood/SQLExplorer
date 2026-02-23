import { createEngine } from '../core/engine.js';
import { createElement, renderTable } from '../ui/dom.js';
import { showToast } from '../ui/toast.js';
import { createErd } from '../ui/erd.js';

const dom = {};
let engine = null;
let erd = null;

function cacheDom() {
  dom.status = document.getElementById('dbStatus');
  dom.tableSelect = document.getElementById('tableSelect');
  dom.tablePreview = document.getElementById('tablePreview');
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
}

async function refreshTables() {
  const schema = engine.describe();
  populateTables(schema.tables);
  if (dom.dbVisualizer && !erd) {
    erd = createErd(dom.dbVisualizer, {
      onTableClick: (name) => {
        if (dom.tableSelect) dom.tableSelect.value = name;
        const data = engine.queryRows(`SELECT * FROM ${name} LIMIT 15`);
        renderTable(dom.tablePreview, data);
      }
    });
  }
  if (erd) erd.update(schema);
  previewFirstTable(schema.tables);
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
    });
  }
  if (dom.createBtn) dom.createBtn.addEventListener('click', createTable);
  if (dom.resetBtn) dom.resetBtn.addEventListener('click', resetDemo);
}

document.addEventListener('DOMContentLoaded', async () => {
  cacheDom();
  setStatus('Caricamento database...');
  engine = await createEngine();
  refreshTables();
  setStatus('Database pronto');
  wireEvents();
});
