(function () {
  const steps = [
    { title: 'Step 1 - SELECT', text: 'Seleziona colonne base da customers.', query: 'SELECT id, name FROM customers LIMIT 5;' },
    { title: 'Step 2 - JOIN', text: 'Unisci orders e customers.', query: 'SELECT o.id, c.name, o.status FROM orders o JOIN customers c ON c.id=o.customer_id LIMIT 10;' },
    { title: 'Step 3 - GROUP BY', text: 'Calcola totale per stato ordine.', query: 'SELECT status, COUNT(*) cnt, ROUND(SUM(total_amount),2) total FROM orders GROUP BY status;' }
  ];
  document.addEventListener('DOMContentLoaded', function () {
    const list = document.getElementById('guidedStepList');
    if (!list) return;
    list.innerHTML = steps.map((s) => `<article class="keyword-card"><h3>${s.title}</h3><p>${s.text}</p><a class="btn btn-primary" href="playground.html?q=${encodeURIComponent(s.query)}&autorun=1">Try in Playground</a></article>`).join('');
  });
})();
