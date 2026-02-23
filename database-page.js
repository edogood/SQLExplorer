(function () {
  'use strict';

  let engine;

  function table(el, data) {
    if (!el) return;
    if (!data.columns.length) { el.innerHTML = '<p class="muted">Nessun dato</p>'; return; }
    el.innerHTML = `<table class="sql-table"><thead><tr>${data.columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${data.rows.map((r) => `<tr>${r.map((v) => `<td>${v ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  async function refresh(select, preview, viz) {
    const tables = engine.getTables();
    if (select) {
      select.innerHTML = tables.map((t) => `<option value="${t}">${t}</option>`).join('');
    }
    if (viz) viz.innerHTML = `<div class="schema-svg">${tables.map((t) => `<div class="schema-node">${t}</div>`).join('')}</div>`;
    if (tables[0]) {
      const data = engine.queryRows(`SELECT * FROM ${tables[0]} LIMIT 15`);
      table(preview, data);
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const status = document.getElementById('dbStatus');
    const select = document.getElementById('tableSelect');
    const preview = document.getElementById('tablePreview');
    const viz = document.getElementById('dbVisualizer');
    const createBtn = document.getElementById('createTableBtn');
    const resetBtn = document.getElementById('resetDbBtn');
    if (status) status.textContent = 'Caricamento...';
    engine = await window.SQLCore.createEngine();
    await refresh(select, preview, viz);
    if (status) status.textContent = 'Database pronto';

    if (select) select.addEventListener('change', function () {
      table(preview, engine.queryRows(`SELECT * FROM ${select.value} LIMIT 15`));
    });

    if (createBtn) createBtn.addEventListener('click', async function () {
      const name = (document.getElementById('customTableName') || {}).value || 'custom_table';
      const cols = (document.getElementById('customColumns') || {}).value || 'id INTEGER PRIMARY KEY, label TEXT';
      const rows = Number((document.getElementById('customRows') || {}).value || 3);
      engine.execute(`CREATE TABLE IF NOT EXISTS ${name} (${cols});`);
      for (let i = 1; i <= rows; i += 1) engine.execute(`INSERT INTO ${name} (label) VALUES ('Row ${i}')`);
      await engine.persist();
      await refresh(select, preview, viz);
      if (status) status.textContent = `${name} creata`;
    });

    if (resetBtn) resetBtn.addEventListener('click', async function () {
      await engine.resetDemo();
      await refresh(select, preview, viz);
      if (status) status.textContent = 'Database demo ripristinato';
    });
  });
})();
