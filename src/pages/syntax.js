import { SYNTAX_TOPICS } from '../data/syntax-topics.js';
import { buildPlaygroundUrl } from '../ui/links.js';
import { escapeHtml } from '../ui/dom.js';
import { showToast } from '../ui/toast.js';

const dom = {};

function cacheDom() {
  dom.search = document.getElementById('syntaxSearch');
  dom.dialect = document.getElementById('syntaxDialect');
  dom.list = document.getElementById('syntaxList');
  dom.live = document.getElementById('syntaxLive');
}

function announce(message) {
  if (dom.live) dom.live.textContent = message;
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('aria-hidden', 'true');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showToast('Snippet copiato negli appunti');
  } catch {
    alert('Impossibile copiare lo snippet');
  }
}

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function focusAnchorIfPresent() {
  const hash = window.location.hash.replace('#', '');
  if (!hash) return;
  const target = document.getElementById(hash);
  if (target) target.focus();
}

function render() {
  if (!dom.list) return;
  const term = (dom.search?.value || '').trim().toLowerCase();
  const dialect = dom.dialect?.value || 'sqlite';
  const filtered = SYNTAX_TOPICS.filter((topic) => {
    const blob = [
      topic.title,
      topic.summary,
      ...(topic.args || []),
      topic.snippets.sqlite,
      topic.snippets.postgresql,
      topic.snippets.sqlserver
    ].join(' ').toLowerCase();
    return !term || blob.includes(term);
  });

  if (!filtered.length) {
    dom.list.innerHTML = '<p class="info-block">Nessuna sintassi trovata.</p>';
    announce('Nessun match nella ricerca sintassi.');
    return;
  }

  dom.list.innerHTML = filtered.map((topic) => {
    const args = (topic.args || []).map((arg) => `<li>${escapeHtml(arg)}</li>`).join('');
    const snippet = topic.snippets[dialect] || topic.snippets.sqlite;
    const slug = slugify(topic.title);
    const attentionHtml = (topic.attention || []).length
      ? `<h4 class="keyword-subtitle">Attenzione</h4><ul class="keyword-points">${topic.attention.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
      : '';
    const playgroundUrl = buildPlaygroundUrl({ dialect, query: snippet, autorun: true });
    return `
      <article class="syntax-page-card" id="${slug}" tabindex="-1">
        <h3><a href="#${slug}">${escapeHtml(topic.title)}</a></h3>
        <p class="muted">${escapeHtml(topic.summary)}</p>
        <h4 class="keyword-subtitle">Argomenti</h4>
        <ul class="keyword-points">${args}</ul>
        <pre><code>${escapeHtml(snippet)}</code></pre>
        <div class="syntax-actions">
          <button class="btn btn-secondary" type="button" data-copy="${encodeURIComponent(snippet)}">Copia snippet</button>
          <a class="btn btn-primary" href="${playgroundUrl}">Apri nel Playground</a>
        </div>
        ${attentionHtml}
      </article>
    `;
  }).join('');

  announce(`Risultati mostrati: ${filtered.length}.`);
  focusAnchorIfPresent();
}

function handleActions(event) {
  const btn = event.target.closest('[data-copy]');
  if (!btn) return;
  const snippet = decodeURIComponent(btn.dataset.copy || '');
  copyToClipboard(snippet);
}

document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  dom.search?.addEventListener('input', render);
  dom.dialect?.addEventListener('change', render);
  dom.list?.addEventListener('click', handleActions);
  render();
  window.addEventListener('hashchange', focusAnchorIfPresent);
});
