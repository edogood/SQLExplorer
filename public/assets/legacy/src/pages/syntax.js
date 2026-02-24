import { SYNTAX_TOPICS } from '../data/syntax-topics.js';
import { buildPlaygroundUrl } from '../ui/links.js';
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

  dom.list.replaceChildren();

  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.className = 'info-block';
    empty.textContent = 'Nessuna sintassi trovata.';
    dom.list.appendChild(empty);
    announce('Nessun match nella ricerca sintassi.');
    return;
  }

  filtered.forEach((topic) => {
    const slug = slugify(topic.title);
    const snippet = topic.snippets[dialect] || topic.snippets.sqlite;
    const article = document.createElement('article');
    article.className = 'syntax-page-card';
    article.id = slug;
    article.tabIndex = -1;

    const heading = document.createElement('h3');
    const anchor = document.createElement('a');
    anchor.href = `#${slug}`;
    anchor.textContent = topic.title;
    heading.appendChild(anchor);
    article.appendChild(heading);

    const summary = document.createElement('p');
    summary.className = 'muted';
    summary.textContent = topic.summary;
    article.appendChild(summary);

    const argsTitle = document.createElement('h4');
    argsTitle.className = 'keyword-subtitle';
    argsTitle.textContent = 'Argomenti';
    article.appendChild(argsTitle);

    const argsList = document.createElement('ul');
    argsList.className = 'keyword-points';
    (topic.args || []).forEach((arg) => {
      const li = document.createElement('li');
      li.textContent = arg;
      argsList.appendChild(li);
    });
    article.appendChild(argsList);

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = snippet;
    pre.appendChild(code);
    article.appendChild(pre);

    const actions = document.createElement('div');
    actions.className = 'syntax-actions';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-secondary';
    copyBtn.type = 'button';
    copyBtn.dataset.copy = encodeURIComponent(snippet);
    copyBtn.textContent = 'Copia snippet';
    actions.appendChild(copyBtn);

    const playgroundUrl = buildPlaygroundUrl({
      dialect,
      query: snippet,
      autorun: true,
      sqliteSafe: dialect === 'sqlite'
    });
    const link = document.createElement('a');
    link.className = 'btn btn-primary';
    link.href = playgroundUrl;
    link.textContent = 'Apri nel Playground';
    actions.appendChild(link);

    article.appendChild(actions);

    if (topic.attention && topic.attention.length) {
      const attTitle = document.createElement('h4');
      attTitle.className = 'keyword-subtitle';
      attTitle.textContent = 'Attenzione';
      article.appendChild(attTitle);

      const attList = document.createElement('ul');
      attList.className = 'keyword-points';
      topic.attention.forEach((a) => {
        const li = document.createElement('li');
        li.textContent = a;
        attList.appendChild(li);
      });
      article.appendChild(attList);
    }

    dom.list.appendChild(article);
  });

  announce(`Risultati mostrati: ${filtered.length}.`);
  focusAnchorIfPresent();
}

function handleActions(event) {
  const btn = event.target.closest('[data-copy]');
  if (!btn) return;
  const snippet = decodeURIComponent(btn.dataset.copy || '');
  copyToClipboard(snippet);
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    dom.search?.addEventListener('input', render);
    dom.dialect?.addEventListener('change', render);
    dom.list?.addEventListener('click', handleActions);
    render();
    window.addEventListener('hashchange', focusAnchorIfPresent);
  });
}
