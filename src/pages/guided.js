import { GUIDED_STEPS } from '../data/guided-data.js';
import { buildPlaygroundUrl } from '../ui/links.js';
import { escapeHtml } from '../ui/dom.js';

const dom = {};

function cacheDom() {
  dom.list = document.getElementById('guidedList');
  dom.count = document.getElementById('guidedCount');
}

function render() {
  if (!dom.list) return;
  dom.list.innerHTML = GUIDED_STEPS.map((step, idx) => {
    const query = step.starter?.sqlite || '';
    const url = buildPlaygroundUrl({ dialect: 'sqlite', query, autorun: true });
    return `
      <article class="keyword-card">
        <h3>${escapeHtml(step.title || `Step ${idx + 1}`)}</h3>
        <p class="muted">${escapeHtml(step.goal || '')}</p>
        <p><strong>Hint:</strong> ${escapeHtml(step.hint || '')}</p>
        <p class="keyword-points">${(step.topics || []).map((t) => escapeHtml(t)).join(' · ')}</p>
        <a class="btn btn-primary" href="${url}">Apri nel Playground</a>
      </article>
    `;
  }).join('');
  if (dom.count) dom.count.textContent = `${GUIDED_STEPS.length} step`;
}

document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  render();
});
