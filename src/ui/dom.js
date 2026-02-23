export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function createElement(tag, { className = '', text = '', attrs = {} } = {}, children = []) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  Object.entries(attrs).forEach(([k, v]) => {
    if (v !== undefined && v !== null) el.setAttribute(k, v);
  });
  children.forEach((child) => el.appendChild(child));
  return el;
}

export function renderTable(container, data) {
  if (!container) return;
  container.innerHTML = '';
  if (!data || !data.columns || !data.columns.length) {
    container.appendChild(createElement('p', { className: 'muted', text: 'Nessun dato' }));
    return;
  }

  const table = createElement('table', { className: 'sql-table' });
  const thead = createElement('thead');
  const headRow = createElement('tr');
  data.columns.forEach((col) => {
    headRow.appendChild(createElement('th', { text: col }));
  });
  thead.appendChild(headRow);

  const tbody = createElement('tbody');
  (data.rows || []).forEach((row) => {
    const tr = createElement('tr');
    row.forEach((value) => tr.appendChild(createElement('td', { text: value ?? '' })));
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);
}

export function clear(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}
