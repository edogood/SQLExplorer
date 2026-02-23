import { KEYWORD_ENTRIES } from '../data/keyword-entries.js';
import { buildPlaygroundUrl } from '../ui/links.js';
import { escapeHtml } from '../ui/dom.js';

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

function render() {
  if (!dom.list) return;
  const term = (dom.search?.value || '').toLowerCase();
  const dialect = dom.dialect?.value || 'all';
  const category = dom.category?.value || 'all';
  const filtered = KEYWORD_ENTRIES.filter((k) => {
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

  dom.list.innerHTML = filtered.map((k) => {
    const example = (k.examples && (k.examples[dialect] || k.examples.sqlite)) || k.engineExample || '';
    const useCases = (k.useCases || []).map((u) => `<li>${escapeHtml(u)}</li>`).join('');
    const pitfalls = (k.pitfalls || []).map((p) => `<li>${escapeHtml(p)}</li>`).join('');
    const dialectNotes = k.dialectNotes ? Object.entries(k.dialectNotes).map(
      ([d, note]) => `<li><strong>${escapeHtml(d)}:</strong> ${escapeHtml(note)}</li>`
    ).join('') : '';
    const url = buildPlaygroundUrl({ dialect: dialect === 'all' ? 'sqlite' : dialect, query: example, autorun: true });
    return `
      <article class="keyword-card">
        <h3>${escapeHtml(k.keyword)}</h3>
        <p class="muted">${escapeHtml(k.description || k.syntax || '')}</p>
        <pre>${escapeHtml(example)}</pre>
        <div class="keyword-meta">
          <span>${escapeHtml(k.category || '')}</span>
        </div>
        <div class="keyword-actions">
          <a class="btn btn-primary" href="${url}">Try in Playground</a>
        </div>
        ${useCases ? `<h4 class="keyword-subtitle">Use case</h4><ul class="keyword-points">${useCases}</ul>` : ''}
        ${pitfalls ? `<h4 class="keyword-subtitle">Pitfall</h4><ul class="keyword-points">${pitfalls}</ul>` : ''}
        ${dialectNotes ? `<h4 class="keyword-subtitle">Note dialetto</h4><ul class="keyword-points">${dialectNotes}</ul>` : ''}
      </article>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  ensureCategoryOptions();
  dom.search?.addEventListener('input', render);
  dom.dialect?.addEventListener('change', render);
  dom.category?.addEventListener('change', render);
  render();
});
