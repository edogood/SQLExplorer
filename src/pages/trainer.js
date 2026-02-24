import { TRAINER_CHALLENGES } from '../data/trainer-data.js';
import { buildPlaygroundUrl } from '../ui/links.js';
import { createElement } from '../ui/dom.js';

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
  dom.list.replaceChildren();
  TRAINER_CHALLENGES.forEach((c) => {
    const url = buildPlaygroundUrl({ query: c.query, autorun: true, sqliteSafe: true });
    const card = createElement('article', { className: 'keyword-card' }, [
      createElement('h3', { text: c.name }),
      createElement('p', { className: 'muted', text: c.description || '' }),
      createElement('a', { className: 'btn btn-primary', text: 'Try in Playground', attrs: { href: url } })
    ]);
    dom.list.appendChild(card);
  });
  if (dom.count) dom.count.textContent = `${TRAINER_CHALLENGES.length} challenge`;
}

document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  render();
});
