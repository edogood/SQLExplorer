const SYNTAX_TOPICS = [
  {
    title: "SELECT + WHERE + ORDER + LIMIT/TOP",
    summary: "Query base con filtro, ordinamento e riduzione righe.",
    args: ["colonne", "tabella", "condizione", "ordinamento", "limite righe"],
    snippets: {
      sqlite: "SELECT id, name\nFROM customers\nWHERE segment = 'Enterprise'\nORDER BY credit_limit DESC\nLIMIT 20;",
      postgresql: "SELECT id, name\nFROM customers\nWHERE segment = 'Enterprise'\nORDER BY credit_limit DESC\nLIMIT 20;",
      sqlserver: "SELECT TOP 20 id, name\nFROM customers\nWHERE segment = 'Enterprise'\nORDER BY credit_limit DESC;"
    }
  },
  {
    title: "JOIN",
    summary: "Combinazione di tabelle su chiavi relazionali.",
    args: ["tabella sinistra", "tabella destra", "condizione ON"],
    snippets: {
      sqlite: "SELECT o.id, c.name\nFROM orders o\nJOIN customers c ON c.id = o.customer_id;",
      postgresql: "SELECT o.id, c.name\nFROM orders o\nINNER JOIN customers c ON c.id = o.customer_id;",
      sqlserver: "SELECT o.id, c.name\nFROM orders o\nINNER JOIN customers c ON c.id = o.customer_id;"
    }
  },
  {
    title: "GROUP BY + HAVING",
    summary: "Aggregazione per dimensioni e filtro sui gruppi.",
    args: ["chiavi di gruppo", "funzioni aggregate", "condizione HAVING"],
    snippets: {
      sqlite: "SELECT c.segment, ROUND(SUM(o.total_amount), 2) AS revenue\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nGROUP BY c.segment\nHAVING SUM(o.total_amount) > 100000;",
      postgresql: "SELECT c.segment, ROUND(SUM(o.total_amount), 2) AS revenue\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nGROUP BY c.segment\nHAVING SUM(o.total_amount) > 100000;",
      sqlserver: "SELECT c.segment, ROUND(SUM(o.total_amount), 2) AS revenue\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nGROUP BY c.segment\nHAVING SUM(o.total_amount) > 100000;"
    }
  },
  {
    title: "CTE (WITH)",
    summary: "Scomposizione query in blocchi logici riutilizzabili.",
    args: ["nome CTE", "query CTE", "query finale"],
    snippets: {
      sqlite: "WITH monthly AS (\n  SELECT substr(order_date, 1, 7) AS ym, SUM(total_amount) AS revenue\n  FROM orders\n  GROUP BY substr(order_date, 1, 7)\n)\nSELECT * FROM monthly ORDER BY ym;",
      postgresql: "WITH monthly AS (\n  SELECT to_char(CAST(order_date AS date), 'YYYY-MM') AS ym, SUM(total_amount) AS revenue\n  FROM orders\n  GROUP BY to_char(CAST(order_date AS date), 'YYYY-MM')\n)\nSELECT * FROM monthly ORDER BY ym;",
      sqlserver: "WITH monthly AS (\n  SELECT LEFT(order_date, 7) AS ym, SUM(total_amount) AS revenue\n  FROM orders\n  GROUP BY LEFT(order_date, 7)\n)\nSELECT * FROM monthly ORDER BY ym;"
    }
  },
  {
    title: "Window Functions",
    summary: "Calcolo analitico senza perdere il dettaglio riga.",
    args: ["funzione finestra", "PARTITION BY", "ORDER BY", "frame opzionale"],
    snippets: {
      sqlite: "SELECT customer_id,\n       total_amount,\n       LAG(total_amount) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev_amount\nFROM orders;",
      postgresql: "SELECT customer_id,\n       total_amount,\n       LAG(total_amount) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev_amount\nFROM orders;",
      sqlserver: "SELECT customer_id,\n       total_amount,\n       LAG(total_amount) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev_amount\nFROM orders;"
    }
  },
  {
    title: "CAST / CONVERT / TRY_CONVERT",
    summary: "Conversione tipi con differenze di dialetto.",
    args: ["tipo destinazione", "espressione da convertire"],
    snippets: {
      sqlite: "SELECT CAST(total_amount AS INTEGER) AS total_int,\n       CONVERT('TEXT', total_amount) AS total_text,\n       TRY_CONVERT('REAL', total_amount) AS total_real\nFROM orders;",
      postgresql: "SELECT CAST(total_amount AS INTEGER) AS total_int,\n       total_amount::text AS total_text,\n       CAST(total_amount AS NUMERIC) AS total_real\nFROM orders;",
      sqlserver: "SELECT CAST(total_amount AS INT) AS total_int,\n       CONVERT(VARCHAR(50), total_amount) AS total_text,\n       TRY_CONVERT(FLOAT, total_amount) AS total_real\nFROM orders;"
    }
  },
  {
    title: "INSERT / UPDATE / DELETE",
    summary: "Manipolazione dati operativa.",
    args: ["tabella target", "colonne/valori", "WHERE in update/delete"],
    snippets: {
      sqlite: "INSERT INTO customer_notes (customer_id, note_date, note_type, note_text, author_employee_id)\nVALUES (1, '2026-02-01', 'followup', 'Customer requested renewal', 2);\n\nUPDATE products SET is_active = 0 WHERE stock = 0;\n\nDELETE FROM customer_notes WHERE note_type = 'obsolete';",
      postgresql: "INSERT INTO customer_notes (customer_id, note_date, note_type, note_text, author_employee_id)\nVALUES (1, '2026-02-01', 'followup', 'Customer requested renewal', 2);\n\nUPDATE products SET is_active = 0 WHERE stock = 0;\n\nDELETE FROM customer_notes WHERE note_type = 'obsolete';",
      sqlserver: "INSERT INTO customer_notes (customer_id, note_date, note_type, note_text, author_employee_id)\nVALUES (1, '2026-02-01', 'followup', 'Customer requested renewal', 2);\n\nUPDATE products SET is_active = 0 WHERE stock = 0;\n\nDELETE FROM customer_notes WHERE note_type = 'obsolete';"
    }
  },
  {
    title: "Transazioni",
    summary: "Atomicita con BEGIN/COMMIT/ROLLBACK.",
    args: ["BEGIN", "query DML", "COMMIT o ROLLBACK"],
    snippets: {
      sqlite: "BEGIN;\nUPDATE products SET price = ROUND(price * 1.01, 2) WHERE category = 'Software';\nCOMMIT;",
      postgresql: "BEGIN;\nUPDATE products SET price = ROUND(price * 1.01, 2) WHERE category = 'Software';\nCOMMIT;",
      sqlserver: "BEGIN TRANSACTION;\nUPDATE products SET price = ROUND(price * 1.01, 2) WHERE category = 'Software';\nCOMMIT TRANSACTION;"
    }
  },
  {
    title: "CREATE TABLE",
    summary: "Definizione schema con vincoli principali.",
    args: ["nome tabella", "colonne", "tipi", "vincoli PK/FK/UNIQUE/CHECK"],
    snippets: {
      sqlite: "CREATE TABLE audit_log (\n  id INTEGER PRIMARY KEY,\n  entity TEXT NOT NULL,\n  event_type TEXT NOT NULL,\n  created_at TEXT NOT NULL\n);",
      postgresql: "CREATE TABLE audit_log (\n  id BIGSERIAL PRIMARY KEY,\n  entity TEXT NOT NULL,\n  event_type TEXT NOT NULL,\n  created_at TIMESTAMP NOT NULL\n);",
      sqlserver: "CREATE TABLE audit_log (\n  id BIGINT IDENTITY(1,1) PRIMARY KEY,\n  entity NVARCHAR(120) NOT NULL,\n  event_type NVARCHAR(80) NOT NULL,\n  created_at DATETIME2 NOT NULL\n);"
    }
  },
  {
    title: "ALTER TABLE",
    summary: "Evoluzione schema senza ricreare tabella.",
    args: ["tabella", "operazione", "colonna o vincolo"],
    snippets: {
      sqlite: "ALTER TABLE customers ADD COLUMN churn_risk REAL;",
      postgresql: "ALTER TABLE customers ADD COLUMN churn_risk NUMERIC(5,2);",
      sqlserver: "ALTER TABLE customers ADD churn_risk DECIMAL(5,2);"
    }
  },
  {
    title: "EXPLAIN / QUERY PLAN",
    summary: "Diagnostica piani esecuzione e uso indici.",
    args: ["query target"],
    snippets: {
      sqlite: "EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 10;",
      postgresql: "EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 10;",
      sqlserver: "SET SHOWPLAN_TEXT ON;\nSELECT * FROM orders WHERE customer_id = 10;\nSET SHOWPLAN_TEXT OFF;"
    }
  }
];

