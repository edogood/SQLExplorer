import { KEYWORD_ENTRIES } from '../data/keyword-entries.js';
import { buildPlaygroundUrl } from '../ui/links.js';

const dom = {};

function cacheDom() {
  dom.search = document.getElementById('kwSearch');
  dom.category = document.getElementById('kwCategory');
  dom.dialect = document.getElementById('kwDialect');
  dom.count = document.getElementById('kwCount');
  dom.list = document.getElementById('kwList');
  dom.live = document.getElementById('kwLive');
}

function announce(message) {
  if (dom.live) dom.live.textContent = message;
}

function uniqueCategories() {
  const cats = new Set(KEYWORD_ENTRIES.map((k) => k.category || 'Altro'));
  return Array.from(cats.values()).sort();
}

function ensureCategoryOptions() {
  if (!dom.category || dom.category.children.length) return;
  dom.category.appendChild(new Option('Tutte', 'all'));
  uniqueCategories().forEach((c) => dom.category.appendChild(new Option(c, c)));
}

function renderList(entries, dialect) {
  if (!dom.list) return;
  dom.list.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'info-block';
    empty.textContent = 'Nessuna keyword trovata.';
    dom.list.appendChild(empty);
    return;
  }

  entries.forEach((k) => {
    const article = document.createElement('article');
    article.className = 'keyword-card';

    const title = document.createElement('h3');
    title.textContent = k.keyword;
    article.appendChild(title);

    const desc = document.createElement('p');
    desc.className = 'muted';
    desc.textContent = k.description || k.syntax || '';
    article.appendChild(desc);

    const example = (k.examples && (k.examples[dialect] || k.examples.sqlite)) || k.engineExample || '';
    const pre = document.createElement('pre');
    pre.textContent = example;
    article.appendChild(pre);

    const meta = document.createElement('div');
    meta.className = 'keyword-meta';
    const category = document.createElement('span');
    category.textContent = k.category || '';
    meta.appendChild(category);
    article.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'keyword-actions';
    const url = buildPlaygroundUrl({
      dialect,
      query: example,
      autorun: true,
      sqliteSafe: dialect === 'sqlite'
    });
    const link = document.createElement('a');
    link.className = 'btn btn-primary';
    link.href = url;
    link.textContent = 'Try in Playground';
    actions.appendChild(link);
    article.appendChild(actions);

    if (k.useCases && k.useCases.length) {
      const heading = document.createElement('h4');
      heading.className = 'keyword-subtitle';
      heading.textContent = 'Use case';
      article.appendChild(heading);
      const list = document.createElement('ul');
      list.className = 'keyword-points';
      k.useCases.forEach((u) => {
        const li = document.createElement('li');
        li.textContent = u;
        list.appendChild(li);
      });
      article.appendChild(list);
    }

    if (k.pitfalls && k.pitfalls.length) {
      const heading = document.createElement('h4');
      heading.className = 'keyword-subtitle';
      heading.textContent = 'Pitfall';
      article.appendChild(heading);
      const list = document.createElement('ul');
      list.className = 'keyword-points';
      k.pitfalls.forEach((p) => {
        const li = document.createElement('li');
        li.textContent = p;
        list.appendChild(li);
      });
      article.appendChild(list);
    }

    if (k.dialectNotes && Object.keys(k.dialectNotes).length) {
      const heading = document.createElement('h4');
      heading.className = 'keyword-subtitle';
      heading.textContent = 'Note dialetto';
      article.appendChild(heading);
      const list = document.createElement('ul');
      list.className = 'keyword-points';
      Object.entries(k.dialectNotes).forEach(([d, note]) => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = `${d}: `;
        li.appendChild(strong);
        const span = document.createElement('span');
        span.textContent = note;
        li.appendChild(span);
        list.appendChild(li);
      });
      article.appendChild(list);
    }

    dom.list.appendChild(article);
  });
}

function render() {
  if (!dom.list) return;
  const term = (dom.search?.value || '').toLowerCase();
  const dialect = dom.dialect?.value || 'all';
  const category = dom.category?.value || 'all';
  const filtered = KEYWORD_ENTRIES.filter((k) => {
    if (!k.description || !k.examples || Object.values(k.examples).every((ex) => !ex || ex.trim().length < 8)) return false;
    const blob = [
      k.keyword,
      k.category,
      k.description,
      ...(k.useCases || []),
      ...(k.pitfalls || []),
      ...(k.dialectNotes ? Object.values(k.dialectNotes) : []),
      ...(k.examples ? Object.values(k.examples) : [])
    ].join(' ').toLowerCase();
    const termOk = !term || blob.includes(term);
    const categoryOk = category === 'all' || k.category === category;
    const dialectOk = dialect === 'all' || (k.examples && k.examples[dialect]);
    return termOk && categoryOk && dialectOk;
  });

  dom.count && (dom.count.textContent = `${filtered.length} keyword`);
  announce(`${filtered.length} keyword trovate`);

  const targetDialect = dialect === 'all' ? 'sqlite' : dialect;
  renderList(filtered, targetDialect);
}

document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  ensureCategoryOptions();
  dom.search?.addEventListener('input', render);
  dom.dialect?.addEventListener('change', render);
  dom.category?.addEventListener('change', render);
  render();
});
