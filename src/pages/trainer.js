import { TRAINER_CHALLENGES } from '../data/trainer-data.js';
import { buildPlaygroundUrl } from '../ui/links.js';
import { escapeHtml } from '../ui/dom.js';

export function normalizeValue(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Number(n.toFixed(6)) : String(v).trim().toLowerCase();
}

export function normalizeRows(rows) {
  return rows
    .map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), normalizeValue(v)])))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

export function compareRows(actual, expected) {
  const a = normalizeRows(actual);
  const e = normalizeRows(expected);
  if (a.length !== e.length) return { ok: false, report: `Row count diverso: atteso ${e.length}, ottenuto ${a.length}` };
  for (let i = 0; i < a.length; i += 1) {
    if (JSON.stringify(a[i]) !== JSON.stringify(e[i])) {
      return { ok: false, report: `Mismatch alla riga ${i + 1}: atteso ${JSON.stringify(e[i])}, ottenuto ${JSON.stringify(a[i])}` };
    }
  }
  return { ok: true, report: 'Verifica superata (ordine righe ignorato, alias e numeri normalizzati).' };
}

const dom = {};

function cacheDom() {
  dom.list = document.getElementById('trainerPageList');
  dom.count = document.getElementById('trainerCount');
}

function render() {
  if (!dom.list) return;
  dom.list.innerHTML = TRAINER_CHALLENGES.map((c) => {
    const url = buildPlaygroundUrl({ query: c.query, autorun: true });
    return `
      <article class="keyword-card">
        <h3>${escapeHtml(c.name)}</h3>
        <p class="muted">${escapeHtml(c.description || '')}</p>
        <a class="btn btn-primary" href="${url}">Try in Playground</a>
      </article>
    `;
  }).join('');
  if (dom.count) dom.count.textContent = `${TRAINER_CHALLENGES.length} challenge`;
}

document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  render();
});
