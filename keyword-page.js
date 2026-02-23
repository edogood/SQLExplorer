(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const list = document.getElementById('kwList');
    const search = document.getElementById('kwSearch');
    const dialect = document.getElementById('kwDialect');
    const count = document.getElementById('kwCount');
    if (!list || !window.KEYWORD_DATA) return;
    function render() {
      const term = (search && search.value || '').toLowerCase();
      const d = (dialect && dialect.value) || 'all';
      const filtered = window.KEYWORD_DATA.filter((k) => {
        const hay = `${k.keyword} ${k.category} ${k.notesByDialect.sqlite}`.toLowerCase();
        if (!hay.includes(term)) return false;
        return d === 'all' || Boolean(k.syntaxByDialect[d]);
      });
      count.textContent = `${filtered.length} keyword`;
      list.innerHTML = filtered.map((k) => `<article class="keyword-card"><h3>${k.keyword}</h3><p>${k.category}</p><pre>${k.syntaxByDialect.sqlite}</pre><a class="btn btn-primary" href="playground.html?q=${encodeURIComponent(k.engineExample)}&autorun=1">Try in Playground</a></article>`).join('');
    }
    [search, dialect].forEach((el) => el && el.addEventListener('input', render));
    dialect && dialect.addEventListener('change', render);
    render();
  });
})();
