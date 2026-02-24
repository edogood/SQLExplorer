import { createEngine } from '../core/engine.js';
import { GUIDED_STEPS } from '../data/guided-data.js';
import { buildPlaygroundUrl } from '../ui/links.js';
import { escapeHtml, renderTable } from '../ui/dom.js';
import { showToast } from '../ui/toast.js';

const dom = {};
let engine = null;
const progressKey = 'guided_progress_v1';
const expectedCache = new Map();

function cacheDom() {
  dom.list = document.getElementById('guidedList');
  dom.count = document.getElementById('guidedCount');
  dom.reset = document.getElementById('resetProgressBtn');
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(progressKey)) || { completed: {} };
  } catch (e) {
    return { completed: {} };
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
}

function renderStep(step, idx, state) {
  const url = buildPlaygroundUrl({ dialect: 'sqlite', query: step.starter?.sqlite || step.solution?.sqlite || '', autorun: true });
  const status = state?.completed[step.id];
  const badge = status ? `<span class="badge success">Completato</span>` : `<span class="badge neutral">Da fare</span>`;
  const topics = (step.topics || []).map((t) => `<span class="badge neutral">${escapeHtml(t)}</span>`).join(' ');
  return `
    <article class="keyword-card" data-step="${step.id}">
      <div class="card-head">
        <h3>${escapeHtml(step.title || `Step ${idx + 1}`)}</h3>
        <div class="card-meta">
          <span class="badge">${escapeHtml(step.level || '')}</span>
          ${badge}
        </div>
      </div>
      <p class="muted">${escapeHtml(step.goal || '')}</p>
      ${step.hint ? `<p><strong>Hint:</strong> ${escapeHtml(step.hint)}</p>` : ''}
      <div class="keyword-points">${topics}</div>
      <textarea class="guided-editor" data-editor="${step.id}" rows="7" spellcheck="false">${step.starter?.sqlite || ''}</textarea>
      <div class="controls-row">
        <button class="btn btn-primary" type="button" data-run="${step.id}">Esegui &amp; verifica</button>
        <a class="btn btn-secondary" href="${url}">Apri nel Playground</a>
        <button class="btn btn-secondary" type="button" data-solution="${step.id}">Mostra soluzione</button>
      </div>
      <div class="result-container" data-result="${step.id}"><p class="placeholder">Esegui per vedere output.</p></div>
      <div class="result-container" data-solution-block="${step.id}" hidden>
        <pre>${escapeHtml(step.solution?.sqlite || '')}</pre>
      </div>
    </article>
  `;
}

function render() {
  if (!dom.list) return;
  const state = loadProgress();
  dom.list.innerHTML = GUIDED_STEPS.map((s, idx) => renderStep(s, idx, state)).join('');
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
  try {
    const expected = await ensureExpected(step);
    const { result } = await engine.execute(sql);
    const first = result[0] || { columns: [], values: [] };
    renderTable(resultBox, { columns: first.columns || [], rows: first.values || [] });
    const sig = await hashRows({ columns: first.columns || [], rows: first.values || [] }, step.ignoreOrder);
    const ok = expected === sig;
    const progress = loadProgress();
    progress.completed = progress.completed || {};
    progress.completed[stepId] = { ts: Date.now(), attempts: (progress.completed[stepId]?.attempts || 0) + 1, ok };
    if (!ok) delete progress.completed[stepId];
    saveProgress(progress);
    updateStepStatus(stepId, ok);
    renderProgress();
    showToast(ok ? 'Verifica superata!' : 'Output diverso dall\'atteso.');
  } catch (err) {
    resultBox.innerHTML = `<pre class="error-block">${escapeHtml(err.message || String(err))}</pre>`;
    showToast('Errore durante l\'esecuzione');
  }
}

function handleSolutionToggle(stepId) {
  const block = dom.list.querySelector(`[data-solution-block="${stepId}"]`);
  if (block) block.hidden = !block.hidden;
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
