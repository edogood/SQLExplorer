import { KEYWORD_DATA } from '../../keyword-data.js';
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
  const cats = new Set(KEYWORD_DATA.map((k) => k.category || 'Altro'));
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
    article.appendChild(Object.assign(document.createElement('h3'), { textContent: k.keyword }));
    article.appendChild(Object.assign(document.createElement('p'), { className: 'muted', textContent: k.description || '' }));

    const syntax = Object.assign(document.createElement('pre'), { textContent: (k.syntaxByDialect?.[dialect] || k.syntax || '') });
    article.appendChild(syntax);
    const example = k.realExampleByDialect?.[dialect] || k.engineExample || '';
    article.appendChild(Object.assign(document.createElement('pre'), { textContent: example }));

    const notes = document.createElement('ul');
    notes.className = 'keyword-points';
    const argLi = document.createElement('li');
    argLi.textContent = `Argomenti: ${k.argumentsByDialect?.[dialect] || '-'}`;
    const noteLi = document.createElement('li');
    noteLi.textContent = `Note: ${k.notesByDialect?.[dialect] || '-'}`;
    notes.appendChild(argLi);
    notes.appendChild(noteLi);
    article.appendChild(notes);

    const actions = document.createElement('div');
    actions.className = 'keyword-actions';
    const link = document.createElement('a');
    link.className = 'btn btn-primary';
    link.href = buildPlaygroundUrl({ dialect, query: example, autorun: true, sqliteSafe: dialect === 'sqlite' });
    link.textContent = 'Try in Playground';
    actions.appendChild(link);
    article.appendChild(actions);

    dom.list.appendChild(article);
  });
}

function render() {
  if (!dom.list) return;
  const term = (dom.search?.value || '').toLowerCase();
  const dialect = dom.dialect?.value || 'all';
  const category = dom.category?.value || 'all';

  const filtered = KEYWORD_DATA.filter((k) => {
    const text = [k.keyword, k.category, k.description, ...(k.useCases || []), ...(k.pitfalls || [])].join(' ').toLowerCase();
    return (!term || text.includes(term)) && (category === 'all' || k.category === category) && (dialect === 'all' || k.realExampleByDialect?.[dialect]);
  });

  if (dom.count) dom.count.textContent = `${filtered.length} keyword`;
  announce(`${filtered.length} keyword trovate`);
  renderList(filtered, dialect === 'all' ? 'sqlite' : dialect);
}

document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  ensureCategoryOptions();
  dom.search?.addEventListener('input', render);
  dom.dialect?.addEventListener('change', render);
  dom.category?.addEventListener('change', render);
  render();
});
