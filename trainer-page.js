(function () {
  const challenges = [
    { name: 'Revenue per status', query: 'SELECT status, ROUND(SUM(total_amount),2) AS revenue FROM orders GROUP BY status ORDER BY status;', expected: [{status:'PAID'},{status:'PENDING'},{status:'REFUNDED'},{status:'SHIPPED'}] },
    { name: 'Top customers by orders', query: 'SELECT customer_id, COUNT(*) AS n_orders FROM orders GROUP BY customer_id ORDER BY n_orders DESC LIMIT 5;', expected: null }
  ];

  function normalizeValue(v) {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? Number(n.toFixed(6)) : String(v).trim().toLowerCase();
  }
  function normalizeRows(rows) {
    return rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), normalizeValue(v)]))).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  function compareRows(actual, expected) {
    const a = normalizeRows(actual); const e = normalizeRows(expected);
    if (a.length !== e.length) return { ok: false, report: `Row count diverso: atteso ${e.length}, ottenuto ${a.length}` };
    for (let i = 0; i < a.length; i += 1) {
      if (JSON.stringify(a[i]) !== JSON.stringify(e[i])) return { ok: false, report: `Mismatch alla riga normalizzata ${i + 1}:\natteso ${JSON.stringify(e[i])}\notenuto ${JSON.stringify(a[i])}` };
    }
    return { ok: true, report: 'Verifica superata (ordine righe ignorato, alias e numeri normalizzati).' };
  }

  document.addEventListener('DOMContentLoaded', function () {
    const list = document.getElementById('trainerPageList');
    if (!list) return;
    list.innerHTML = challenges.map((c) => `<article class="keyword-card"><h3>${c.name}</h3><a class="btn btn-primary" href="playground.html?q=${encodeURIComponent(c.query)}&autorun=1">Try in Playground</a></article>`).join('');
    window.TrainerCompare = compareRows;
  });
})();
