import { EXERCISES } from '../data/exercises-data.js';
import { buildPlaygroundUrl } from '../ui/links.js';
import { createElement } from '../ui/dom.js';

const dom = {};

function cacheDom() {
  dom.list = document.getElementById('exerciseList');
  dom.search = document.getElementById('exerciseSearch');
  dom.topic = document.getElementById('exerciseTopic');
  dom.difficulty = document.getElementById('exerciseDifficulty');
  dom.count = document.getElementById('exerciseCount');
}

function populateFilters() {
  if (dom.topic && dom.topic.children.length <= 1) {
    const topics = Array.from(new Set(EXERCISES.map((x) => x.topic)));
    topics.forEach((t) => dom.topic.appendChild(new Option(t, t)));
  }
}

function render() {
  if (!dom.list) return;
  const term = (dom.search?.value || '').toLowerCase();
  const topic = dom.topic?.value || 'Tutti';
  const difficulty = dom.difficulty?.value || 'Tutti';
  const filtered = EXERCISES.filter((x) => {
    const termOk = !term || x.title.toLowerCase().includes(term) || x.query.toLowerCase().includes(term);
    const topicOk = topic === 'Tutti' || x.topic === topic;
    const diffOk = difficulty === 'Tutti' || x.difficulty === difficulty;
    return termOk && topicOk && diffOk;
  });
  if (dom.count) dom.count.textContent = `${filtered.length} esercizi`;
  dom.list.replaceChildren();
  filtered.forEach((x) => {
    const url = buildPlaygroundUrl({ query: x.query, autorun: true, sqliteSafe: true });
    const card = createElement('article', { className: 'keyword-card' }, [
      createElement('h3', { text: x.title }),
      createElement('p', { text: `${x.topic} · ${x.difficulty}` }),
      createElement('a', { className: 'btn btn-primary', text: 'Try in Playground', attrs: { href: url } })
    ]);
    dom.list.appendChild(card);
  });
}

if (typeof document !== 'undefined') {
document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  populateFilters();
  dom.search?.addEventListener('input', render);
  dom.topic?.addEventListener('change', render);
  dom.difficulty?.addEventListener('change', render);
  render();
});

}
