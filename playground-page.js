(function () {
  'use strict';

  const qs = new URLSearchParams(window.location.search);
  let engine;

  function renderResult(target, data) {
    if (!target) return;
    if (!data.columns.length) {
      target.innerHTML = '<p class="muted">Query eseguita.</p>';
      return;
    }
    const head = `<tr>${data.columns.map((c) => `<th>${c}</th>`).join('')}</tr>`;
    const body = data.rows.map((r) => `<tr>${r.map((v) => `<td>${v ?? ''}</td>`).join('')}</tr>`).join('');
    target.innerHTML = `<table class="sql-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }

  async function run(editor, out, status) {
    try {
      const sql = editor.value.trim();
      const { result, changed } = engine.execute(sql);
      const rowset = result[0] ? { columns: result[0].columns, rows: result[0].values } : { columns: [], rows: [] };
      renderResult(out, rowset);
      if (changed) await engine.persist();
      if (status) status.textContent = 'Query eseguita';
    } catch (e) {
      out.innerHTML = `<pre class="error-block">${e.message}</pre>`;
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const editor = document.getElementById('queryInput');
    const runBtn = document.getElementById('runQueryBtn');
    const resetBtn = document.getElementById('resetDbBtn');
    const out = document.getElementById('resultContainer');
    const status = document.getElementById('dbStatus');

    if (!editor || !out) return;
    if (status) status.textContent = 'Caricamento...';
    engine = await window.SQLCore.createEngine();
    if (status) status.textContent = 'Database pronto';

    if (runBtn) runBtn.addEventListener('click', () => run(editor, out, status));
    if (resetBtn) resetBtn.addEventListener('click', async () => {
      await engine.resetDemo();
      if (status) status.textContent = 'Database demo ripristinato';
    });

    const prefill = qs.get('q');
    if (prefill) editor.value = prefill;
    if (prefill && qs.get('autorun') === '1') run(editor, out, status);
  });
})();
