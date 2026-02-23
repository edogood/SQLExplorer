(function () {
  const data = [
    { title: 'SELECT base', topic: 'SELECT', difficulty: 'Base', query: 'SELECT id, name FROM customers LIMIT 10;' },
    { title: 'JOIN ordini clienti', topic: 'JOIN', difficulty: 'Intermedio', query: 'SELECT o.id, c.name, o.total_amount FROM orders o JOIN customers c ON c.id=o.customer_id LIMIT 15;' },
    { title: 'Aggregazione revenue', topic: 'GROUP BY', difficulty: 'Intermedio', query: 'SELECT status, ROUND(SUM(total_amount),2) AS tot FROM orders GROUP BY status;' },
    { title: 'Window ranking', topic: 'WINDOW', difficulty: 'Avanzato', query: 'SELECT customer_id,total_amount,ROW_NUMBER() OVER(PARTITION BY customer_id ORDER BY total_amount DESC) rn FROM orders LIMIT 20;' }
  ];

  document.addEventListener('DOMContentLoaded', function () {
    const list = document.getElementById('exerciseList');
    const search = document.getElementById('exerciseSearch');
    const topic = document.getElementById('exerciseTopic');
    const diff = document.getElementById('exerciseDifficulty');
    const count = document.getElementById('exerciseCount');
    if (!list) return;
    [...new Set(data.map((d) => d.topic))].forEach((t) => topic && topic.insertAdjacentHTML('beforeend', `<option>${t}</option>`));
    function render() {
      const term = (search && search.value || '').toLowerCase();
      const t = topic && topic.value || 'Tutti';
      const d = diff && diff.value || 'Tutti';
      const filtered = data.filter((x) => (t === 'Tutti' || x.topic === t) && (d === 'Tutti' || x.difficulty === d) && x.title.toLowerCase().includes(term));
      count.textContent = `${filtered.length} esercizi`;
      list.innerHTML = filtered.map((x) => `<article class="keyword-card"><h3>${x.title}</h3><p>${x.topic} · ${x.difficulty}</p><a class="btn btn-primary" href="playground.html?q=${encodeURIComponent(x.query)}&autorun=1">Try in Playground</a></article>`).join('');
    }
    [search, topic, diff].forEach((el) => el && el.addEventListener('input', render));
    topic && topic.addEventListener('change', render);
    diff && diff.addEventListener('change', render);
    render();
  });
})();
