import { TRAINER_CHALLENGES } from '../data/trainer-data.js';
import { buildPlaygroundUrl } from '../ui/links.js';
import { createElement } from '../ui/dom.js';
import { compareRowsDetailed } from '../../verification.js';

const dom = {};

function cacheDom() {
  dom.list = document.getElementById('trainerPageList');
  dom.count = document.getElementById('trainerCount');
}

function sampleVerificationText(challenge) {
  if (!challenge.expected || !Array.isArray(challenge.expected) || !challenge.expected.length) {
    return 'Verifica: manuale (challenge aperta nel Playground).';
  }
  const dryRun = compareRowsDetailed(challenge.expected, challenge.expected, { ignoreOrder: true, tolerance: 0.0001 });
  return `Verifica automatica pronta: ${dryRun.summary} (ordine ignorato, tolleranza numerica attiva).`;
}

function render() {
  if (!dom.list) return;
  dom.list.replaceChildren();
  TRAINER_CHALLENGES.forEach((c) => {
    const url = buildPlaygroundUrl({ query: c.query, autorun: true, sqliteSafe: true });
    const card = createElement('article', { className: 'keyword-card' }, [
      createElement('h3', { text: c.name }),
      createElement('p', { className: 'muted', text: c.description || '' }),
      createElement('p', { className: 'muted', text: sampleVerificationText(c) }),
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