const syntaxDom = {};

document.addEventListener("DOMContentLoaded", () => {
  syntaxDom.search = document.getElementById("syntaxSearch");
  syntaxDom.dialect = document.getElementById("syntaxDialect");
  syntaxDom.list = document.getElementById("syntaxList");
  syntaxDom.live = document.getElementById("syntaxLive");

  syntaxDom.search.addEventListener("input", renderSyntaxList);
  syntaxDom.dialect.addEventListener("change", renderSyntaxList);
  syntaxDom.list.addEventListener("click", handleSyntaxActions);
  renderSyntaxList();
  window.addEventListener("hashchange", focusAnchorIfPresent);
});

function renderSyntaxList() {
  const term = (syntaxDom.search.value || "").trim().toLowerCase();
  const dialect = syntaxDom.dialect.value || "sqlite";

  const filtered = SYNTAX_TOPICS.filter((topic) => {
    const blob = [
      topic.title,
      topic.summary,
      ...(topic.args || []),
      topic.snippets.sqlite,
      topic.snippets.postgresql,
      topic.snippets.sqlserver
    ].join(" ").toLowerCase();
    return !term || blob.includes(term);
  });

  if (!filtered.length) {
    syntaxDom.list.innerHTML = '<p class="info-block">Nessuna sintassi trovata.</p>';
    announceLive("Nessun match nella ricerca sintassi.");
    return;
  }

  syntaxDom.list.innerHTML = filtered.map((topic) => {
    const args = (topic.args || []).map((arg) => `<li>${escapeHtml(arg)}</li>`).join("");
    const snippet = topic.snippets[dialect] || topic.snippets.sqlite;
    const slug = slugify(topic.title);
    return `
      <article class="syntax-page-card" id="${slug}" tabindex="-1">
        <h3><a href="#${slug}">${escapeHtml(topic.title)}</a></h3>
        <p class="muted">${escapeHtml(topic.summary)}</p>
        <h4 class="keyword-subtitle">Argomenti</h4>
        <ul class="keyword-points">${args}</ul>
        <pre><code>${escapeHtml(snippet)}</code></pre>
        <div class="syntax-actions">
          <button class="btn btn-secondary" type="button" data-copy="${encodeURIComponent(snippet)}">Copia snippet</button>
          <a class="btn btn-primary" href="${buildPlaygroundLink(dialect, snippet)}">Apri nel Playground</a>
        </div>
      </article>
    `;
  }).join("");

  announceLive(`Risultati mostrati: ${filtered.length}.`);
  focusAnchorIfPresent();
}

function handleSyntaxActions(event) {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  const snippet = decodeURIComponent(button.dataset.copy || "");
  navigator.clipboard.writeText(snippet).then(() => {
    announceLive("Snippet copiato negli appunti.");
  });
}

function buildPlaygroundLink(dialect, snippet) {
  const params = new URLSearchParams({ dialect, q: snippet, autorun: "1" });
  return `playground.html?${params.toString()}`;
}

function focusAnchorIfPresent() {
  const hash = window.location.hash.replace("#", "");
  if (!hash) return;
  const target = document.getElementById(hash);
  if (target) target.focus();
}

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function announceLive(message) {
  if (syntaxDom.live) {
    syntaxDom.live.textContent = message;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
