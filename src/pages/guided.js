import { createEngine } from '../../db-core.js';
import { GUIDED_STEPS } from '../data/guided-data.js';
import { buildPlaygroundUrl } from '../ui/links.js';
import { createElement, renderTable, clear } from '../ui/dom.js';
import { showToast } from '../ui/toast.js';

const dom = {};
let engine = null;
const progressKey = 'guided_progress_v1';
const expectedCache = new Map();

function cacheDom() {
  dom.list = document.getElementById('guidedList');
  dom.count = document.getElementById('guidedCount');
  dom.reset = document.getElementById('resetProgressBtn');
  dom.resume = document.getElementById('resumeProgressBtn');
}

function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(progressKey)) || { completed: {} };
    return { completed: data.completed || {}, lastStep: data.lastStep || null };
  } catch (e) {
    return { completed: {}, lastStep: null };
  }
}

function saveProgress(data) {
  localStorage.setItem(progressKey, JSON.stringify(data));
}

async function hashRows(rowset, ignoreOrder = false) {
  const columns = rowset.columns || [];
  const rows = (rowset.rows || []).map((r) => r.map((v) => (v === null || v === undefined ? '' : String(v))));
  const normalized = ignoreOrder ? rows.slice().sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : rows;
  const payload = JSON.stringify({ columns, rows: normalized });
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function computeSignature(sql, ignoreOrder) {
  const { result } = await engine.execute(sql);
  const first = result[0] || { columns: [], values: [] };
  return hashRows({ columns: first.columns || [], rows: first.values || [] }, ignoreOrder);
}

async function ensureExpected(step) {
  if (expectedCache.has(step.id)) return expectedCache.get(step.id);
  const cached = step.expectedSignature;
  if (cached) {
    expectedCache.set(step.id, cached);
    return cached;
  }
  const sig = await computeSignature(step.solution.sqlite, step.ignoreOrder);
  expectedCache.set(step.id, sig);
  return sig;
}

function renderProgress() {
  const progress = loadProgress();
  const completed = Object.keys(progress.completed || {}).length;
  if (dom.count) dom.count.textContent = `${completed}/${GUIDED_STEPS.length} completati`;
  if (dom.resume) dom.resume.disabled = GUIDED_STEPS.length === 0;
}

function createBadge(text, className = 'badge') {
  return createElement('span', { className, text });
}

function renderStep(step, idx, state) {
  const url = buildPlaygroundUrl({
    dialect: 'sqlite',
    query: step.starter?.sqlite || step.solution?.sqlite || '',
    autorun: true,
    sqliteSafe: true
  });
  const status = state?.completed[step.id];

  const article = createElement('article', { className: 'keyword-card', attrs: { 'data-step': step.id, tabindex: '-1' } });
  const head = createElement('div', { className: 'card-head' });
  const title = createElement('h3', { text: step.title || `Step ${idx + 1}` });
  const meta = createElement('div', { className: 'card-meta' }, [
    createBadge(step.level || '', 'badge'),
    createBadge(status ? 'Completato' : 'Da fare', status ? 'badge success' : 'badge neutral')
  ]);
  head.appendChild(title);
  head.appendChild(meta);
  article.appendChild(head);

  const goal = createElement('p', { className: 'muted', text: step.goal || '' });
  article.appendChild(goal);

  if (step.hint) {
    const hint = createElement('p');
    const strong = createElement('strong', { text: 'Hint: ' });
    hint.appendChild(strong);
    hint.appendChild(document.createTextNode(step.hint));
    article.appendChild(hint);
  }

  const topicsWrap = createElement('div', { className: 'keyword-points' });
  (step.topics || []).forEach((t) => topicsWrap.appendChild(createBadge(t, 'badge neutral')));
  article.appendChild(topicsWrap);

  const editor = createElement('textarea', {
    className: 'guided-editor',
    attrs: { 'data-editor': step.id, rows: '7', spellcheck: 'false' }
  });
  editor.value = step.starter?.sqlite || '';
  article.appendChild(editor);

  const controls = createElement('div', { className: 'controls-row' });
  const runBtn = createElement('button', { className: 'btn btn-primary', text: 'Esegui e verifica', attrs: { type: 'button', 'data-run': step.id } });
  const openBtn = createElement('a', { className: 'btn btn-secondary', text: 'Apri nel Playground', attrs: { href: url } });
  const solutionBtn = createElement('button', { className: 'btn btn-secondary', text: 'Mostra soluzione', attrs: { type: 'button', 'data-solution': step.id } });
  controls.appendChild(runBtn);
  controls.appendChild(openBtn);
  controls.appendChild(solutionBtn);
  article.appendChild(controls);

  const resultBox = createElement('div', { className: 'result-container', attrs: { 'data-result': step.id } }, [
    createElement('p', { className: 'placeholder', text: 'Esegui per vedere output.' })
  ]);
  article.appendChild(resultBox);

  const solutionBox = createElement('div', { className: 'result-container', attrs: { 'data-solution-block': step.id, hidden: '' } });
  const solutionPre = createElement('pre');
  solutionPre.textContent = step.solution?.sqlite || '';
  solutionBox.appendChild(solutionPre);
  article.appendChild(solutionBox);

  return article;
}

function render() {
  if (!dom.list) return;
  const state = loadProgress();
  dom.list.replaceChildren(...GUIDED_STEPS.map((s, idx) => renderStep(s, idx, state)));
  renderProgress();
}

function updateStepStatus(stepId, success) {
  const card = dom.list?.querySelector(`[data-step="${stepId}"]`);
  if (!card) return;
  const badge = card.querySelector('.card-meta .badge:nth-child(2)') || card.querySelector('.card-meta .badge.success,.card-meta .badge.neutral');
  if (badge) {
    badge.textContent = success ? 'Completato' : 'Da fare';
    badge.className = success ? 'badge success' : 'badge neutral';
  }
}

async function handleRun(stepId) {
  const step = GUIDED_STEPS.find((s) => s.id === stepId);
  if (!step) return;
  const editor = dom.list.querySelector(`[data-editor="${stepId}"]`);
  const resultBox = dom.list.querySelector(`[data-result="${stepId}"]`);
  if (!editor || !resultBox) return;
  const sql = editor.value.trim();
  if (!sql) {
    showToast('Inserisci una query da eseguire');
    return;
  }
  const progress = loadProgress();
  progress.lastStep = stepId;
  saveProgress(progress);
  try {
    const expected = await ensureExpected(step);
    const { result } = await engine.execute(sql);
    const first = result[0] || { columns: [], values: [] };
    renderTable(resultBox, { columns: first.columns || [], rows: first.values || [] });
    const sig = await hashRows({ columns: first.columns || [], rows: first.values || [] }, step.ignoreOrder);
    const ok = expected === sig;
    progress.completed = progress.completed || {};
    progress.completed[stepId] = { ts: Date.now(), attempts: (progress.completed[stepId]?.attempts || 0) + 1, ok };
    if (!ok) delete progress.completed[stepId];
    saveProgress(progress);
    updateStepStatus(stepId, ok);
    renderProgress();
    showToast(ok ? 'Verifica superata!' : 'Output diverso dall\'atteso.');
  } catch (err) {
    clear(resultBox);
    const pre = document.createElement('pre');
    pre.className = 'error-block';
    pre.textContent = err.message || String(err);
    resultBox.appendChild(pre);
    showToast('Errore durante l\'esecuzione');
  }
}

function handleSolutionToggle(stepId) {
  const block = dom.list.querySelector(`[data-solution-block="${stepId}"]`);
  if (block) block.hidden = !block.hidden;
  const progress = loadProgress();
  progress.lastStep = stepId;
  saveProgress(progress);
}

function resumeStep() {
  const state = loadProgress();
  const hasLast = state.lastStep && GUIDED_STEPS.find((s) => s.id === state.lastStep);
  const fallback = GUIDED_STEPS.find((s) => !state.completed?.[s.id]) || GUIDED_STEPS[0];
  const targetId = hasLast ? state.lastStep : fallback?.id;
  if (!targetId) return;
  const card = dom.list?.querySelector(`[data-step="${targetId}"]`);
  if (card) {
    card.focus({ preventScroll: true });
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function wireEvents() {
  dom.list?.addEventListener('click', (e) => {
    const runBtn = e.target.closest('[data-run]');
    const solBtn = e.target.closest('[data-solution]');
    if (runBtn) handleRun(runBtn.dataset.run);
    if (solBtn) handleSolutionToggle(solBtn.dataset.solution);
  });
  if (dom.reset) {
    dom.reset.addEventListener('click', () => {
      localStorage.removeItem(progressKey);
      render();
      showToast('Progress azzerato');
    });
  }
  if (dom.resume) {
    dom.resume.addEventListener('click', resumeStep);
  }
}

async function init() {
  cacheDom();
  render();
  try {
    engine = await createEngine();
    if (dom.count) dom.count.classList.remove('neutral');
  } catch (err) {
    showToast(err.message || String(err));
    return;
  }
  wireEvents();
}

document.addEventListener('DOMContentLoaded', init);
