const DIALECTS = {
  sqlite: "SQLite",
  postgresql: "PostgreSQL",
  sqlserver: "SQL Server"
};

const DIALECT_DEFAULT_QUERIES = {
  sqlite: `WITH kpi AS (
  SELECT c.segment,
         o.currency,
         ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount_pct)), 2) AS gross_revenue,
         ROUND(SUM((oi.unit_price - p.cost_price) * oi.quantity), 2) AS gross_margin
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
  WHERE o.status IN ('PAID', 'SHIPPED', 'REFUNDED')
  GROUP BY c.segment, o.currency
)
SELECT segment,
       currency,
       CAST(gross_revenue AS INTEGER) AS revenue_int,
       CONVERT('TEXT', gross_margin) AS margin_text,
       gross_revenue,
       gross_margin
FROM kpi
ORDER BY gross_revenue DESC
LIMIT 25;`,
  postgresql: `WITH kpi AS (
  SELECT c.segment,
         o.currency,
         ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount_pct)), 2) AS gross_revenue,
         ROUND(SUM((oi.unit_price - p.cost_price) * oi.quantity), 2) AS gross_margin
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
  WHERE o.status IN ('PAID', 'SHIPPED', 'REFUNDED')
  GROUP BY c.segment, o.currency
)
SELECT segment,
       currency,
       CAST(gross_revenue AS INTEGER) AS revenue_int,
       gross_margin::text AS margin_text,
       gross_revenue,
       gross_margin
FROM kpi
ORDER BY gross_revenue DESC
LIMIT 25;`,
  sqlserver: `WITH kpi AS (
  SELECT c.segment,
         o.currency,
         ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount_pct)), 2) AS gross_revenue,
         ROUND(SUM((oi.unit_price - p.cost_price) * oi.quantity), 2) AS gross_margin
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
  WHERE o.status IN ('PAID', 'SHIPPED', 'REFUNDED')
  GROUP BY c.segment, o.currency
)
SELECT TOP 25
       segment,
       currency,
       CAST(gross_revenue AS INT) AS revenue_int,
       CONVERT(VARCHAR(50), gross_margin) AS margin_text,
       gross_revenue,
       gross_margin
FROM kpi
ORDER BY gross_revenue DESC;`
};

const DEFAULT_QUERY = DIALECT_DEFAULT_QUERIES.sqlite;

const GUIDED_STEPS = [
  {
    id: "s1",
    title: "Filtro base clienti",
    goal: "Trova i clienti Enterprise ordinati per credit_limit decrescente.",
    hint: "Usa WHERE sul segmento, ORDER BY e LIMIT/TOP.",
    topics: ["SELECT", "WHERE", "ORDER BY", "LIMIT/TOP"],
    starter: {
      sqlite: "SELECT id, name, segment, credit_limit\nFROM customers\n-- TODO: filtra segmento Enterprise\nORDER BY credit_limit DESC\nLIMIT 20;",
      postgresql: "SELECT id, name, segment, credit_limit\nFROM customers\n-- TODO: filtra segmento Enterprise\nORDER BY credit_limit DESC\nLIMIT 20;",
      sqlserver: "SELECT TOP 20 id, name, segment, credit_limit\nFROM customers\n-- TODO: filtra segmento Enterprise\nORDER BY credit_limit DESC;"
    },
    solution: {
      sqlite: "SELECT id, name, segment, credit_limit\nFROM customers\nWHERE segment = 'Enterprise'\nORDER BY credit_limit DESC\nLIMIT 20;",
      postgresql: "SELECT id, name, segment, credit_limit\nFROM customers\nWHERE segment = 'Enterprise'\nORDER BY credit_limit DESC\nLIMIT 20;",
      sqlserver: "SELECT TOP 20 id, name, segment, credit_limit\nFROM customers\nWHERE segment = 'Enterprise'\nORDER BY credit_limit DESC;"
    },
    requiredTokens: ["SELECT", "WHERE", "ORDER BY", "ENTERPRISE"]
  },
  {
    id: "s2",
    title: "Join + aggregazione revenue",
    goal: "Calcola il revenue per segmento e valuta media ordine.",
    hint: "Join customers-orders, poi GROUP BY segment con SUM/AVG.",
    topics: ["JOIN", "GROUP BY", "SUM", "AVG"],
    starter: {
      sqlite: "SELECT c.segment,\n       ROUND(SUM(o.total_amount), 2) AS revenue,\n       ROUND(AVG(o.total_amount), 2) AS avg_order\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.status IN ('PAID','SHIPPED','REFUNDED')\nGROUP BY c.segment\nORDER BY revenue DESC;",
      postgresql: "SELECT c.segment,\n       ROUND(SUM(o.total_amount), 2) AS revenue,\n       ROUND(AVG(o.total_amount), 2) AS avg_order\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.status IN ('PAID','SHIPPED','REFUNDED')\nGROUP BY c.segment\nORDER BY revenue DESC;",
      sqlserver: "SELECT c.segment,\n       ROUND(SUM(o.total_amount), 2) AS revenue,\n       ROUND(AVG(o.total_amount), 2) AS avg_order\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.status IN ('PAID','SHIPPED','REFUNDED')\nGROUP BY c.segment\nORDER BY revenue DESC;"
    },
    solution: {},
    requiredTokens: ["JOIN", "GROUP BY", "SUM", "AVG"]
  },
  {
    id: "s3",
    title: "CTE e trend mensile",
    goal: "Costruisci trend mensile e delta col mese precedente.",
    hint: "CTE monthly + LAG OVER (ORDER BY mese).",
    topics: ["WITH", "LAG", "OVER", "ORDER BY"],
    starter: {
      sqlite: "WITH monthly AS (\n  SELECT substr(order_date, 1, 7) AS mese,\n         ROUND(SUM(total_amount), 2) AS totale\n  FROM orders\n  WHERE status IN ('PAID','SHIPPED','REFUNDED')\n  GROUP BY substr(order_date, 1, 7)\n)\nSELECT mese,\n       totale,\n       ROUND(totale - LAG(totale) OVER (ORDER BY mese), 2) AS delta\nFROM monthly\nORDER BY mese;",
      postgresql: "WITH monthly AS (\n  SELECT to_char(CAST(order_date AS date), 'YYYY-MM') AS mese,\n         ROUND(SUM(total_amount), 2) AS totale\n  FROM orders\n  WHERE status IN ('PAID','SHIPPED','REFUNDED')\n  GROUP BY to_char(CAST(order_date AS date), 'YYYY-MM')\n)\nSELECT mese,\n       totale,\n       ROUND(totale - LAG(totale) OVER (ORDER BY mese), 2) AS delta\nFROM monthly\nORDER BY mese;",
      sqlserver: "WITH monthly AS (\n  SELECT LEFT(order_date, 7) AS mese,\n         ROUND(SUM(total_amount), 2) AS totale\n  FROM orders\n  WHERE status IN ('PAID','SHIPPED','REFUNDED')\n  GROUP BY LEFT(order_date, 7)\n)\nSELECT mese,\n       totale,\n       ROUND(totale - LAG(totale) OVER (ORDER BY mese), 2) AS delta\nFROM monthly\nORDER BY mese;"
    },
    solution: {},
    requiredTokens: ["WITH", "LAG", "OVER"]
  },
  {
    id: "s4",
    title: "Cast e Convert",
    goal: "Mostra totale ordine come numero intero e come testo nel dialetto attivo.",
    hint: "Usa CAST sempre; CONVERT e TRY_CONVERT sono differenze tipiche SQL Server.",
    topics: ["CAST", "CONVERT", "TRY_CONVERT"],
    starter: {
      sqlite: "SELECT o.id,\n       CAST(o.total_amount AS INTEGER) AS total_int,\n       CONVERT('TEXT', o.total_amount) AS total_text,\n       TRY_CONVERT('REAL', o.total_amount) AS total_real\nFROM orders o\nORDER BY o.total_amount DESC\nLIMIT 20;",
      postgresql: "SELECT o.id,\n       CAST(o.total_amount AS INTEGER) AS total_int,\n       o.total_amount::text AS total_text,\n       CAST(o.total_amount AS NUMERIC) AS total_real\nFROM orders o\nORDER BY o.total_amount DESC\nLIMIT 20;",
      sqlserver: "SELECT TOP 20 o.id,\n       CAST(o.total_amount AS INT) AS total_int,\n       CONVERT(VARCHAR(80), o.total_amount) AS total_text,\n       TRY_CONVERT(FLOAT, o.total_amount) AS total_real\nFROM orders o\nORDER BY o.total_amount DESC;"
    },
    solution: {},
    requiredTokensByDialect: {
      sqlite: ["CAST", "CONVERT", "TRY_CONVERT"],
      postgresql: ["CAST", "::TEXT"],
      sqlserver: ["CAST", "CONVERT", "TRY_CONVERT"]
    }
  },
  {
    id: "s5",
    title: "Transazione con rollback",
    goal: "Simula aumento prezzi software e annulla tutto con ROLLBACK.",
    hint: "BEGIN ... UPDATE ... SELECT di controllo ... ROLLBACK.",
    topics: ["BEGIN", "UPDATE", "ROLLBACK"],
    starter: {
      sqlite: "BEGIN;\nUPDATE products\nSET price = ROUND(price * 1.02, 2)\nWHERE category = 'Software';\nSELECT category, ROUND(AVG(price), 2) AS avg_price\nFROM products\nGROUP BY category;\nROLLBACK;",
      postgresql: "BEGIN;\nUPDATE products\nSET price = ROUND(price * 1.02, 2)\nWHERE category = 'Software';\nSELECT category, ROUND(AVG(price), 2) AS avg_price\nFROM products\nGROUP BY category;\nROLLBACK;",
      sqlserver: "BEGIN TRANSACTION;\nUPDATE products\nSET price = ROUND(price * 1.02, 2)\nWHERE category = 'Software';\nSELECT category, ROUND(AVG(price), 2) AS avg_price\nFROM products\nGROUP BY category;\nROLLBACK TRANSACTION;"
    },
    solution: {},
    requiredTokensByDialect: {
      sqlite: ["BEGIN", "UPDATE", "ROLLBACK"],
      postgresql: ["BEGIN", "UPDATE", "ROLLBACK"],
      sqlserver: ["BEGIN", "UPDATE", "ROLLBACK"]
    }
  }
];

const state = {
  SQL: null,
  db: null,
  keywordIndex: [],
  dialect: "sqlite",
  guidedIndex: 0,
  guidedCompleted: new Set(),
  trainerSelectedKeyword: "",
  trainerCompleted: new Set(),
  trainerFilteredKeywords: [],
  trainerChallengeCache: new Map(),
  autoTimer: null,
  previewTable: "",
  seed: 981245,
  productPricingCache: new Map(),
  queryHistory: [],
  pinnedQueries: [],
  lastResult: null
};

const dom = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  wireEvents();
  applyDialect("sqlite", { preserveEditor: false });
  restoreSessionState();
  initGuidedPath();
  initKeywordExplorer();
  initEngine();
});

function cacheDom() {
  dom.queryInput = document.getElementById("queryInput");
  dom.runQueryBtn = document.getElementById("runQueryBtn");
  dom.resetQueryBtn = document.getElementById("resetQueryBtn");
  dom.regenDataBtn = document.getElementById("regenDataBtn");
  dom.exportSchemaBtn = document.getElementById("exportSchemaBtn");
  dom.dialectSelect = document.getElementById("dialectSelect");
  dom.loadDialectQueryBtn = document.getElementById("loadDialectQueryBtn");
  dom.safeRunBtn = document.getElementById("safeRunBtn");
  dom.explainPlanBtn = document.getElementById("explainPlanBtn");
  dom.formatSqlBtn = document.getElementById("formatSqlBtn");
  dom.exportCsvBtn = document.getElementById("exportCsvBtn");
  dom.saveSessionBtn = document.getElementById("saveSessionBtn");
  dom.loadSessionBtn = document.getElementById("loadSessionBtn");
  dom.sessionFileInput = document.getElementById("sessionFileInput");
  dom.executedSqlText = document.getElementById("executedSqlText");
  dom.planContainer = document.getElementById("planContainer");
  dom.planOutput = document.getElementById("planOutput");
  dom.historySelect = document.getElementById("historySelect");
  dom.pinQueryBtn = document.getElementById("pinQueryBtn");
  dom.autoRunToggle = document.getElementById("autoRunToggle");
  dom.resultContainer = document.getElementById("resultContainer");

  dom.dbStatus = document.getElementById("dbStatus");
  dom.execTime = document.getElementById("execTime");
  dom.rowsCount = document.getElementById("rowsCount");
  dom.filterInfo = document.getElementById("filterInfo");
  dom.dialectBadge = document.getElementById("dialectBadge");

  dom.tableSelect = document.getElementById("tableSelect");
  dom.tableMeta = document.getElementById("tableMeta");
  dom.tablePreview = document.getElementById("tablePreview");
  dom.dbVisualizer = document.getElementById("dbVisualizer");
  dom.dbVisualizerMeta = document.getElementById("dbVisualizerMeta");

  dom.customTableName = document.getElementById("customTableName");
  dom.customColumns = document.getElementById("customColumns");
  dom.customRows = document.getElementById("customRows");
  dom.createTableBtn = document.getElementById("createTableBtn");

  dom.keywordSearch = document.getElementById("keywordSearch");
  dom.keywordCategory = document.getElementById("keywordCategory");
  dom.keywordCount = document.getElementById("keywordCount");
  dom.keywordList = document.getElementById("keywordList");

  dom.trainerSearch = document.getElementById("trainerSearch");
  dom.trainerCategory = document.getElementById("trainerCategory");
  dom.trainerProgress = document.getElementById("trainerProgress");
  dom.trainerFiltered = document.getElementById("trainerFiltered");
  dom.trainerList = document.getElementById("trainerList");
  dom.trainerMeta = document.getElementById("trainerMeta");
  dom.trainerMode = document.getElementById("trainerMode");
  dom.trainerTitle = document.getElementById("trainerTitle");
  dom.trainerDescription = document.getElementById("trainerDescription");
  dom.trainerSyntax = document.getElementById("trainerSyntax");
  dom.trainerArguments = document.getElementById("trainerArguments");
  dom.trainerGoal = document.getElementById("trainerGoal");
  dom.trainerFeedback = document.getElementById("trainerFeedback");
  dom.trainerPrevBtn = document.getElementById("trainerPrevBtn");
  dom.trainerLoadStarterBtn = document.getElementById("trainerLoadStarterBtn");
  dom.trainerLoadSolutionBtn = document.getElementById("trainerLoadSolutionBtn");
  dom.trainerCheckBtn = document.getElementById("trainerCheckBtn");
  dom.trainerNextBtn = document.getElementById("trainerNextBtn");

  dom.guidedStepMeta = document.getElementById("guidedStepMeta");
  dom.guidedDialectHint = document.getElementById("guidedDialectHint");
  dom.guidedStepTitle = document.getElementById("guidedStepTitle");
  dom.guidedStepGoal = document.getElementById("guidedStepGoal");
  dom.guidedStepTopics = document.getElementById("guidedStepTopics");
  dom.guidedHint = document.getElementById("guidedHint");
  dom.guidedFeedback = document.getElementById("guidedFeedback");
  dom.guidedTimeline = document.getElementById("guidedTimeline");
  dom.guidedPrevBtn = document.getElementById("guidedPrevBtn");
  dom.guidedLoadBtn = document.getElementById("guidedLoadBtn");
  dom.guidedCheckBtn = document.getElementById("guidedCheckBtn");
  dom.guidedSolutionBtn = document.getElementById("guidedSolutionBtn");
  dom.guidedNextBtn = document.getElementById("guidedNextBtn");
}

function wireEvents() {
  dom.queryInput.value = getDialectDefaultQuery(state.dialect);
  if (dom.dialectSelect) {
    dom.dialectSelect.value = state.dialect;
  }

  dom.runQueryBtn.addEventListener("click", () => runQuery(dom.queryInput.value));
  dom.safeRunBtn.addEventListener("click", () => runQueryWithSafety(dom.queryInput.value));
  dom.explainPlanBtn.addEventListener("click", () => runExplainPlan(dom.queryInput.value));
  dom.formatSqlBtn.addEventListener("click", () => { dom.queryInput.value = formatSql(dom.queryInput.value); });
  dom.exportCsvBtn.addEventListener("click", exportLastResultCsv);
  dom.pinQueryBtn.addEventListener("click", pinCurrentQuery);
  dom.historySelect.addEventListener("change", () => {
    if (dom.historySelect.value) dom.queryInput.value = dom.historySelect.value;
  });
  dom.saveSessionBtn.addEventListener("click", saveSessionToFile);
  dom.loadSessionBtn.addEventListener("click", () => dom.sessionFileInput.click());
  dom.sessionFileInput.addEventListener("change", handleSessionUpload);

  dom.resetQueryBtn.addEventListener("click", () => {
    dom.queryInput.value = getDialectDefaultQuery(state.dialect);
    runQuery(dom.queryInput.value);
  });

  dom.regenDataBtn.addEventListener("click", () => {
    initDemoDatabase();
    runQuery(dom.queryInput.value);
  });

  dom.exportSchemaBtn.addEventListener("click", copySchemaToClipboard);
  dom.loadDialectQueryBtn.addEventListener("click", () => {
    dom.queryInput.value = getDialectDefaultQuery(state.dialect);
    runQuery(dom.queryInput.value);
  });
  dom.dialectSelect.addEventListener("change", () => {
    applyDialect(dom.dialectSelect.value, { preserveEditor: true });
  });

  dom.queryInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runQuery(dom.queryInput.value, { source: "shortcut" });
    }
  });

  dom.queryInput.addEventListener("input", () => {
    if (!dom.autoRunToggle.checked || !state.db) return;
    clearTimeout(state.autoTimer);
    state.autoTimer = setTimeout(() => {
      runQuery(dom.queryInput.value, { source: "auto" });
    }, 350);
  });

  dom.tableSelect.addEventListener("change", () => {
    state.previewTable = dom.tableSelect.value;
    renderTablePreview(state.previewTable);
  });

  dom.createTableBtn.addEventListener("click", createCustomTable);

  Array.from(document.querySelectorAll(".exercise-btn")).forEach((btn) => {
    btn.addEventListener("click", () => {
      dom.queryInput.value = btn.dataset.query;
      runQuery(dom.queryInput.value);
    });
  });

  dom.keywordSearch.addEventListener("input", renderKeywordList);
  dom.keywordCategory.addEventListener("change", renderKeywordList);

  if (dom.trainerSearch && dom.trainerCategory) {
    dom.trainerSearch.addEventListener("input", renderTrainerList);
    dom.trainerCategory.addEventListener("change", renderTrainerList);
    dom.trainerPrevBtn.addEventListener("click", () => moveTrainerKeyword(-1));
    dom.trainerNextBtn.addEventListener("click", () => moveTrainerKeyword(1));
    dom.trainerLoadStarterBtn.addEventListener("click", () => loadTrainerQuery("starter"));
    dom.trainerLoadSolutionBtn.addEventListener("click", () => loadTrainerQuery("solution"));
    dom.trainerCheckBtn.addEventListener("click", checkTrainerKeyword);
  }

  dom.guidedPrevBtn.addEventListener("click", () => moveGuidedStep(-1));
  dom.guidedNextBtn.addEventListener("click", () => moveGuidedStep(1));
  dom.guidedLoadBtn.addEventListener("click", () => loadGuidedStepQuery("starter"));
  dom.guidedSolutionBtn.addEventListener("click", () => loadGuidedStepQuery("solution"));
  dom.guidedCheckBtn.addEventListener("click", checkGuidedStep);
}

function getDialectDefaultQuery(dialect) {
  return DIALECT_DEFAULT_QUERIES[dialect] || DIALECT_DEFAULT_QUERIES.sqlite || DEFAULT_QUERY;
}

function applyDialect(dialect, options = {}) {
  const target = DIALECTS[dialect] ? dialect : "sqlite";
  const preserveEditor = options.preserveEditor ?? true;
  const previousDefault = getDialectDefaultQuery(state.dialect);
  const currentValue = (dom.queryInput?.value || "").trim();

  state.dialect = target;
  if (dom.dialectSelect && dom.dialectSelect.value !== target) {
    dom.dialectSelect.value = target;
  }

  const shouldSwapQuery = !preserveEditor || !currentValue || currentValue === previousDefault.trim();
  if (shouldSwapQuery && dom.queryInput) {
    dom.queryInput.value = getDialectDefaultQuery(target);
  }

  updateDialectBadge();
  if (state.keywordIndex.length) {
    initKeywordExplorer();
  }
  if (dom.guidedStepMeta) {
    renderGuidedStep();
  }
}

function updateDialectBadge() {
  const label = DIALECTS[state.dialect] || DIALECTS.sqlite;
  if (dom.dialectBadge) {
    dom.dialectBadge.textContent = `Dialetto esempi: ${label}`;
  }
  if (dom.guidedDialectHint) {
    dom.guidedDialectHint.textContent = `Dialetto esempi attivo: ${label}`;
  }
}

function initGuidedPath() {
  if (!Number.isFinite(state.guidedIndex)) state.guidedIndex = 0;
  state.guidedIndex = Math.max(0, Math.min(GUIDED_STEPS.length - 1, state.guidedIndex));
  if (!(state.guidedCompleted instanceof Set)) state.guidedCompleted = new Set();
  renderGuidedStep();
}

function renderGuidedStep() {
  if (!GUIDED_STEPS.length) return;

  const step = GUIDED_STEPS[state.guidedIndex];
  dom.guidedStepMeta.textContent = `Step ${state.guidedIndex + 1}/${GUIDED_STEPS.length}`;
  dom.guidedStepTitle.textContent = step.title;
  dom.guidedStepGoal.textContent = step.goal;
  dom.guidedHint.textContent = step.hint;

  dom.guidedStepTopics.innerHTML = (step.topics || [])
    .map((topic) => `<span class="guided-chip">${escapeHtml(topic)}</span>`)
    .join("");

  dom.guidedTimeline.innerHTML = GUIDED_STEPS.map((item, index) => {
    const cls = [
      "guided-step-btn",
      index === state.guidedIndex ? "active" : "",
      state.guidedCompleted.has(item.id) ? "completed" : ""
    ].filter(Boolean).join(" ");
    return `<button class="${cls}" data-step-index="${index}">${index + 1}. ${escapeHtml(item.title)}</button>`;
  }).join("");

  Array.from(dom.guidedTimeline.querySelectorAll(".guided-step-btn")).forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.stepIndex);
      if (!Number.isFinite(index)) return;
      state.guidedIndex = Math.max(0, Math.min(GUIDED_STEPS.length - 1, index));
      renderGuidedStep();
    });
  });

  dom.guidedPrevBtn.disabled = state.guidedIndex <= 0;
  dom.guidedNextBtn.disabled = state.guidedIndex >= GUIDED_STEPS.length - 1;
}

function moveGuidedStep(delta) {
  const next = Math.max(0, Math.min(GUIDED_STEPS.length - 1, state.guidedIndex + delta));
  state.guidedIndex = next;
  renderGuidedStep();
}

function getGuidedVariant(step, field) {
  const variants = step[field] || {};
  return variants[state.dialect] || variants.sqlite || "";
}

function loadGuidedStepQuery(mode) {
  const step = GUIDED_STEPS[state.guidedIndex];
  let query = getGuidedVariant(step, mode);
  if (!query) {
    query = getGuidedVariant(step, "starter");
  }
  dom.queryInput.value = query;
  runQuery(query, { source: "guided" });
}

function getGuidedRequiredTokens(step) {
  if (step.requiredTokensByDialect && step.requiredTokensByDialect[state.dialect]) {
    return step.requiredTokensByDialect[state.dialect];
  }
  return step.requiredTokens || [];
}

function checkGuidedStep() {
  const step = GUIDED_STEPS[state.guidedIndex];
  const query = (dom.queryInput.value || "").trim();
  if (!query) {
    setGuidedFeedback("Query vuota: carica starter o soluzione e modifica la query.", "warn");
    return;
  }

  const outcome = runQuery(query, { source: "guided-check" });
  if (!outcome || !outcome.ok) {
    setGuidedFeedback(`Errore esecuzione: ${outcome?.error || "query non valida"}`, "error");
    return;
  }

  const expected = getStepVerificationExpectations(step);
  const actual = computeResultSignature(outcome.results?.[0] || { columns: [], values: [] });
  const mismatches = expected ? buildVerificationSummary(actual, {
    expectedColumns: expected.columns,
    expectedRowCount: expected.rowCount,
    signature: expected.signature
  }) : [];

  if (mismatches.length) {
    setGuidedFeedback(`Output non corretto: ${mismatches.join(" | ")}`, "warn");
    return;
  }

  const upper = query.toUpperCase();
  const required = getGuidedRequiredTokens(step);
  const missing = required.filter((token) => !hasKeywordToken(upper, token.toUpperCase()));
  if (missing.length) {
    setGuidedFeedback(`Risultato corretto, ma manca il concetto richiesto: ${missing.join(", ")}`, "warn");
    return;
  }

  state.guidedCompleted.add(step.id);
  saveLocalProgress();
  setGuidedFeedback("Step completato correttamente. Puoi passare al successivo.", "success");
  renderGuidedStep();
}

function setGuidedFeedback(message, type) {
  dom.guidedFeedback.textContent = message;
  dom.guidedFeedback.className = `guided-feedback ${type}`;
}

async function initEngine() {
  try {
    setBadge(dom.dbStatus, "Caricamento SQL engine...", "neutral");
    state.SQL = await initSqlJs({
      locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
    });

    initDemoDatabase();
    runQuery(dom.queryInput.value);
  } catch (error) {
    setBadge(dom.dbStatus, "Errore engine SQL", "error");
    dom.resultContainer.innerHTML = `<pre class="error-block">${escapeHtml(error.message)}</pre>`;
  }
}

function initDemoDatabase() {
  if (!state.SQL) return;

  if (state.db) {
    state.db.close();
  }

  state.db = new state.SQL.Database();
  state.seed += 997;
  state.productPricingCache = new Map();

  createSqlFunctions();
  createSchema();

  seedRegions();
  seedDepartments();
  seedEmployees();
  seedSuppliers();
  seedCampaigns();
  seedWarehouses();
  seedCustomers();
  seedProducts();
  const orderContext = seedOrdersAndItems();
  seedPayments(orderContext.orders);
  seedShipments(orderContext.orders);
  seedReturns(orderContext.items);
  seedSupportTickets(orderContext.orders);
  seedCustomerNotes();
  seedInventoryMovements(orderContext.items);

  setBadge(dom.dbStatus, "Database pronto", "success");
  refreshTableSelector();
}

function createSqlFunctions() {
  if (!state.db || typeof state.db.create_function !== "function") return;

  state.db.create_function("CONVERT", (targetType, value) => convertValue(targetType, value, false));
  state.db.create_function("TRY_CONVERT", (targetType, value) => convertValue(targetType, value, true));
  state.db.create_function("SAFE_DIVIDE", (numerator, denominator) => {
    const den = Number(denominator);
    if (!Number.isFinite(den) || den === 0) return null;
    return Number(numerator) / den;
  });
}

function convertValue(targetType, value, softFail) {
  try {
    if (value === null || value === undefined) return null;
    const target = String(targetType || "TEXT").toUpperCase().trim();

    if (["TEXT", "STRING", "CHAR", "NCHAR", "VARCHAR", "NVARCHAR"].includes(target)) {
      return String(value);
    }

    if (["INT", "INTEGER", "BIGINT", "SMALLINT"].includes(target)) {
      const parsed = Number.parseInt(String(value), 10);
      if (!Number.isFinite(parsed)) throw new Error("CONVERT int non valido");
      return parsed;
    }

    if (["REAL", "FLOAT", "DOUBLE", "NUMERIC", "DECIMAL"].includes(target)) {
      const parsed = Number.parseFloat(String(value));
      if (!Number.isFinite(parsed)) throw new Error("CONVERT real non valido");
      return parsed;
    }

    if (["BOOL", "BOOLEAN"].includes(target)) {
      if (typeof value === "string") {
        const normalized = value.toLowerCase().trim();
        if (["1", "true", "yes", "y", "ok"].includes(normalized)) return 1;
        if (["0", "false", "no", "n"].includes(normalized)) return 0;
      }
      return Number(value) ? 1 : 0;
    }

    if (["DATE", "DATETIME", "TIMESTAMP"].includes(target)) {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) throw new Error("CONVERT data non valida");
      return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(parsed.getUTCDate()).padStart(2, "0")}`;
    }

    return String(value);
  } catch (_error) {
    if (softFail) return null;
    throw new Error(`CONVERT fallita verso ${targetType}`);
  }
}

function createSchema() {
  state.db.run("PRAGMA foreign_keys = ON;");

  state.db.run(`
    CREATE TABLE regions (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      market TEXT NOT NULL
    );

    CREATE TABLE departments (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      annual_budget REAL NOT NULL
    );

    CREATE TABLE employees (
      id INTEGER PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      department_id INTEGER NOT NULL,
      manager_id INTEGER,
      title TEXT NOT NULL,
      salary REAL NOT NULL,
      hire_date TEXT NOT NULL,
      employment_type TEXT NOT NULL,
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (manager_id) REFERENCES employees(id)
    );

    CREATE TABLE suppliers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      country TEXT NOT NULL,
      rating REAL NOT NULL,
      payment_terms TEXT NOT NULL
    );

    CREATE TABLE campaigns (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      channel TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      budget REAL NOT NULL,
      status TEXT NOT NULL
    );
  `);

  state.db.run(`
    CREATE TABLE warehouses (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      region_id INTEGER NOT NULL,
      capacity INTEGER NOT NULL,
      FOREIGN KEY (region_id) REFERENCES regions(id)
    );

    CREATE TABLE customers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      region_id INTEGER NOT NULL,
      segment TEXT NOT NULL,
      signup_date TEXT NOT NULL,
      credit_limit REAL NOT NULL,
      tier TEXT NOT NULL,
      FOREIGN KEY (region_id) REFERENCES regions(id)
    );

    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      supplier_id INTEGER NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      price REAL NOT NULL,
      cost_price REAL NOT NULL,
      stock INTEGER NOT NULL,
      launched_at TEXT NOT NULL,
      is_active INTEGER NOT NULL,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );
  `);

  state.db.run(`
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      campaign_id INTEGER,
      order_date TEXT NOT NULL,
      status TEXT NOT NULL,
      currency TEXT NOT NULL,
      channel TEXT NOT NULL,
      discount_amount REAL NOT NULL,
      total_amount REAL NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      warehouse_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount_pct REAL NOT NULL,
      tax_rate REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );

    CREATE TABLE payments (
      id INTEGER PRIMARY KEY,
      order_id INTEGER NOT NULL,
      payment_date TEXT NOT NULL,
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      fx_rate REAL NOT NULL,
      gateway_fee REAL NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
  `);

  state.db.run(`
    CREATE TABLE shipments (
      id INTEGER PRIMARY KEY,
      order_id INTEGER NOT NULL,
      warehouse_id INTEGER NOT NULL,
      carrier TEXT NOT NULL,
      shipped_at TEXT NOT NULL,
      delivered_at TEXT,
      status TEXT NOT NULL,
      tracking_code TEXT NOT NULL UNIQUE,
      shipping_cost REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );

    CREATE TABLE returns (
      id INTEGER PRIMARY KEY,
      order_item_id INTEGER NOT NULL,
      return_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL,
      refund_amount REAL NOT NULL,
      FOREIGN KEY (order_item_id) REFERENCES order_items(id)
    );

    CREATE TABLE inventory_movements (
      id INTEGER PRIMARY KEY,
      product_id INTEGER NOT NULL,
      warehouse_id INTEGER NOT NULL,
      movement_date TEXT NOT NULL,
      movement_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      reference TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );

    CREATE TABLE support_tickets (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      order_id INTEGER,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      opened_at TEXT NOT NULL,
      closed_at TEXT,
      sla_hours INTEGER NOT NULL,
      topic TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE customer_notes (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      note_date TEXT NOT NULL,
      note_type TEXT NOT NULL,
      note_text TEXT NOT NULL,
      author_employee_id INTEGER NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (author_employee_id) REFERENCES employees(id)
    );
  `);
}

function seedRegions() {
  const rows = [
    [1, "Southern Europe", "EMEA"],
    [2, "DACH", "EMEA"],
    [3, "France + Benelux", "EMEA"],
    [4, "Nordics", "EMEA"],
    [5, "Iberia", "EMEA"],
    [6, "UK + Ireland", "EMEA"]
  ];

  const stmt = state.db.prepare("INSERT INTO regions (id, name, market) VALUES (?, ?, ?)");
  rows.forEach((row) => stmt.run(row));
  stmt.free();
}

function seedDepartments() {
  const rows = [
    [1, "Sales", "Milan", 1800000],
    [2, "Support", "Rome", 920000],
    [3, "Operations", "Turin", 1450000],
    [4, "Finance", "Naples", 780000],
    [5, "R&D", "Bologna", 2050000],
    [6, "People", "Florence", 510000],
    [7, "Logistics", "Genoa", 1310000],
    [8, "Marketing", "Verona", 990000]
  ];

  const stmt = state.db.prepare("INSERT INTO departments (id, name, location, annual_budget) VALUES (?, ?, ?, ?)");
  rows.forEach((row) => stmt.run(row));
  stmt.free();
}

function seedEmployees() {
  const firstNames = ["Luca", "Anna", "Marco", "Giulia", "Davide", "Sara", "Paolo", "Elisa", "Franco", "Marta", "Fabio", "Chiara", "Matteo", "Irene", "Dario", "Noemi"];
  const lastNames = ["Rossi", "Bianchi", "Esposito", "Ricci", "Ferrari", "Moretti", "Conti", "Greco", "Romano", "Gallo", "Costa", "Marini", "Fontana", "Villa", "Riva", "Orlando"];
  const titles = ["Account Executive", "Senior Analyst", "Operations Lead", "Data Specialist", "Support Engineer", "Finance Controller", "Product Owner", "Logistics Planner"];
  const employmentTypes = ["FULL_TIME", "FULL_TIME", "FULL_TIME", "PART_TIME", "CONTRACTOR"];
  const stmt = state.db.prepare(
    "INSERT INTO employees (id, first_name, last_name, department_id, manager_id, title, salary, hire_date, employment_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  for (let i = 1; i <= 56; i += 1) {
    const firstName = pick(firstNames);
    const lastName = pick(lastNames);
    const departmentId = randomInt(1, 8);
    const managerId = i <= 10 ? null : randomInt(1, 10);
    const title = pick(titles);
    const salary = randomInt(30000, 128000) + randomInt(0, 99) / 100;
    const hireDate = randomDate("2016-01-01", "2025-11-30");
    const employmentType = pick(employmentTypes);
    stmt.run([i, firstName, lastName, departmentId, managerId, title, salary.toFixed(2), hireDate, employmentType]);
  }

  stmt.free();
}

function seedSuppliers() {
  const names = [
    "Nordic Components", "Atlas Source", "Kappa Industrial", "GreenPulse", "Mistral Electronics", "Coreline Parts",
    "Westbridge Supply", "Blue Harbor Wholesale", "Quantum Semi", "Aria Distribution", "Omnia Logistic Trade", "SilverOak Labs"
  ];
  const countries = ["Italy", "Germany", "Poland", "Czech Republic", "France", "Spain", "Romania", "Netherlands", "Belgium"];
  const paymentTerms = ["NET15", "NET30", "NET30", "NET45", "NET60"];
  const stmt = state.db.prepare(
    "INSERT INTO suppliers (id, name, country, rating, payment_terms) VALUES (?, ?, ?, ?, ?)"
  );

  for (let i = 1; i <= 34; i += 1) {
    const base = pick(names);
    const name = `${base} ${String.fromCharCode(64 + ((i % 26) || 26))}`;
    const country = pick(countries);
    const rating = (randomInt(26, 50) / 10).toFixed(1);
    const terms = pick(paymentTerms);
    stmt.run([i, name, country, rating, terms]);
  }

  stmt.free();
}

function seedCampaigns() {
  const campaignNames = [
    "Winter Renewal", "Black Friday Pro", "Q1 Expansion", "Partner Boost", "New Region Launch", "Cloud Upsell",
    "Retention Sprint", "SMB Starter Push", "Premium Tier Upgrade", "Channel Revamp", "Service Bundle Wave"
  ];
  const channels = ["EMAIL", "SEM", "SOCIAL", "PARTNER", "WEBINAR", "OUTBOUND"];
  const statuses = ["PLANNED", "ACTIVE", "CLOSED", "PAUSED", "ACTIVE", "CLOSED"];
  const stmt = state.db.prepare(
    "INSERT INTO campaigns (id, name, channel, start_date, end_date, budget, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  for (let i = 1; i <= 18; i += 1) {
    const name = `${pick(campaignNames)} ${i}`;
    const channel = pick(channels);
    const start = randomDate("2023-01-01", "2025-11-20");
    const end = randomDate(start, "2026-02-28");
    const budget = randomInt(10000, 280000) + randomInt(0, 99) / 100;
    const status = pick(statuses);
    stmt.run([i, name, channel, start, end, budget.toFixed(2), status]);
  }

  stmt.free();
}

function seedWarehouses() {
  const rows = [
    [1, "WH-Milan-01", "Milan", 1, 120000],
    [2, "WH-Rome-01", "Rome", 1, 90000],
    [3, "WH-Berlin-01", "Berlin", 2, 140000],
    [4, "WH-Madrid-01", "Madrid", 5, 110000],
    [5, "WH-Paris-01", "Paris", 3, 135000],
    [6, "WH-Amsterdam-01", "Amsterdam", 3, 95000],
    [7, "WH-Stockholm-01", "Stockholm", 4, 86000],
    [8, "WH-London-01", "London", 6, 150000]
  ];

  const stmt = state.db.prepare(
    "INSERT INTO warehouses (id, name, city, region_id, capacity) VALUES (?, ?, ?, ?, ?)"
  );
  rows.forEach((row) => stmt.run(row));
  stmt.free();
}

function seedCustomers() {
  const names = [
    "Alba Digital", "Nordic Trade", "Studio Venere", "Delta Retail", "Blue Orbit", "Sfera Group", "Atlas Food", "City Hub",
    "Linea Verde", "Polo Moda", "Start One", "Arco Travel", "Nova Pharma", "Lago Energy", "Pixel Forge", "Terra Lab",
    "Globe Health", "Urban Cargo", "Helix Labs", "Cobalt Network", "Verde Capital", "Signal Core"
  ];
  const countries = ["Italy", "France", "Germany", "Spain", "Portugal", "Netherlands", "Austria", "Belgium", "UK", "Sweden"];
  const cities = ["Milan", "Rome", "Turin", "Naples", "Madrid", "Paris", "Berlin", "Vienna", "Porto", "Brussels", "London", "Stockholm"];
  const segments = ["Enterprise", "Mid-Market", "SMB", "Public", "Startup", "Enterprise", "SMB"];
  const tiers = ["GOLD", "SILVER", "BRONZE", "PLATINUM", "SILVER", "GOLD"];
  const stmt = state.db.prepare(
    "INSERT INTO customers (id, name, email, country, city, region_id, segment, signup_date, credit_limit, tier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  for (let i = 1; i <= 220; i += 1) {
    const base = pick(names);
    const name = `${base} ${String.fromCharCode(64 + ((i % 26) || 26))}`;
    const email = `${slugify(base)}.${i}@demo-sql.test`;
    const country = pick(countries);
    const city = pick(cities);
    const regionId = randomInt(1, 6);
    const segment = pick(segments);
    const signupDate = randomDate("2020-01-01", "2025-12-20");
    const creditLimit = randomInt(1000, 85000) + randomInt(0, 99) / 100;
    const tier = pick(tiers);
    stmt.run([i, name, email, country, city, regionId, segment, signupDate, creditLimit.toFixed(2), tier]);
  }

  stmt.free();
}

function seedProducts() {
  const products = [
    ["Notebook Air", "Hardware"],
    ["Dock USB-C", "Hardware"],
    ["Cloud Plan Basic", "Software"],
    ["Cloud Plan Pro", "Software"],
    ["Monitor 27", "Hardware"],
    ["Headset Pro", "Accessories"],
    ["Mouse Slim", "Accessories"],
    ["Security Audit", "Services"],
    ["Onboarding Pack", "Services"],
    ["Automation Suite", "Software"],
    ["Keyboard Mech", "Accessories"],
    ["Server Blade", "Hardware"],
    ["Data Backup", "Services"],
    ["Analytics Plus", "Software"],
    ["Edge Router", "Hardware"],
    ["Storage Node", "Hardware"],
    ["API Gateway Pack", "Software"],
    ["Warranty Plus", "Services"]
  ];

  const stmt = state.db.prepare(
    "INSERT INTO products (id, name, category, supplier_id, sku, price, cost_price, stock, launched_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (let i = 1; i <= 180; i += 1) {
    const [name, category] = pick(products);
    const supplierId = randomInt(1, 34);
    const price = randomInt(15, 2600) + randomInt(0, 99) / 100;
    const margin = 0.38 + seededRandom() * 0.36;
    const cost = Math.max(5, price * (1 - margin));
    const stock = randomInt(0, 1600);
    const sku = `SKU-${String(i).padStart(4, "0")}-${randomInt(10, 99)}`;
    const launchedAt = randomDate("2019-01-01", "2026-01-20");
    const isActive = randomInt(0, 100) < 88 ? 1 : 0;
    stmt.run([i, `${name} ${i}`, category, supplierId, sku, price.toFixed(2), cost.toFixed(2), stock, launchedAt, isActive]);
    state.productPricingCache.set(i, { price, cost });
  }
  stmt.free();
}

function seedOrdersAndItems() {
  const orders = [];
  const items = [];

  const orderStmt = state.db.prepare(
    "INSERT INTO orders (id, customer_id, employee_id, campaign_id, order_date, status, currency, channel, discount_amount, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const orderUpdateStmt = state.db.prepare(
    "UPDATE orders SET discount_amount = ?, total_amount = ? WHERE id = ?"
  );
  const itemStmt = state.db.prepare(
    "INSERT INTO order_items (id, order_id, product_id, warehouse_id, quantity, unit_price, discount_pct, tax_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const statuses = ["NEW", "SHIPPED", "PAID", "CANCELLED", "PAID", "SHIPPED", "PAID", "REFUNDED"];
  const currencies = ["EUR", "EUR", "EUR", "USD", "GBP"];
  const channels = ["WEB", "MOBILE", "B2B", "RESELLER", "INSIDE_SALES"];

  let itemId = 1;

  for (let orderId = 1; orderId <= 760; orderId += 1) {
    const customerId = randomInt(1, 220);
    const employeeId = randomInt(1, 56);
    const campaignId = randomInt(0, 100) < 62 ? randomInt(1, 18) : null;
    const orderDate = randomDate("2023-01-01", "2026-02-10");
    const status = pick(statuses);
    const currency = pick(currencies);
    const channel = pick(channels);

    orderStmt.run([orderId, customerId, employeeId, campaignId, orderDate, status, currency, channel, 0, 0]);

    const itemCount = randomInt(1, 6);
    let total = 0;

    for (let i = 0; i < itemCount; i += 1) {
      const productId = randomInt(1, 180);
      const warehouseId = randomInt(1, 8);
      const quantity = randomInt(1, 9);
      const pricing = getProductPricing(productId);
      const unitPrice = pricing.price * (0.9 + seededRandom() * 0.25);
      const discountPct = Number((randomInt(0, 22) / 100).toFixed(2));
      const taxRate = pick([0.04, 0.1, 0.22]);
      const lineBase = quantity * unitPrice * (1 - discountPct);
      const lineTotal = lineBase * (1 + taxRate);
      total += lineTotal;

      itemStmt.run([itemId, orderId, productId, warehouseId, quantity, unitPrice.toFixed(2), discountPct.toFixed(2), taxRate.toFixed(2)]);
      items.push({
        id: itemId,
        orderId,
        productId,
        warehouseId,
        quantity,
        unitPrice,
        orderDate,
        orderStatus: status
      });
      itemId += 1;
    }

    const discountAmount = total * (randomInt(0, 12) / 100);
    let finalTotal = Math.max(total - discountAmount, 0);
    if (status === "CANCELLED") {
      finalTotal = 0;
    }

    orderUpdateStmt.run([discountAmount.toFixed(2), finalTotal.toFixed(2), orderId]);
    orders.push({ id: orderId, customerId, status, currency, channel, orderDate, totalAmount: finalTotal });
  }

  orderStmt.free();
  orderUpdateStmt.free();
  itemStmt.free();
  return { orders, items };
}

function getProductPricing(productId) {
  if (state.productPricingCache.has(productId)) {
    return state.productPricingCache.get(productId);
  }

  const result = state.db.exec(`SELECT price, cost_price FROM products WHERE id = ${Number(productId)} LIMIT 1`);
  if (!result.length || !result[0].values.length) return { price: 0, cost: 0 };

  const row = result[0].values[0];
  const pricing = { price: Number(row[0]), cost: Number(row[1]) };
  state.productPricingCache.set(productId, pricing);
  return pricing;
}

function seedPayments(orderRows) {
  const methods = ["CARD", "WIRE", "PAYPAL", "SEPA", "APPLE_PAY", "CARD"];
  const statuses = ["SETTLED", "SETTLED", "PENDING", "SETTLED", "FAILED"];
  const stmt = state.db.prepare(
    "INSERT INTO payments (id, order_id, payment_date, method, amount, fx_rate, gateway_fee, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  let paymentId = 1;
  orderRows.forEach((order) => {
    if (order.status === "CANCELLED" || order.totalAmount <= 0) return;
    const splitCount = order.totalAmount > 9000 && randomInt(0, 100) < 28 ? 2 : 1;

    for (let i = 0; i < splitCount; i += 1) {
      const baseAmount = order.totalAmount / splitCount;
      const fxRate = order.currency === "EUR"
        ? 1
        : order.currency === "USD"
          ? Number((0.86 + seededRandom() * 0.1).toFixed(4))
          : Number((1.08 + seededRandom() * 0.12).toFixed(4));
      const gatewayFee = baseAmount * (0.008 + seededRandom() * 0.02);
      const paymentStatus = order.status === "REFUNDED" && i === splitCount - 1 ? "SETTLED" : pick(statuses);

      stmt.run([
        paymentId,
        order.id,
        randomDate(order.orderDate, "2026-02-21"),
        pick(methods),
        baseAmount.toFixed(2),
        fxRate,
        gatewayFee.toFixed(2),
        paymentStatus
      ]);
      paymentId += 1;
    }
  });

  stmt.free();
}

function seedShipments(orderRows) {
  const carriers = ["DHL", "UPS", "BRT", "FedEx", "GLS", "DPD"];
  const statuses = ["DELIVERED", "IN_TRANSIT", "DELIVERED", "DELIVERED", "HOLD"];
  const stmt = state.db.prepare(
    "INSERT INTO shipments (id, order_id, warehouse_id, carrier, shipped_at, delivered_at, status, tracking_code, shipping_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  let shipmentId = 1;

  orderRows.forEach((order) => {
    if (!["SHIPPED", "PAID", "REFUNDED"].includes(order.status)) return;
    if (order.totalAmount <= 0) return;
    if (order.status === "PAID" && randomInt(0, 100) < 24) return;

    const shippedAt = randomDate(order.orderDate, "2026-02-21");
    const status = pick(statuses);
    const deliveredAt = status === "DELIVERED" ? randomDate(shippedAt, "2026-02-22") : null;
    const tracking = `TRK-${String(order.id).padStart(5, "0")}-${String(shipmentId).padStart(4, "0")}`;
    const shippingCost = randomInt(5, 80) + randomInt(0, 99) / 100;

    stmt.run([
      shipmentId,
      order.id,
      randomInt(1, 8),
      pick(carriers),
      shippedAt,
      deliveredAt,
      status,
      tracking,
      shippingCost.toFixed(2)
    ]);
    shipmentId += 1;
  });

  stmt.free();
}

function seedReturns(orderItems) {
  const reasons = ["Damaged", "Wrong item", "Late delivery", "No longer needed", "Quality issue"];
  const statuses = ["REQUESTED", "APPROVED", "REFUNDED", "REJECTED", "REFUNDED"];
  const stmt = state.db.prepare(
    "INSERT INTO returns (id, order_item_id, return_date, reason, status, refund_amount) VALUES (?, ?, ?, ?, ?, ?)"
  );

  let returnId = 1;
  orderItems.forEach((item) => {
    if (!["PAID", "SHIPPED", "REFUNDED"].includes(item.orderStatus)) return;
    if (randomInt(0, 100) > 11) return;

    const status = pick(statuses);
    const returnDate = randomDate(item.orderDate, "2026-02-22");
    const refundAmount = item.quantity * item.unitPrice * (0.25 + seededRandom() * 0.75);

    stmt.run([returnId, item.id, returnDate, pick(reasons), status, refundAmount.toFixed(2)]);
    returnId += 1;
  });

  stmt.free();
}

function seedSupportTickets(orderRows) {
  const priorities = ["LOW", "MEDIUM", "MEDIUM", "HIGH", "URGENT"];
  const statuses = ["OPEN", "CLOSED", "PENDING", "ESCALATED", "CLOSED", "CLOSED"];
  const topics = ["Shipping delay", "Invoice mismatch", "Refund request", "Technical issue", "Contract question", "Wrong quantity"];
  const stmt = state.db.prepare(
    "INSERT INTO support_tickets (id, customer_id, order_id, priority, status, opened_at, closed_at, sla_hours, topic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  for (let ticketId = 1; ticketId <= 380; ticketId += 1) {
    const refOrder = orderRows[randomInt(0, orderRows.length - 1)];
    const status = pick(statuses);
    const opened = randomDate(refOrder.orderDate, "2026-02-20");
    const closed = status === "CLOSED" ? randomDate(opened, "2026-02-22") : null;
    const slaHours = pick([24, 48, 72, 96]);
    stmt.run([
      ticketId,
      refOrder.customerId,
      refOrder.id,
      pick(priorities),
      status,
      opened,
      closed,
      slaHours,
      pick(topics)
    ]);
  }

  stmt.free();
}

function seedCustomerNotes() {
  const noteTypes = ["upsell", "risk", "health", "followup", "complaint", "renewal"];
  const fragments = ["requested custom pricing", "asked for enterprise SLA", "reported delayed invoice", "wants training bundle", "needs legal review", "prefers quarterly billing"];
  const stmt = state.db.prepare(
    "INSERT INTO customer_notes (id, customer_id, note_date, note_type, note_text, author_employee_id) VALUES (?, ?, ?, ?, ?, ?)"
  );

  for (let noteId = 1; noteId <= 460; noteId += 1) {
    const noteType = pick(noteTypes);
    const text = `Customer ${pick(fragments)} (${noteType})`;
    stmt.run([
      noteId,
      randomInt(1, 220),
      randomDate("2022-01-01", "2026-02-20"),
      noteType,
      text,
      randomInt(1, 56)
    ]);
  }

  stmt.free();
}

function seedInventoryMovements(orderItems) {
  const stmt = state.db.prepare(
    "INSERT INTO inventory_movements (id, product_id, warehouse_id, movement_date, movement_type, quantity, unit_cost, reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  let movementId = 1;

  for (let productId = 1; productId <= 180; productId += 1) {
    for (let n = 0; n < 2; n += 1) {
      const warehouseId = randomInt(1, 8);
      const qty = randomInt(80, 620);
      const pricing = getProductPricing(productId);
      stmt.run([
        movementId,
        productId,
        warehouseId,
        randomDate("2022-01-01", "2025-11-20"),
        "IN",
        qty,
        pricing.cost.toFixed(2),
        `PO-${String(productId).padStart(4, "0")}-${n + 1}`
      ]);
      movementId += 1;
    }
  }

  orderItems.forEach((item) => {
    if (randomInt(0, 100) > 56) return;
    const pricing = getProductPricing(item.productId);
    stmt.run([
      movementId,
      item.productId,
      item.warehouseId,
      item.orderDate,
      "OUT",
      item.quantity,
      pricing.cost.toFixed(2),
      `SO-${String(item.orderId).padStart(5, "0")}`
    ]);
    movementId += 1;
  });

  for (let i = 0; i < 140; i += 1) {
    const productId = randomInt(1, 180);
    const pricing = getProductPricing(productId);
    const qty = randomInt(1, 25);
    const sign = randomInt(0, 100) < 40 ? -1 : 1;
    stmt.run([
      movementId,
      productId,
      randomInt(1, 8),
      randomDate("2023-01-01", "2026-02-20"),
      "ADJUSTMENT",
      qty * sign,
      pricing.cost.toFixed(2),
      `ADJ-${String(movementId).padStart(6, "0")}`
    ]);
    movementId += 1;
  }

  stmt.free();
}

function normalizeConvertType(typeToken) {
  const raw = String(typeToken || "").toUpperCase().replace(/\s+/g, "");
  if (/(VAR)?CHAR|TEXT|STRING|NCHAR|NVARCHAR/.test(raw)) return "TEXT";
  if (/INT|BIGINT|SMALLINT|TINYINT/.test(raw)) return "INTEGER";
  if (/DEC|NUMERIC|MONEY|REAL|FLOAT|DOUBLE/.test(raw)) return "REAL";
  if (/DATE|TIME/.test(raw)) return "DATE";
  if (/BIT|BOOL/.test(raw)) return "BOOLEAN";
  return "TEXT";
}

function rewriteTopToLimit(sql) {
  const topWithParens = /^\s*SELECT\s+TOP\s*\(\s*(\d+)\s*\)\s+/i;
  const topSimple = /^\s*SELECT\s+TOP\s+(\d+)\s+/i;
  let rewritten = sql;
  let limit = null;

  const m1 = rewritten.match(topWithParens);
  if (m1) {
    limit = Number(m1[1]);
    rewritten = rewritten.replace(topWithParens, "SELECT ");
  } else {
    const m2 = rewritten.match(topSimple);
    if (m2) {
      limit = Number(m2[1]);
      rewritten = rewritten.replace(topSimple, "SELECT ");
    }
  }

  if (limit === null || /\bLIMIT\s+\d+/i.test(rewritten)) {
    return rewritten;
  }

  if (/;\s*$/.test(rewritten)) {
    return rewritten.replace(/;\s*$/, ` LIMIT ${limit};`);
  }

  return `${rewritten} LIMIT ${limit}`;
}

function transpileSqlForEngine(sql, dialect) {
  let transformed = String(sql || "");
  if (dialect === "postgresql") {
    transformed = transformed.replace(/([A-Za-z0-9_."()]+)\s*::\s*([A-Za-z_][A-Za-z0-9_]*)/gi, "CAST($1 AS $2)");
    transformed = transformed.replace(/\bNOW\s*\(\s*\)/gi, "CURRENT_TIMESTAMP");
    transformed = transformed.replace(/\bILIKE\b/gi, "LIKE");
    transformed = transformed.replace(/to_char\s*\(\s*CAST\s*\(\s*order_date\s+AS\s+date\s*\)\s*,\s*'YYYY-MM'\s*\)/gi, "substr(order_date, 1, 7)");
  }

  if (dialect === "sqlserver") {
    transformed = rewriteTopToLimit(transformed);
    transformed = transformed.replace(/\bGETDATE\s*\(\s*\)/gi, "CURRENT_TIMESTAMP");
    transformed = transformed.replace(/\bISNULL\s*\(/gi, "COALESCE(");
    transformed = transformed.replace(/\bLEN\s*\(/gi, "LENGTH(");
    transformed = transformed.replace(/\bBEGIN\s+TRANSACTION\b/gi, "BEGIN");
    transformed = transformed.replace(/\bROLLBACK\s+TRANSACTION\b/gi, "ROLLBACK");
    transformed = transformed.replace(/\bCONVERT\s*\(\s*([A-Za-z0-9_]+(?:\s*\(\s*\d+\s*(?:,\s*\d+)?\s*\))?)\s*,/gi, (_m, type) => {
      return `CONVERT('${normalizeConvertType(type)}',`;
    });
    transformed = transformed.replace(/\bTRY_CONVERT\s*\(\s*([A-Za-z0-9_]+(?:\s*\(\s*\d+\s*(?:,\s*\d+)?\s*\))?)\s*,/gi, (_m, type) => {
      return `TRY_CONVERT('${normalizeConvertType(type)}',`;
    });
  }

  return transformed;
}


function isSelectWithoutLimit(sql) {
  const normalized = String(sql || "").replace(/\s+/g, " ").trim();
  return /^(with\b[\s\S]+?\)\s*)?select\b/i.test(normalized) && !/\blimit\s+\d+/i.test(normalized);
}

function runQueryWithSafety(query) {
  const sql = String(query || "");
  if (isSelectWithoutLimit(sql)) {
    const proceed = window.confirm("La query e una SELECT senza LIMIT. Vuoi aggiungere LIMIT 200 per evitare freeze UI?");
    if (proceed) {
      const patched = /;\s*$/.test(sql) ? sql.replace(/;\s*$/, " LIMIT 200;") : `${sql} LIMIT 200`;
      dom.queryInput.value = patched;
      return runQuery(patched, { source: "safe-run" });
    }
  }
  return runQuery(sql, { source: "safe-run" });
}

function runExplainPlan(query) {
  if (!state.db) return;
  const sql = String(query || "").trim().replace(/;\s*$/, "");
  if (!sql) {
    setBadge(dom.dbStatus, "Query vuota per EXPLAIN", "error");
    return;
  }

  try {
    const plan = state.db.exec(`EXPLAIN QUERY PLAN ${transpileSqlForEngine(sql, state.dialect)}`);
    dom.planContainer.hidden = false;
    if (!plan.length) {
      dom.planOutput.innerHTML = '<p class="info-block">Nessun piano disponibile.</p>';
      return;
    }
    dom.planOutput.innerHTML = renderTable(plan[0].columns, plan[0].values);
  } catch (error) {
    dom.planContainer.hidden = false;
    dom.planOutput.innerHTML = `<pre class="error-block">${escapeHtml(error.message)}</pre>`;
  }
}

function formatSql(sql) {
  return String(sql || "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\b(SELECT|FROM|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|WITH|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|ON)\b/gi, "\n$1")
    .replace(/^\s+/, "")
    .trim();
}

function renderExecutedSql(sql) {
  if (dom.executedSqlText) {
    dom.executedSqlText.textContent = sql || "-";
  }
}

function saveLocalProgress() {
  const payload = {
    dialect: state.dialect,
    guidedIndex: state.guidedIndex,
    guidedCompleted: Array.from(state.guidedCompleted),
    trainerSelectedKeyword: state.trainerSelectedKeyword,
    trainerCompleted: Array.from(state.trainerCompleted),
    queryHistory: state.queryHistory.slice(0, 30),
    pinnedQueries: state.pinnedQueries,
    currentQuery: dom.queryInput?.value || ""
  };
  localStorage.setItem("sqlexplorer-progress", JSON.stringify(payload));
}

function restoreSessionState() {
  try {
    const raw = localStorage.getItem("sqlexplorer-progress");
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.dialect = saved.dialect || state.dialect;
    state.guidedIndex = Number.isFinite(saved.guidedIndex) ? saved.guidedIndex : 0;
    state.guidedCompleted = new Set(saved.guidedCompleted || []);
    state.trainerSelectedKeyword = saved.trainerSelectedKeyword || "";
    state.trainerCompleted = new Set(saved.trainerCompleted || []);
    state.queryHistory = Array.isArray(saved.queryHistory) ? saved.queryHistory.slice(0, 30) : [];
    state.pinnedQueries = Array.isArray(saved.pinnedQueries) ? saved.pinnedQueries : [];
    if (saved.currentQuery && dom.queryInput) {
      dom.queryInput.value = saved.currentQuery;
    }
    renderHistorySelect();
  } catch (_error) {
    // ignore invalid state
  }
}

function saveSessionToFile() {
  if (!state.db) return;
  saveLocalProgress();
  const bytes = state.db.export();
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sqlexplorer-session.sqlite";
  a.click();
  URL.revokeObjectURL(url);
  setBadge(dom.dbStatus, "Sessione salvata (.sqlite)", "success");
}

function handleSessionUpload(event) {
  const file = event.target.files?.[0];
  if (!file || !state.SQL) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = new Uint8Array(reader.result);
      if (state.db) state.db.close();
      state.db = new state.SQL.Database(data);
      createSqlFunctions();
      refreshTableSelector();
      runQuery(dom.queryInput.value || "SELECT name FROM sqlite_master LIMIT 20;", { source: "session-load" });
      setBadge(dom.dbStatus, "Sessione DB caricata", "success");
    } catch (error) {
      setBadge(dom.dbStatus, `Errore caricamento sessione: ${error.message}`, "error");
    }
  };
  reader.readAsArrayBuffer(file);
  event.target.value = "";
}

function rememberQuery(query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return;
  state.queryHistory = [trimmed, ...state.queryHistory.filter((item) => item !== trimmed)].slice(0, 30);
  renderHistorySelect();
}

function pinCurrentQuery() {
  const current = String(dom.queryInput?.value || "").trim();
  if (!current) return;
  state.pinnedQueries = [current, ...state.pinnedQueries.filter((q) => q !== current)].slice(0, 20);
  renderHistorySelect();
  saveLocalProgress();
}

function renderHistorySelect() {
  if (!dom.historySelect) return;
  const options = [
    `<option value="">Cronologia query</option>`,
    ...state.pinnedQueries.map((query) => `<option value="${escapeHtml(query)}">📌 ${escapeHtml(query.slice(0, 70))}</option>`),
    ...state.queryHistory.map((query) => `<option value="${escapeHtml(query)}">${escapeHtml(query.slice(0, 90))}</option>`)
  ];
  dom.historySelect.innerHTML = options.join("");
}

function exportLastResultCsv() {
  if (!state.lastResult || !state.lastResult.columns?.length) {
    setBadge(dom.dbStatus, "Nessun risultato tabellare da esportare", "error");
    return;
  }

  const columns = state.lastResult.columns;
  const rows = state.lastResult.values || [];
  const lines = [columns, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "query-result.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeResultSet(result) {
  const columns = [...(result?.columns || [])].map((col) => String(col));
  const rows = [...(result?.values || [])].map((row) => row.map((v) => (v === null ? null : String(v))));
  const sortedCols = [...columns].sort((a, b) => a.localeCompare(b));
  const indices = sortedCols.map((col) => columns.indexOf(col));
  const normalizedRows = rows
    .map((row) => indices.map((index) => row[index]))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

  return { columns: sortedCols, rows: normalizedRows };
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function computeResultSignature(result) {
  const normalized = normalizeResultSet(result);
  return {
    columns: normalized.columns,
    rowCount: normalized.rows.length,
    signature: hashString(JSON.stringify(normalized))
  };
}

function buildVerificationSummary(actual, expected) {
  const messages = [];
  if (expected.expectedColumns?.length) {
    const sameColumns = JSON.stringify(actual.columns) === JSON.stringify(expected.expectedColumns);
    if (!sameColumns) {
      messages.push(`Colonne attese: [${expected.expectedColumns.join(", ")}], ricevute: [${actual.columns.join(", ")}]`);
    }
  }

  if (Number.isFinite(expected.expectedRowCount) && actual.rowCount !== expected.expectedRowCount) {
    messages.push(`Row count atteso: ${expected.expectedRowCount}, ricevuto: ${actual.rowCount}`);
  }

  if (Number.isFinite(expected.minRowCount) && actual.rowCount < expected.minRowCount) {
    messages.push(`Row count troppo basso: minimo ${expected.minRowCount}, ricevuto ${actual.rowCount}`);
  }

  if (Number.isFinite(expected.maxRowCount) && actual.rowCount > expected.maxRowCount) {
    messages.push(`Row count troppo alto: massimo ${expected.maxRowCount}, ricevuto ${actual.rowCount}`);
  }

  if (expected.signature && actual.signature !== expected.signature) {
    messages.push("I valori risultanti non coincidono con l'output atteso.");
  }

  return messages;
}

function getStepVerificationExpectations(step) {
  const solution = getGuidedVariant(step, "solution") || getGuidedVariant(step, "starter");
  if (!solution || !state.db) return null;
  const expectedSql = transpileSqlForEngine(solution, state.dialect);
  const expectedResult = state.db.exec(expectedSql)[0] || { columns: [], values: [] };
  return computeResultSignature(expectedResult);
}

function getTrainerVerificationExpectations(challenge) {
  if (!challenge.solution || !challenge.executable || !state.db) return null;
  const expectedSql = transpileSqlForEngine(challenge.solution, state.dialect);
  const expectedResult = state.db.exec(expectedSql)[0] || { columns: [], values: [] };
  return computeResultSignature(expectedResult);
}

function runQuery(query, options = {}) {
  if (!state.db) return { ok: false, error: "Database non inizializzato" };

  const sql = (query || "").trim();
  if (!sql) {
    dom.resultContainer.innerHTML = '<p class="placeholder">Scrivi una query SQL per iniziare.</p>';
    return { ok: false, error: "Query vuota" };
  }

  const executableSql = transpileSqlForEngine(sql, state.dialect);
  renderExecutedSql(executableSql);
  const start = performance.now();

  try {
    const results = state.db.exec(executableSql);
    const elapsed = performance.now() - start;
    const rowsModified = state.db.getRowsModified();

    renderQueryResults(results, rowsModified);
    updateStats(executableSql, results, elapsed, rowsModified);

    setBadge(dom.dbStatus, options.source === "auto" ? "Query auto-run OK" : "Query eseguita", "success");
    rememberQuery(sql);
    saveLocalProgress();
    state.lastResult = results?.[0] || null;

    if (!startsWithSelect(executableSql)) {
      refreshTableSelector();
    }

    return { ok: true, results, rowsModified, elapsed };
  } catch (error) {
    setBadge(dom.dbStatus, "Errore query", "error");
    dom.execTime.textContent = "Tempo: -";
    dom.rowsCount.textContent = "Righe: -";
    dom.filterInfo.textContent = "Filtro: -";
    dom.resultContainer.innerHTML = `<pre class="error-block">${escapeHtml(error.message)}</pre>`;
    return { ok: false, error: error.message };
  }
}

function renderQueryResults(results, rowsModified) {
  if (!results.length) {
    dom.resultContainer.innerHTML = `<p class="info-block">Comando eseguito. Righe modificate: <strong>${rowsModified}</strong>.</p>`;
    return;
  }

  const sections = results.map((result, idx) => {
    const limitedRows = result.values.slice(0, 500);
    const header = `<h3 class="result-title">Result set ${idx + 1} - ${limitedRows.length}/${result.values.length} righe</h3>`;
    const table = renderTable(result.columns, limitedRows);
    const note = result.values.length > 500 ? '<p class="info-block">Mostrate solo le prime 500 righe.</p>' : "";
    return `<section class="result-section">${header}${table}${note}</section>`;
  });

  dom.resultContainer.innerHTML = sections.join("");
}

function renderTable(columns, rows) {
  const head = columns.map((col) => `<th>${escapeHtml(col)}</th>`).join("");
  const body = rows
    .map((row) => {
      const cells = row.map((value) => `<td>${escapeHtml(value === null ? "NULL" : String(value))}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<div class="table-wrap"><table class="data-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function updateStats(sql, results, elapsed, rowsModified) {
  dom.execTime.textContent = `Tempo: ${elapsed.toFixed(1)} ms`;

  if (results.length) {
    const totalRows = results.reduce((acc, result) => acc + result.values.length, 0);
    dom.rowsCount.textContent = `Righe: ${totalRows}`;
  } else {
    dom.rowsCount.textContent = `Righe modificate: ${rowsModified}`;
  }

  dom.filterInfo.textContent = `Filtro: ${computeFilterInsight(sql, results)}`;
}

function computeFilterInsight(sql, results) {
  const normalized = sql.replace(/\s+/g, " ").trim();
  if (!/^(with\b[\s\S]+?\)\s*)?select\b/i.test(normalized)) return "query non-SELECT";

  const tableMatch = normalized.match(/\bfrom\s+([`"\[]?)([A-Za-z_][A-Za-z0-9_]*)([`"\]]?)/i);
  if (!tableMatch) return "tabella non rilevata";

  const tableName = tableMatch[2];
  if (!isSafeIdentifier(tableName)) return "tabella non valida";

  try {
    const countResult = state.db.exec(`SELECT COUNT(*) AS total_rows FROM "${tableName}"`);
    const total = Number(countResult?.[0]?.values?.[0]?.[0] ?? 0);
    const shown = Number(results?.[0]?.values?.length ?? 0);

    if (/\bwhere\b/i.test(normalized) || /\bhaving\b/i.test(normalized)) {
      return `${shown} su ${total} righe (scartate ${Math.max(total - shown, 0)})`;
    }

    return `${shown} su ${total} righe`;
  } catch (_error) {
    return "analisi filtro non disponibile";
  }
}

function refreshTableSelector() {
  const tableRows = state.db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );

  const tableNames = tableRows.length ? tableRows[0].values.map((row) => row[0]) : [];

  dom.tableSelect.innerHTML = tableNames
    .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join("");

  if (!tableNames.length) {
    dom.tableMeta.textContent = "Righe: 0";
    dom.tablePreview.innerHTML = "";
    renderSchemaVisualizer([]);
    return;
  }

  if (!tableNames.includes(state.previewTable)) {
    state.previewTable = tableNames[0];
  }

  dom.tableSelect.value = state.previewTable;
  renderTablePreview(state.previewTable);
  renderSchemaVisualizer(tableNames);
}

function renderTablePreview(tableName) {
  if (!tableName || !isSafeIdentifier(tableName)) return;

  const count = state.db.exec(`SELECT COUNT(*) FROM "${tableName}"`);
  const totalRows = Number(count?.[0]?.values?.[0]?.[0] ?? 0);
  dom.tableMeta.textContent = `Righe: ${totalRows}`;

  const preview = state.db.exec(`SELECT * FROM "${tableName}" LIMIT 10`);
  if (!preview.length) {
    dom.tablePreview.innerHTML = '<p class="info-block">Nessun dato.</p>';
    return;
  }

  const [result] = preview;
  dom.tablePreview.innerHTML = renderTable(result.columns, result.values);
}

function renderSchemaVisualizer(tableNames) {
  if (!dom.dbVisualizer) return;

  if (!tableNames.length) {
    dom.dbVisualizerMeta.textContent = "Tabelle: 0 | Relazioni: 0";
    dom.dbVisualizer.innerHTML = '<p class="info-block">Nessuna tabella disponibile.</p>';
    return;
  }

  const nodeWidth = 188;
  const nodeHeight = 86;
  const gapX = 230;
  const gapY = 150;
  const margin = 26;
  const cols = Math.max(1, Math.ceil(Math.sqrt(tableNames.length)));

  const positions = new Map();
  const tableStats = new Map();
  tableNames.forEach((name, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    positions.set(name, {
      x: margin + col * gapX,
      y: margin + row * gapY
    });

    const columnsResult = state.db.exec(`PRAGMA table_info("${name}")`);
    const columns = columnsResult.length ? columnsResult[0].values.length : 0;
    const rowCountResult = state.db.exec(`SELECT COUNT(*) FROM "${name}"`);
    const rows = Number(rowCountResult?.[0]?.values?.[0]?.[0] ?? 0);
    tableStats.set(name, { columns, rows });
  });

  const links = [];
  tableNames.forEach((table) => {
    const fkRows = state.db.exec(`PRAGMA foreign_key_list("${table}")`);
    if (!fkRows.length) return;
    fkRows[0].values.forEach((row) => {
      const referenced = row[2];
      if (!positions.has(referenced)) return;
      links.push({
        source: table,
        target: referenced,
        sourceCol: row[3],
        targetCol: row[4]
      });
    });
  });

  const rowsNeeded = Math.ceil(tableNames.length / cols);
  const width = margin * 2 + (cols - 1) * gapX + nodeWidth;
  const height = margin * 2 + (rowsNeeded - 1) * gapY + nodeHeight;

  const lines = links.map((link, idx) => {
    const source = positions.get(link.source);
    const target = positions.get(link.target);
    const x1 = source.x + nodeWidth / 2;
    const y1 = source.y + nodeHeight / 2;
    const x2 = target.x + nodeWidth / 2;
    const y2 = target.y + nodeHeight / 2;
    const labelX = (x1 + x2) / 2;
    const labelY = (y1 + y2) / 2 - 4;
    return `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="schema-link" marker-end="url(#arrowHead)"></line>
      <text x="${labelX}" y="${labelY}" class="schema-link-label">${escapeHtml(`${link.sourceCol}->${link.targetCol}`)}</text>
      <title>FK ${escapeHtml(link.source)} -> ${escapeHtml(link.target)}</title>
    `;
  }).join("");

  const nodes = tableNames.map((table) => {
    const pos = positions.get(table);
    const stat = tableStats.get(table);
    const label = table.length > 26 ? `${table.slice(0, 26)}...` : table;
    return `
      <g class="schema-node" data-table="${escapeHtml(table)}">
        <rect x="${pos.x}" y="${pos.y}" width="${nodeWidth}" height="${nodeHeight}" rx="12" ry="12"></rect>
        <text x="${pos.x + 12}" y="${pos.y + 24}" class="schema-node-title">${escapeHtml(label)}</text>
        <text x="${pos.x + 12}" y="${pos.y + 47}" class="schema-node-meta">colonne: ${stat.columns}</text>
        <text x="${pos.x + 12}" y="${pos.y + 67}" class="schema-node-meta">righe: ${stat.rows}</text>
      </g>
    `;
  }).join("");

  dom.dbVisualizerMeta.textContent = `Tabelle: ${tableNames.length} | Relazioni: ${links.length}`;
  dom.dbVisualizer.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="schema-svg" role="img" aria-label="Schema database">
      <defs>
        <marker id="arrowHead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" class="schema-arrow"></path>
        </marker>
      </defs>
      ${lines}
      ${nodes}
    </svg>
  `;

  Array.from(dom.dbVisualizer.querySelectorAll(".schema-node")).forEach((node) => {
    node.addEventListener("click", () => {
      const table = node.getAttribute("data-table");
      if (!table) return;
      state.previewTable = table;
      dom.tableSelect.value = table;
      renderTablePreview(table);
    });
  });
}

function createCustomTable() {
  if (!state.db) return;

  const tableName = (dom.customTableName.value || "").trim();
  const columnsRaw = (dom.customColumns.value || "").trim();
  const rowCount = Math.max(0, Math.min(500, Number(dom.customRows.value) || 0));

  if (!isSafeIdentifier(tableName)) {
    setBadge(dom.dbStatus, "Nome tabella non valido", "error");
    return;
  }

  const columnDefs = splitSqlColumns(columnsRaw).map((item) => item.trim()).filter(Boolean);
  if (!columnDefs.length) {
    setBadge(dom.dbStatus, "Definizione colonne vuota", "error");
    return;
  }

  const parsedColumns = columnDefs.map(parseColumnDefinition);
  if (parsedColumns.some((col) => !col.name)) {
    setBadge(dom.dbStatus, "Errore parsing colonne", "error");
    return;
  }

  try {
    state.db.run(`DROP TABLE IF EXISTS "${tableName}"`);
    state.db.run(`CREATE TABLE "${tableName}" (${columnDefs.join(", ")})`);

    if (rowCount > 0) {
      const namesSql = parsedColumns.map((col) => `"${col.name}"`).join(", ");
      const placeholders = parsedColumns.map(() => "?").join(", ");
      const insert = state.db.prepare(`INSERT INTO "${tableName}" (${namesSql}) VALUES (${placeholders})`);

      for (let i = 0; i < rowCount; i += 1) {
        const values = parsedColumns.map((col) => generateValueForType(col, i));
        insert.run(values);
      }

      insert.free();
    }

    setBadge(dom.dbStatus, `Tabella ${tableName} creata`, "success");
    refreshTableSelector();
    dom.queryInput.value = `SELECT * FROM "${tableName}" LIMIT 50;`;
    runQuery(dom.queryInput.value);
  } catch (error) {
    setBadge(dom.dbStatus, "Errore creazione tabella", "error");
    dom.resultContainer.innerHTML = `<pre class="error-block">${escapeHtml(error.message)}</pre>`;
  }
}

function parseColumnDefinition(definition) {
  const trimmed = definition.trim();
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/);
  if (!match) {
    return { name: "", type: "TEXT", raw: trimmed };
  }

  const name = match[1];
  const rawType = match[2];
  const typeMatch = rawType.match(/^([A-Za-z]+)/);
  const type = typeMatch ? typeMatch[1].toUpperCase() : "TEXT";

  return {
    name,
    type,
    raw: trimmed,
    isPrimaryInt: /PRIMARY\s+KEY/i.test(trimmed) && /INT/i.test(trimmed)
  };
}

function generateValueForType(column, index) {
  if (column.isPrimaryInt) return index + 1;

  const type = column.type;
  if (/INT/.test(type)) return randomInt(0, 9999);
  if (/REAL|DOUB|FLOA|DEC|NUM/.test(type)) return Number((randomInt(1, 9000) + seededRandom()).toFixed(2));
  if (/DATE/.test(type) && !/TIME/.test(type)) return randomDate("2020-01-01", "2026-02-20");
  if (/TIME/.test(type)) return `${randomDate("2020-01-01", "2026-02-20")} ${String(randomInt(0, 23)).padStart(2, "0")}:${String(randomInt(0, 59)).padStart(2, "0")}:00`;
  if (/BOOL/.test(type)) return randomInt(0, 1);

  const wordsA = ["alpha", "beta", "gamma", "delta", "zeta", "kappa", "nova", "spark", "atlas", "luna"];
  const wordsB = ["lab", "ops", "team", "group", "node", "core", "wave", "dash", "field", "unit"];
  return `${pick(wordsA)}_${pick(wordsB)}_${index + 1}`;
}

function copySchemaToClipboard() {
  if (!state.db) return;

  try {
    const schemaRows = state.db.exec(
      "SELECT sql FROM sqlite_master WHERE type IN ('table', 'view', 'trigger') AND name NOT LIKE 'sqlite_%' ORDER BY type, name"
    );

    const schema = schemaRows.length
      ? schemaRows[0].values.map((row) => `${row[0]};`).join("\n\n")
      : "-- schema vuoto";

    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      dom.resultContainer.innerHTML = `<pre class="info-block">${escapeHtml(schema)}</pre>`;
      setBadge(dom.dbStatus, "Clipboard non disponibile: schema mostrato sotto", "neutral");
      return;
    }

    navigator.clipboard
      .writeText(schema)
      .then(() => setBadge(dom.dbStatus, "Schema copiato negli appunti", "success"))
      .catch(() => {
        dom.resultContainer.innerHTML = `<pre class="info-block">${escapeHtml(schema)}</pre>`;
        setBadge(dom.dbStatus, "Clipboard non disponibile: schema mostrato sotto", "neutral");
      });
  } catch (error) {
    setBadge(dom.dbStatus, "Errore export schema", "error");
    dom.resultContainer.innerHTML = `<pre class="error-block">${escapeHtml(error.message)}</pre>`;
  }
}

function setBadge(el, text, type) {
  el.textContent = text;
  el.className = `badge ${type}`;
}

function startsWithSelect(sql) {
  return /^\s*(with\b[\s\S]+?\)\s*)?select\b/i.test(sql);
}

function isSafeIdentifier(name) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function splitSqlColumns(input) {
  const cols = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(depth - 1, 0);

    if (char === "," && depth === 0) {
      cols.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) cols.push(current);
  return cols;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function randomInt(min, max) {
  return Math.floor(seededRandom() * (max - min + 1)) + min;
}

function pick(list) {
  return list[randomInt(0, list.length - 1)];
}

function randomDate(from, to) {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  const t = Math.floor(start + seededRandom() * (end - start));
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function seededRandom() {
  state.seed = (state.seed * 1664525 + 1013904223) % 4294967296;
  return state.seed / 4294967296;
}

function initKeywordExplorer() {
  const detailed = getDetailedKeywords();
  const allKeywords = getExtendedKeywords();

  const byKeyword = new Map();
  detailed.forEach((item) => {
    const normalized = normalizeKeywordEntry(item);
    byKeyword.set(normalized.keyword, normalized);
  });

  allKeywords.forEach((keyword) => {
    if (byKeyword.has(keyword)) return;
    const normalized = normalizeKeywordEntry({ keyword });
    byKeyword.set(normalized.keyword, normalized);
  });

  state.keywordIndex = Array.from(byKeyword.values()).sort((a, b) => a.keyword.localeCompare(b.keyword));
  state.trainerChallengeCache = new Map();

  const categories = ["Tutte", ...new Set(state.keywordIndex.map((item) => item.category))];
  dom.keywordCategory.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");

  renderKeywordList();
  initKeywordTrainer();
}

function normalizeKeywordEntry(item) {
  const keyword = String(item.keyword || "").toUpperCase();
  const category = item.category || inferCategory(keyword);
  const syntax = item.syntax || inferSyntax(keyword, category);
  const argumentsList = Array.isArray(item.arguments) && item.arguments.length
    ? item.arguments
    : inferArguments(keyword, category, syntax);
  const description = item.description || inferDescription(keyword, category);
  const examples = Array.isArray(item.examples) && item.examples.length
    ? item.examples
    : [item.example || inferExample(keyword, category)];
  const useCases = Array.isArray(item.useCases) && item.useCases.length
    ? item.useCases
    : inferUseCases(keyword, category, syntax);
  const pitfalls = Array.isArray(item.pitfalls) && item.pitfalls.length
    ? item.pitfalls
    : inferPitfalls(keyword, category, syntax);
  const dialectNote = item.dialectNote || inferDialectNote(keyword);

  return {
    keyword,
    category,
    arguments: argumentsList,
    syntax,
    description,
    examples,
    useCases,
    pitfalls,
    dialectNote
  };
}

function renderKeywordList() {
  const term = (dom.keywordSearch.value || "").trim().toLowerCase();
  const category = dom.keywordCategory.value || "Tutte";

  const filtered = state.keywordIndex.filter((item) => {
    const matchCategory = category === "Tutte" || item.category === category;
    if (!matchCategory) return false;

    if (!term) return true;

    const blob = [
      item.keyword,
      item.description,
      item.syntax,
      ...(item.arguments || []),
      ...(item.examples || []),
      ...(item.useCases || []),
      ...(item.pitfalls || []),
      item.dialectNote || ""
    ].join(" ").toLowerCase();
    return blob.includes(term);
  });

  dom.keywordCount.textContent = `${filtered.length} keyword`;

  if (!filtered.length) {
    dom.keywordList.innerHTML = '<p class="info-block">Nessuna keyword trovata con i filtri correnti.</p>';
    return;
  }

  dom.keywordList.innerHTML = filtered.map((item) => {
    const argLines = (item.arguments || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    const useCaseLines = (item.useCases || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    const pitfallLines = (item.pitfalls || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    const examples = (item.examples || []).slice(0, 3).map((line) => `<pre class="example-line">${escapeHtml(line)}</pre>`).join("");
    const dialect = item.dialectNote ? `<p class="dialect-note">${escapeHtml(item.dialectNote)}</p>` : "";

    return `
    <article class="keyword-card">
      <div class="keyword-head">
        <h3>${escapeHtml(item.keyword)}</h3>
        <span class="tag">${escapeHtml(item.category)}</span>
      </div>
      <p>${escapeHtml(item.description)}</p>
      <pre class="syntax-line">${escapeHtml(item.syntax)}</pre>
      <h4 class="keyword-subtitle">Argomenti</h4>
      <ul class="keyword-points">${argLines}</ul>
      ${examples}
      <h4 class="keyword-subtitle">Casi d'uso</h4>
      <ul class="keyword-points">${useCaseLines}</ul>
      <h4 class="keyword-subtitle">Attenzione a</h4>
      <ul class="keyword-points">${pitfallLines}</ul>
      ${dialect}
    </article>`;
  }).join("");
}

function initKeywordTrainer() {
  if (!dom.trainerList || !dom.trainerCategory) return;

  const validKeywords = new Set(state.keywordIndex.map((item) => item.keyword));
  state.trainerCompleted = new Set([...state.trainerCompleted].filter((keyword) => validKeywords.has(keyword)));

  const categories = ["Tutte", ...new Set(state.keywordIndex.map((item) => item.category))];
  const currentCategory = dom.trainerCategory.value || "Tutte";

  dom.trainerCategory.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");

  dom.trainerCategory.value = categories.includes(currentCategory) ? currentCategory : "Tutte";

  if (!state.trainerSelectedKeyword || !validKeywords.has(state.trainerSelectedKeyword)) {
    state.trainerSelectedKeyword = state.keywordIndex[0]?.keyword || "";
  }

  renderTrainerList();
}

function renderTrainerList() {
  if (!dom.trainerList || !dom.trainerCategory) return;

  const previousSelected = state.trainerSelectedKeyword;
  const term = (dom.trainerSearch?.value || "").trim().toLowerCase();
  const category = dom.trainerCategory.value || "Tutte";

  const filtered = state.keywordIndex.filter((item) => {
    const categoryMatch = category === "Tutte" || item.category === category;
    if (!categoryMatch) return false;

    if (!term) return true;
    const text = [
      item.keyword,
      item.category,
      item.description,
      item.syntax,
      ...(item.arguments || [])
    ].join(" ").toLowerCase();
    return text.includes(term);
  });

  state.trainerFilteredKeywords = filtered.map((item) => item.keyword);

  if (!state.trainerFilteredKeywords.includes(state.trainerSelectedKeyword)) {
    state.trainerSelectedKeyword = state.trainerFilteredKeywords[0] || "";
  }

  if (previousSelected !== state.trainerSelectedKeyword && dom.trainerFeedback) {
    dom.trainerFeedback.dataset.locked = "";
  }

  const total = state.keywordIndex.length;
  const completed = [...state.trainerCompleted].filter((keyword) => state.keywordIndex.some((item) => item.keyword === keyword)).length;
  dom.trainerProgress.textContent = `Completate: ${completed}/${total}`;
  dom.trainerFiltered.textContent = `Filtrate: ${filtered.length}`;

  if (!filtered.length) {
    dom.trainerList.innerHTML = '<p class="info-block">Nessuna keyword trovata con i filtri correnti.</p>';
    dom.trainerMeta.textContent = "Keyword 0/0";
    dom.trainerMode.textContent = "Verifica: -";
    dom.trainerTitle.textContent = "Nessuna keyword selezionabile";
    dom.trainerDescription.textContent = "Modifica i filtri per mostrare nuovi test.";
    dom.trainerSyntax.textContent = "--";
    dom.trainerArguments.innerHTML = "";
    dom.trainerGoal.textContent = "Nessun obiettivo disponibile.";
    dom.trainerPrevBtn.disabled = true;
    dom.trainerNextBtn.disabled = true;
    return;
  }

  dom.trainerList.innerHTML = filtered.map((item) => {
    const isActive = item.keyword === state.trainerSelectedKeyword;
    const isCompleted = state.trainerCompleted.has(item.keyword);
    const classes = ["trainer-item", isActive ? "active" : "", isCompleted ? "completed" : ""].filter(Boolean).join(" ");
    const status = isCompleted ? "OK" : "todo";
    return `
      <button class="${classes}" data-trainer-keyword="${escapeHtml(item.keyword)}">
        <div class="trainer-item-head">
          <span class="trainer-item-title">${escapeHtml(item.keyword)}</span>
          <span class="trainer-item-status">${status}</span>
        </div>
        <div class="trainer-item-meta">${escapeHtml(item.category)}</div>
      </button>
    `;
  }).join("");

  Array.from(dom.trainerList.querySelectorAll(".trainer-item")).forEach((button) => {
    button.addEventListener("click", () => {
      const keyword = button.getAttribute("data-trainer-keyword");
      if (!keyword) return;
      if (dom.trainerFeedback) {
        dom.trainerFeedback.dataset.locked = "";
      }
      state.trainerSelectedKeyword = keyword;
      renderTrainerList();
    });
  });

  renderTrainerDetail();
}

function renderTrainerDetail() {
  const entry = getCurrentTrainerEntry();
  if (!entry) return;

  const position = state.trainerFilteredKeywords.indexOf(entry.keyword);
  const count = state.trainerFilteredKeywords.length;
  const challenge = getTrainerChallenge(entry);

  dom.trainerMeta.textContent = `Keyword ${position + 1}/${count}`;
  dom.trainerMode.textContent = challenge.executable
    ? "Verifica: sintassi + esecuzione"
    : "Verifica: sintassi guidata";

  dom.trainerTitle.textContent = entry.keyword;
  dom.trainerDescription.textContent = entry.description;
  dom.trainerSyntax.textContent = entry.syntax || "--";
  dom.trainerArguments.innerHTML = (entry.arguments || [])
    .map((arg) => `<li>${escapeHtml(arg)}</li>`)
    .join("");
  dom.trainerGoal.textContent = challenge.objective;

  dom.trainerPrevBtn.disabled = position <= 0;
  dom.trainerNextBtn.disabled = position >= count - 1;

  if (!dom.trainerFeedback.dataset.locked) {
    setTrainerFeedback("Carica lo starter e completa il test nel query editor.", "neutral");
  }
}

function moveTrainerKeyword(delta) {
  const list = state.trainerFilteredKeywords || [];
  if (!list.length) return;
  const currentIndex = Math.max(0, list.indexOf(state.trainerSelectedKeyword));
  const next = Math.max(0, Math.min(list.length - 1, currentIndex + delta));
  if (dom.trainerFeedback) {
    dom.trainerFeedback.dataset.locked = "";
  }
  state.trainerSelectedKeyword = list[next];
  renderTrainerList();
}

function loadTrainerQuery(mode) {
  const entry = getCurrentTrainerEntry();
  if (!entry) return;

  const challenge = getTrainerChallenge(entry);
  const query = mode === "solution" ? challenge.solution : challenge.starter;
  dom.queryInput.value = query;

  if (mode === "solution" && challenge.executable) {
    runQuery(query, { source: "trainer-solution" });
    setTrainerFeedback("Soluzione caricata ed eseguita. Studia risultato e sintassi.", "neutral");
    return;
  }

  setTrainerFeedback("Starter caricato: completa i TODO e verifica il test.", "neutral");
}

function checkTrainerKeyword() {
  const entry = getCurrentTrainerEntry();
  if (!entry) return;

  const challenge = getTrainerChallenge(entry);
  const query = (dom.queryInput.value || "").trim();
  if (!query) {
    setTrainerFeedback("Query vuota: carica lo starter o scrivi una query per il test.", "warn");
    return;
  }

  if (/\bTODO\b/i.test(query)) {
    setTrainerFeedback("Completa prima i TODO presenti nello starter.", "warn");
    return;
  }

  if (challenge.executable) {
    const result = runQuery(query, { source: "trainer-check" });
    if (!result?.ok) {
      setTrainerFeedback(`Keyword presente ma query non valida: ${result?.error || "errore SQL"}`, "error");
      return;
    }

    const expected = getTrainerVerificationExpectations(challenge);
    if (expected) {
      const actual = computeResultSignature(result.results?.[0] || { columns: [], values: [] });
      const mismatches = buildVerificationSummary(actual, {
        expectedColumns: expected.columns,
        expectedRowCount: expected.rowCount,
        signature: expected.signature
      });
      if (mismatches.length) {
        setTrainerFeedback(`Output non corretto: ${mismatches.join(" | ")}`, "warn");
        return;
      }
    }
  }

  const queryUpper = query.toUpperCase();
  const missingTokens = challenge.requiredTokens.filter((token) => !hasKeywordToken(queryUpper, token.toUpperCase()));
  if (missingTokens.length) {
    setTrainerFeedback(`Risultato corretto, ma manca il concetto richiesto: ${missingTokens.join(", ")}`, "warn");
    return;
  }

  state.trainerCompleted.add(entry.keyword);
  saveLocalProgress();
  setTrainerFeedback("Test completato correttamente per questa keyword.", "success");
  renderTrainerList();
}

function setTrainerFeedback(message, type) {
  if (!dom.trainerFeedback) return;
  dom.trainerFeedback.textContent = message;
  dom.trainerFeedback.className = `guided-feedback ${type}`;
  dom.trainerFeedback.dataset.locked = type === "success" ? "1" : "";
}

function getCurrentTrainerEntry() {
  if (!state.trainerSelectedKeyword) return null;
  return state.keywordIndex.find((item) => item.keyword === state.trainerSelectedKeyword) || null;
}

function getTrainerChallenge(entry) {
  const key = `${state.dialect}:${entry.keyword}`;
  if (state.trainerChallengeCache.has(key)) {
    return state.trainerChallengeCache.get(key);
  }

  const challenge = buildKeywordChallenge(entry);
  state.trainerChallengeCache.set(key, challenge);
  return challenge;
}

function buildKeywordChallenge(entry) {
  const keyword = entry.keyword;
  const k = keyword.toUpperCase();
  const sample = Array.isArray(entry.examples) && entry.examples.length
    ? entry.examples[0]
    : inferExample(keyword, entry.category);

  let objective = `Scrivi una query che usi ${keyword} in modo corretto.`;
  let starter = getGenericTrainerStarter(entry);
  let solution = sample;
  let executable = false;

  if (["SELECT", "FROM", "WHERE", "DISTINCT", "AS", "ORDER", "ORDER BY", "LIMIT", "OFFSET", "BY", "AND", "OR", "NOT", "IN", "EXISTS", "BETWEEN", "LIKE", "IS", "NULL", "NOTNULL"].includes(k)) {
    objective = `Completa una query di lettura usando ${keyword} correttamente.`;
    starter = `SELECT id, customer_id, status, total_amount
FROM orders
-- TODO usa ${keyword} in modo coerente
LIMIT 20;`;
    solution = solution && !solution.startsWith("--")
      ? solution
      : "SELECT id, status, total_amount FROM orders WHERE status IN ('PAID', 'SHIPPED') ORDER BY total_amount DESC LIMIT 20;";
    executable = true;
  } else if (k.includes("JOIN") || ["JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "CROSS", "NATURAL", "FULL", "ON", "USING"].includes(k)) {
    objective = `Allinea due tabelle con ${keyword} per ottenere dati combinati.`;
    starter = `SELECT o.id, c.name, o.total_amount
FROM orders o
JOIN customers c ON c.id = o.customer_id
-- TODO usa ${keyword} in modo coerente
LIMIT 20;`;

    if (k === "USING") {
      solution = `SELECT c.name AS customer_name, w.name AS warehouse_name, c.region_id
FROM customers c
JOIN warehouses w USING (region_id)
LIMIT 20;`;
      executable = true;
    } else if (k === "LEFT JOIN" || k === "LEFT") {
      solution = `SELECT c.id, c.name, o.id AS order_id
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
LIMIT 30;`;
      executable = true;
    } else if (k === "RIGHT JOIN" || k === "RIGHT" || k === "FULL JOIN" || k === "FULL") {
      solution = `-- Esempio teorico: ${k} non e supportata nativamente da SQLite
SELECT c.id, o.id
FROM customers c
RIGHT JOIN orders o ON o.customer_id = c.id;`;
      executable = false;
    } else {
      solution = `SELECT o.id, c.name, o.total_amount
FROM orders o
JOIN customers c ON c.id = o.customer_id
LIMIT 20;`;
      executable = true;
    }
  } else if (k === "GROUP BY" || k === "GROUP" || k === "HAVING") {
    objective = `Calcola metriche aggregate e applica ${keyword} nel punto corretto.`;
    starter = `SELECT c.segment, SUM(o.total_amount) AS revenue
FROM customers c
JOIN orders o ON o.customer_id = c.id
-- TODO usa ${keyword}
LIMIT 20;`;
    solution = k === "HAVING"
      ? `SELECT c.segment, ROUND(SUM(o.total_amount), 2) AS revenue
FROM customers c
JOIN orders o ON o.customer_id = c.id
GROUP BY c.segment
HAVING SUM(o.total_amount) > 250000
ORDER BY revenue DESC;`
      : `SELECT c.segment, ROUND(SUM(o.total_amount), 2) AS revenue
FROM customers c
JOIN orders o ON o.customer_id = c.id
GROUP BY c.segment
ORDER BY revenue DESC;`;
    executable = true;
  } else if (k === "WITH" || k === "RECURSIVE") {
    objective = `Usa ${keyword} per organizzare una query in blocchi riutilizzabili.`;
    starter = `WITH monthly AS (
  SELECT substr(order_date, 1, 7) AS mese,
         SUM(total_amount) AS totale
  FROM orders
  -- TODO usa ${keyword} dove serve
  GROUP BY substr(order_date, 1, 7)
)
SELECT * FROM monthly
LIMIT 20;`;
    solution = k === "RECURSIVE"
      ? `WITH RECURSIVE numbers(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM numbers WHERE n < 10
)
SELECT n FROM numbers;`
      : `WITH monthly AS (
  SELECT substr(order_date, 1, 7) AS mese,
         ROUND(SUM(total_amount), 2) AS totale
  FROM orders
  GROUP BY substr(order_date, 1, 7)
)
SELECT * FROM monthly ORDER BY mese;`;
    executable = true;
  } else if (k === "UNION" || k === "INTERSECT" || k === "EXCEPT") {
    objective = `Combina due result set con ${keyword}.`;
    starter = `SELECT customer_id FROM orders WHERE status = 'PAID'
-- TODO usa ${keyword}
SELECT customer_id FROM orders WHERE status = 'SHIPPED';`;
    solution = k === "INTERSECT"
      ? `SELECT customer_id FROM orders WHERE status = 'PAID'
INTERSECT
SELECT customer_id FROM orders WHERE status = 'SHIPPED';`
      : k === "EXCEPT"
        ? `SELECT customer_id FROM orders WHERE status = 'PAID'
EXCEPT
SELECT customer_id FROM orders WHERE status = 'REFUNDED';`
        : `SELECT customer_id FROM orders WHERE status = 'PAID'
UNION
SELECT customer_id FROM orders WHERE status = 'SHIPPED';`;
    executable = true;
  } else if (k === "CASE" || k === "WHEN" || k === "THEN" || k === "ELSE" || k === "END") {
    objective = `Classifica i record usando una espressione ${keyword}.`;
    starter = `SELECT id, total_amount,
       CASE
         -- TODO completa CASE con ${keyword}
       END AS amount_bucket
FROM orders
LIMIT 20;`;
    solution = `SELECT id, total_amount,
       CASE
         WHEN total_amount >= 2000 THEN 'high'
         WHEN total_amount >= 800 THEN 'mid'
         ELSE 'low'
       END AS amount_bucket
FROM orders
LIMIT 20;`;
    executable = true;
  } else if (["CAST", "CONVERT", "TRY_CONVERT", "COALESCE", "NULLIF"].includes(k)) {
    objective = `Esegui conversioni/gestione null con ${keyword}.`;
    starter = `SELECT id, total_amount,
       -- TODO usa ${keyword}
FROM orders
LIMIT 20;`;
    if (k === "COALESCE") {
      solution = `SELECT id, COALESCE(discount_amount, 0) AS discount_safe
FROM orders
LIMIT 20;`;
    } else if (k === "NULLIF") {
      solution = `SELECT id, total_amount / NULLIF(discount_amount, 0) AS ratio
FROM orders
LIMIT 20;`;
    } else if (k === "CAST") {
      solution = `SELECT id, CAST(total_amount AS INTEGER) AS total_int
FROM orders
LIMIT 20;`;
    } else if (k === "TRY_CONVERT" && state.dialect === "postgresql") {
      solution = `SELECT id,
       CAST(NULLIF(total_amount, '') AS NUMERIC) AS total_real
FROM orders
LIMIT 20;`;
    } else if (k === "CONVERT" && state.dialect === "postgresql") {
      solution = `SELECT id, CAST(total_amount AS TEXT) AS total_text
FROM orders
LIMIT 20;`;
    } else if (k === "TRY_CONVERT") {
      solution = `SELECT id, TRY_CONVERT('REAL', total_amount) AS total_real
FROM orders
LIMIT 20;`;
    } else {
      solution = `SELECT id, CONVERT('TEXT', total_amount) AS total_text
FROM orders
LIMIT 20;`;
    }
    executable = true;
  } else if (["OVER", "PARTITION", "ROWS", "RANGE", "GROUPS", "LAG", "LEAD", "ROW_NUMBER", "WINDOW", "FILTER"].includes(k)) {
    objective = `Costruisci un calcolo analitico con ${keyword}.`;
    starter = `SELECT customer_id, order_date, total_amount,
       -- TODO usa ${keyword}
FROM orders
LIMIT 40;`;
    solution = k === "ROW_NUMBER"
      ? `SELECT customer_id, total_amount,
       ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY total_amount DESC) AS rn
FROM orders;`
      : k === "LEAD"
        ? `SELECT customer_id, order_date, total_amount,
       LEAD(total_amount) OVER (PARTITION BY customer_id ORDER BY order_date) AS next_amount
FROM orders;`
        : `SELECT customer_id, order_date, total_amount,
       LAG(total_amount) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev_amount
FROM orders;`;
    executable = true;
  } else if (["INSERT", "INTO", "VALUES"].includes(k)) {
    objective = `Inserisci dati di test in sicurezza usando ${keyword}.`;
    starter = `BEGIN;
-- TODO usa ${keyword}
ROLLBACK;`;
    solution = `BEGIN;
INSERT INTO customer_notes (customer_id, note_date, note_type, note_text, author_employee_id)
VALUES (1, '2026-02-10', 'followup', 'Trainer insert test', 2);
SELECT customer_id, note_type FROM customer_notes ORDER BY id DESC LIMIT 1;
ROLLBACK;`;
    executable = true;
  } else if (["UPDATE", "SET", "DELETE"].includes(k)) {
    objective = `Aggiorna o rimuovi dati in una transazione controllata con ${keyword}.`;
    starter = `BEGIN;
-- TODO usa ${keyword}
ROLLBACK;`;
    solution = k === "DELETE"
      ? `BEGIN;
DELETE FROM customer_notes WHERE note_type = 'obsolete';
SELECT changes() AS deleted_rows;
ROLLBACK;`
      : `BEGIN;
UPDATE products
SET price = ROUND(price * 1.01, 2)
WHERE category = 'Software';
SELECT category, ROUND(AVG(price), 2) AS avg_price
FROM products
GROUP BY category;
ROLLBACK;`;
    executable = true;
  } else if (["BEGIN", "ROLLBACK", "SAVEPOINT", "RELEASE", "TRANSACTION"].includes(k)) {
    objective = `Gestisci i confini transazionali usando ${keyword}.`;
    starter = `BEGIN;
UPDATE products SET stock = stock WHERE id = 1;
-- TODO usa ${keyword}
ROLLBACK;`;
    solution = `BEGIN;
SAVEPOINT sp_train;
UPDATE products SET stock = stock WHERE id = 1;
ROLLBACK TO sp_train;
RELEASE sp_train;
ROLLBACK;`;
    executable = true;
  } else if (k === "COMMIT") {
    objective = "Completa un flusso transazionale includendo COMMIT nella sequenza corretta.";
    starter = `BEGIN;
UPDATE products SET stock = stock WHERE id = 1;
-- TODO aggiungi COMMIT nel punto corretto`;
    solution = `BEGIN;
UPDATE products SET stock = stock WHERE id = 1;
COMMIT;`;
    executable = false;
  } else if (["CREATE TABLE", "ALTER TABLE", "CREATE INDEX", "DROP TABLE", "CREATE", "ALTER", "DROP", "TABLE", "INDEX"].includes(k)) {
    objective = `Esegui una modifica schema minima usando ${keyword}.`;
    starter = `-- TODO usa ${keyword} in una DDL minima`;
    if (k === "ALTER TABLE" || k === "ALTER") {
      solution = `CREATE TEMP TABLE trainer_alter (id INTEGER PRIMARY KEY);
ALTER TABLE trainer_alter ADD COLUMN note TEXT;`;
    } else if (k === "CREATE INDEX" || k === "INDEX") {
      solution = `CREATE TEMP TABLE trainer_idx (id INTEGER PRIMARY KEY, code TEXT);
CREATE INDEX idx_trainer_code ON trainer_idx(code);`;
    } else if (k === "DROP TABLE" || k === "DROP") {
      solution = `CREATE TEMP TABLE trainer_drop (id INTEGER PRIMARY KEY);
DROP TABLE trainer_drop;`;
    } else {
      solution = `CREATE TEMP TABLE trainer_tmp (id INTEGER PRIMARY KEY, label TEXT);`;
    }
    executable = true;
  } else if (k === "EXPLAIN" || k === "PLAN" || k === "PRAGMA" || k === "ANALYZE") {
    objective = `Ispeziona meta-informazioni o piano usando ${keyword}.`;
    starter = `-- TODO usa ${keyword}`;
    solution = k === "PRAGMA"
      ? `PRAGMA table_info("orders");`
      : k === "ANALYZE"
        ? `ANALYZE;`
        : `EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 10;`;
    executable = true;
  } else if (["GRANT", "REVOKE", "ROLE", "USER", "PROCEDURE", "FUNCTION", "TRUNCATE", "MERGE"].includes(k) || entry.category === "Sicurezza") {
    objective = `Test teorico: descrivi e scrivi la sintassi base di ${keyword}.`;
    starter = `-- Test teorico (non eseguibile su SQLite)
-- TODO scrivi una riga SQL che usa ${keyword}`;
    solution = sample && !sample.startsWith("--")
      ? sample
      : `${keyword} ...;`;
    executable = false;
  } else {
    objective = `Usa ${keyword} in una query coerente con la sintassi indicata.`;
    starter = getGenericTrainerStarter(entry);
    solution = sample && !sample.startsWith("--") ? sample : `${keyword} ...;`;
    executable = isKeywordLikelyExecutable(entry) && /(^|\s)(SELECT|WITH|INSERT|UPDATE|DELETE|EXPLAIN|PRAGMA)\b/i.test(solution);
  }

  return {
    keyword,
    objective,
    starter,
    solution,
    executable,
    requiredTokens: getRequiredTokensForKeyword(entry)
  };
}

function getGenericTrainerStarter(entry) {
  const syntaxHint = entry.syntax || inferSyntax(entry.keyword, entry.category);
  if (entry.category === "DML" || entry.category === "Transazioni") {
    return `BEGIN;
-- TODO usa ${entry.keyword}
ROLLBACK;`;
  }
  if (entry.category === "DDL") {
    return `-- TODO usa ${entry.keyword}
-- Hint: ${syntaxHint}`;
  }
  return `-- Obiettivo: usa ${entry.keyword}
-- Hint: ${syntaxHint}
SELECT * FROM orders
LIMIT 20;`;
}

function getRequiredTokensForKeyword(entry) {
  const k = entry.keyword.toUpperCase();
  if (k === "CONVERT" && state.dialect === "postgresql") return ["CAST"];
  if (k === "TRY_CONVERT" && state.dialect === "postgresql") return ["CAST"];

  const tokens = extractKeywordTokens(entry.keyword);
  const ctx = getSyntaxContexts(entry.keyword, entry.syntax);

  if (k === "CASE") tokens.push("WHEN", "THEN", "END");
  if (ctx.hasGroupBy) tokens.push("GROUP", "BY");
  if (ctx.hasOrderBy) tokens.push("ORDER", "BY");
  if (ctx.hasWith) tokens.push("WITH");
  if (ctx.hasWindow) tokens.push("OVER");
  if (ctx.hasJoin) tokens.push("JOIN");
  if (ctx.hasOn) tokens.push("ON");
  if (ctx.hasUsing) tokens.push("USING");

  return [...new Set(tokens)];
}

function extractKeywordTokens(keyword) {
  const tokens = String(keyword || "")
    .toUpperCase()
    .split(/[^A-Z0-9_]+/)
    .filter(Boolean);

  return tokens.length ? tokens : [String(keyword || "").toUpperCase()];
}

function hasKeywordToken(queryUpper, token) {
  const escaped = String(token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(^|[^A-Z0-9_])${escaped}([^A-Z0-9_]|$)`);
  return regex.test(queryUpper);
}

function isKeywordLikelyExecutable(entry) {
  const k = entry.keyword.toUpperCase();

  const unsupported = new Set([
    "RIGHT JOIN", "FULL JOIN", "MERGE", "TRUNCATE", "GRANT", "REVOKE", "ROLE", "USER",
    "PROCEDURE", "FUNCTION", "OPEN", "LOOP", "WHILE", "DO", "INSTEAD", "EACH",
    "DEFERRABLE", "INITIALLY", "NO", "NOTHING", "OTHERS", "TIES", "UNBOUNDED",
    "FOLLOWING", "PRECEDING", "RESTRICT", "CASCADE", "EXCLUDE", "MATERIALIZED"
  ]);

  if (entry.category === "Sicurezza") return false;
  if (unsupported.has(k)) return false;
  if (k === "RIGHT" || k === "FULL") return false;
  return true;
}

function inferCategory(keyword) {
  const k = keyword.toUpperCase();

  if (["CREATE", "ALTER", "DROP", "TRUNCATE", "TABLE", "VIEW", "INDEX", "SCHEMA", "DATABASE", "RENAME", "ADD", "COLUMN", "CONSTRAINT", "PRIMARY", "FOREIGN", "UNIQUE", "CHECK", "DEFAULT", "GENERATED", "VIRTUAL", "TEMP", "TEMPORARY", "MATERIALIZED"].includes(k)) {
    return "DDL";
  }

  if (["SELECT", "FROM", "WHERE", "GROUP", "HAVING", "ORDER", "BY", "LIMIT", "OFFSET", "DISTINCT", "AS", "CASE", "WHEN", "THEN", "ELSE", "END", "UNION", "INTERSECT", "EXCEPT", "WITH", "RECURSIVE", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "CROSS", "NATURAL", "ON", "USING", "IN", "EXISTS", "ANY", "ALL", "BETWEEN", "LIKE", "IS", "NULL", "NOT", "AND", "OR", "GLOB", "REGEXP", "MATCH", "WINDOW", "OVER", "PARTITION", "ROWS", "RANGE", "GROUPS", "FILTER", "FOLLOWING", "PRECEDING", "UNBOUNDED", "TIES", "FIRST", "LAST", "OTHERS", "CURRENT", "CURRENT_DATE", "CURRENT_TIME", "CURRENT_TIMESTAMP", "CAST", "CONVERT", "TRY_CONVERT", "COALESCE", "NULLIF"].includes(k)) {
    return "Query";
  }

  if (["INSERT", "UPDATE", "DELETE", "INTO", "VALUES", "SET", "RETURNING", "REPLACE", "MERGE"].includes(k)) {
    return "DML";
  }

  if (["BEGIN", "COMMIT", "ROLLBACK", "SAVEPOINT", "RELEASE", "TRANSACTION", "DEFERRED", "IMMEDIATE", "EXCLUSIVE"].includes(k)) {
    return "Transazioni";
  }

  if (["GRANT", "REVOKE", "ROLE", "USER"].includes(k)) {
    return "Sicurezza";
  }

  return "Avanzato/SQLite";
}

function inferSyntax(keyword, category) {
  const k = keyword.toUpperCase();

  if (k === "SELECT") return "SELECT lista_colonne FROM sorgente [WHERE ...] [GROUP BY ...] [HAVING ...] [ORDER BY ...] [LIMIT/TOP ...];";
  if (k === "FROM") return "SELECT ... FROM tabella_o_subquery [AS alias]";
  if (k === "WHERE") return "... WHERE condizione_booleana";
  if (k === "ORDER BY" || k === "ORDER") return "... ORDER BY espressione [ASC|DESC], ...";
  if (k === "LIMIT") return "... LIMIT numero_righe";
  if (k === "OFFSET") return "... LIMIT numero_righe OFFSET righe_da_saltare";
  if (k === "DISTINCT") return "SELECT DISTINCT colonna1 [, colonna2 ...] FROM ...";
  if (k === "AS") return "espressione AS alias";
  if (k === "BY") return "ORDER BY colonna | GROUP BY colonna | PARTITION BY colonna";
  if (k === "AND" || k === "OR") return "condizione_1 AND/OR condizione_2";
  if (k === "NOT") return "NOT condizione | NOT IN (...) | NOT EXISTS (...)";
  if (k === "JOIN") return "... JOIN tabella_b ON condizione_join";
  if (k === "LEFT") return "... LEFT JOIN tabella_b ON condizione_join";
  if (k === "RIGHT") return "... RIGHT JOIN tabella_b ON condizione_join";
  if (k === "FULL") return "... FULL JOIN tabella_b ON condizione_join";
  if (k === "INNER") return "... INNER JOIN tabella_b ON condizione_join";
  if (k === "OUTER") return "... LEFT|RIGHT|FULL OUTER JOIN tabella_b ON condizione_join";
  if (k === "CROSS") return "... CROSS JOIN tabella_b";
  if (k === "NATURAL") return "... NATURAL JOIN tabella_b";
  if (k === "LEFT JOIN") return "... LEFT JOIN tabella_b ON condizione_join";
  if (k === "RIGHT JOIN") return "... RIGHT JOIN tabella_b ON condizione_join";
  if (k === "FULL JOIN") return "... FULL JOIN tabella_b ON condizione_join";
  if (k === "ON") return "... JOIN ... ON chiave_sx = chiave_dx";
  if (k === "USING") return "... JOIN ... USING (colonna_comune)";
  if (k === "GROUP BY" || k === "GROUP") return "... GROUP BY colonna1, colonna2";
  if (k === "HAVING") return "... GROUP BY ... HAVING condizione_su_aggregate";
  if (k === "WITH") return "WITH nome_cte AS (SELECT ...) SELECT ... FROM nome_cte;";
  if (k === "RECURSIVE") return "WITH RECURSIVE nome_cte AS (anchor UNION ALL recursive) SELECT ...;";
  if (k === "UNION") return "SELECT ... UNION [ALL] SELECT ...";
  if (k === "INTERSECT") return "SELECT ... INTERSECT SELECT ...";
  if (k === "EXCEPT") return "SELECT ... EXCEPT SELECT ...";
  if (k === "EXISTS") return "... WHERE EXISTS (SELECT 1 FROM ... WHERE ...)";
  if (k === "IN") return "... WHERE valore IN (val1, val2, ... | SELECT ...)";
  if (k === "BETWEEN") return "... WHERE valore BETWEEN minimo AND massimo";
  if (k === "LIKE") return "... WHERE colonna LIKE 'pattern%'";
  if (k === "IS" || k === "NULL" || k === "NOTNULL") return "... WHERE espressione IS [NOT] NULL";
  if (k === "CASE" || k === "WHEN" || k === "THEN" || k === "ELSE" || k === "END") {
    return "CASE WHEN condizione THEN valore_true ELSE valore_false END";
  }

  if (k === "CAST") return "CAST(espressione AS tipo_destinazione)";
  if (k === "CONVERT") {
    if (state.dialect === "sqlserver") return "CONVERT(tipo_destinazione, espressione [, stile])";
    if (state.dialect === "postgresql") return "CAST(espressione AS tipo) -- equivalente";
    return "CONVERT(tipo_destinazione, espressione)";
  }
  if (k === "TRY_CONVERT") {
    if (state.dialect === "sqlserver") return "TRY_CONVERT(tipo_destinazione, espressione)";
    if (state.dialect === "postgresql") return "NULLIF/CASE + CAST(...) -- equivalente";
    return "TRY_CONVERT(tipo_destinazione, espressione)";
  }
  if (k === "OVER") return "funzione_analitica() OVER ([PARTITION BY ...] [ORDER BY ...] [ROWS/RANGE ...])";
  if (k === "PARTITION") return "OVER (PARTITION BY colonna [, ...] [ORDER BY ...])";
  if (k === "ROWS" || k === "RANGE" || k === "GROUPS") return "OVER (... ORDER BY ... ROWS BETWEEN n PRECEDING AND CURRENT ROW)";
  if (k === "FILTER") return "aggregata(...) FILTER (WHERE condizione)";

  if (k === "INSERT" || k === "INTO") return "INSERT INTO tabella (col1, col2, ...) VALUES (v1, v2, ...);";
  if (k === "VALUES") return "INSERT INTO tabella (...) VALUES (...), (...);";
  if (k === "UPDATE") return "UPDATE tabella SET colonna = valore [, ...] WHERE condizione;";
  if (k === "SET") return "UPDATE tabella SET colonna = espressione [, ...] WHERE condizione;";
  if (k === "DELETE") return "DELETE FROM tabella WHERE condizione;";
  if (k === "RETURNING") return "... RETURNING colonna1, colonna2";
  if (k === "MERGE") return "MERGE target USING source ON condizione WHEN MATCHED THEN UPDATE ...;";

  if (k === "BEGIN") return state.dialect === "sqlserver" ? "BEGIN TRANSACTION;" : "BEGIN;";
  if (k === "COMMIT") return state.dialect === "sqlserver" ? "COMMIT TRANSACTION;" : "COMMIT;";
  if (k === "ROLLBACK") return state.dialect === "sqlserver" ? "ROLLBACK TRANSACTION;" : "ROLLBACK;";
  if (k === "SAVEPOINT") return "SAVEPOINT nome_punto;";
  if (k === "RELEASE") return "RELEASE SAVEPOINT nome_punto;";
  if (k === "TRANSACTION") return "BEGIN TRANSACTION; ... COMMIT;";

  if (k === "CREATE TABLE") return "CREATE TABLE nome_tabella (colonna tipo [vincoli], ...);";
  if (k === "ALTER TABLE") return "ALTER TABLE nome_tabella ADD COLUMN nuova_colonna tipo;";
  if (k === "CREATE INDEX") return "CREATE INDEX idx_nome ON tabella (colonna1 [, colonna2 ...]);";
  if (k === "DROP TABLE") return "DROP TABLE nome_tabella;";
  if (k === "CREATE") return "CREATE TABLE|VIEW|INDEX nome_oggetto ...;";
  if (k === "ALTER") return "ALTER TABLE nome_oggetto operazione;";
  if (k === "DROP") return "DROP TABLE|VIEW|INDEX nome_oggetto;";
  if (k === "TABLE" && category === "DDL") return "CREATE TABLE nome_tabella (...);";

  if (k === "EXPLAIN" || k === "PLAN") {
    if (state.dialect === "postgresql") return "EXPLAIN [ANALYZE] SELECT ...;";
    if (state.dialect === "sqlserver") return "SET SHOWPLAN_TEXT ON; SELECT ...; SET SHOWPLAN_TEXT OFF;";
    return "EXPLAIN QUERY PLAN SELECT ...;";
  }

  if (k === "GRANT" || k === "REVOKE") return `${k} privilegio ON oggetto TO/FROM utente_ruolo;`;
  if (k === "ROLE" || k === "USER") return "-- gestione ruolo/utente dipendente dal DBMS";

  if (category === "DDL") return `${k} ... ;`;
  if (category === "DML") return `${k} ... ;`;
  if (category === "Transazioni") return `${k};`;
  if (category === "Sicurezza") return `${k} ... ON oggetto TO utente;`;
  return `${k} ...`;
}

function inferDescription(keyword, category) {
  const k = keyword.toUpperCase();

  if (k === "SELECT") return "Proietta colonne e costruisce il result set finale della query.";
  if (k === "FROM") return "Definisce la sorgente dati: tabella, vista, CTE o subquery.";
  if (k === "WHERE") return "Applica filtri riga-prima-riga prima di aggregazioni e window finali.";
  if (k === "ORDER BY" || k === "ORDER") return "Ordina il risultato secondo una o piu espressioni.";
  if (k === "LIMIT" || k === "TOP") return "Riduce il numero di righe restituite.";
  if (k === "OFFSET") return "Salta le prime N righe, utile con paginazione.";
  if (k === "DISTINCT") return "Elimina duplicati sul set di colonne selezionate.";
  if (k === "AS") return "Assegna alias a colonne, tabelle o espressioni.";
  if (k === "BY") return "Completa clausole come ORDER BY, GROUP BY e PARTITION BY.";
  if (k === "AND" || k === "OR" || k === "NOT") return "Combina o nega condizioni booleane nei filtri.";
  if (k === "JOIN" || k.endsWith("JOIN")) return "Combina due sorgenti relazionali usando una condizione di join.";
  if (["LEFT", "RIGHT", "INNER", "OUTER", "CROSS", "NATURAL", "FULL"].includes(k)) return "Modifica il comportamento della JOIN (matching e cardinalita).";
  if (k === "ON" || k === "USING") return "Specifica la regola con cui le righe delle tabelle vengono allineate.";
  if (k === "GROUP BY" || k === "GROUP") return "Raggruppa righe con stessa chiave per calcolare aggregate.";
  if (k === "HAVING") return "Filtra i gruppi dopo il calcolo delle funzioni aggregate.";
  if (k === "WITH" || k === "RECURSIVE") return "Crea CTE per spezzare o ricorsivizzare una query complessa.";
  if (k === "CASE" || k === "WHEN" || k === "THEN" || k === "ELSE" || k === "END") {
    return "Costruisce logica condizionale inline dentro SELECT, ORDER BY e GROUP BY.";
  }
  if (k === "EXISTS" || k === "IN" || k === "BETWEEN" || k === "LIKE") {
    return "Supporta filtri semantici tipici su insiemi, intervalli e pattern testuali.";
  }
  if (k === "UNION" || k === "INTERSECT" || k === "EXCEPT") {
    return "Combina o confronta result set compatibili per numero e tipo di colonne.";
  }

  if (k === "CONVERT") {
    if (state.dialect === "sqlserver") return "Converte un valore in SQL Server con supporto stile opzionale.";
    if (state.dialect === "postgresql") return "PostgreSQL preferisce CAST o operatore :: come alternativa a CONVERT.";
    return "Converte esplicitamente un valore; nel lab usa la funzione custom CONVERT(tipo, valore).";
  }
  if (k === "TRY_CONVERT") {
    if (state.dialect === "sqlserver") return "Converte in modo safe: ritorna NULL se conversione fallisce.";
    if (state.dialect === "postgresql") return "Non nativa: si ottiene un comportamento simile con CASE/NULLIF + CAST.";
    return "Converte senza errore fatale: quando conversione fallisce ritorna NULL.";
  }
  if (k === "OVER" || k === "PARTITION" || k === "ROWS" || k === "RANGE") {
    return "Definisce la finestra per calcoli analitici mantenendo il dettaglio per riga.";
  }
  if (k === "INSERT" || k === "INTO" || k === "VALUES") return "Inserisce nuove righe in modo puntuale o bulk.";
  if (k === "UPDATE" || k === "SET") return "Aggiorna valori esistenti secondo assegnazioni e filtri.";
  if (k === "DELETE") return "Rimuove righe esistenti in base a una condizione.";
  if (k === "RETURNING") return "Ritorna valori delle righe toccate da DML senza query aggiuntive.";
  if (k === "MERGE") return "Unifica insert/update/delete condizionati in un unico statement.";
  if (k === "BEGIN" || k === "COMMIT" || k === "ROLLBACK" || k === "SAVEPOINT") {
    return "Gestisce confini e recupero delle transazioni.";
  }
  if (k === "CREATE" || k === "ALTER" || k === "DROP" || k === "TABLE" || k === "INDEX") {
    return "Definisce o modifica oggetti strutturali dello schema dati.";
  }
  if (k === "EXPLAIN" || k === "PLAN") return "Espone il piano di esecuzione per analizzare costi e scansioni.";
  if (k === "GRANT" || k === "REVOKE" || k === "ROLE" || k === "USER") {
    return "Riguarda privilegi, ruoli e sicurezza a livello DBMS.";
  }

  if (category === "DDL") return `${k} e una keyword di definizione schema (creazione o modifica oggetti).`;
  if (category === "DML") return `${k} e una keyword di manipolazione dati (inserimento, aggiornamento o cancellazione).`;
  if (category === "Transazioni") return `${k} controlla il flusso ACID di una transazione SQL.`;
  if (category === "Sicurezza") return `${k} riguarda privilegi o gestione accessi in DBMS che supportano security SQL.`;
  return `${k} e una keyword usata in query, espressioni o funzionalita avanzate del motore SQL.`;
}

function inferExample(keyword, category) {
  const k = keyword.toUpperCase();

  if (k === "SELECT") return "SELECT id, name FROM customers WHERE segment = 'Enterprise';";
  if (k === "WHERE") return "SELECT * FROM orders WHERE status IN ('PAID','SHIPPED');";
  if (k === "ORDER BY") return "SELECT * FROM orders ORDER BY order_date DESC LIMIT 20;";
  if (k === "LIMIT") return "SELECT * FROM orders ORDER BY total_amount DESC LIMIT 10;";
  if (k === "JOIN") return "SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id;";
  if (k === "GROUP BY") return "SELECT segment, SUM(total_amount) FROM orders o JOIN customers c ON c.id = o.customer_id GROUP BY segment;";
  if (k === "HAVING") return "SELECT segment, COUNT(*) n FROM customers GROUP BY segment HAVING n > 10;";
  if (k === "WITH") return "WITH recent AS (SELECT * FROM orders WHERE order_date >= '2025-01-01') SELECT * FROM recent;";
  if (k === "CONVERT") return "SELECT CONVERT('INTEGER', total_amount) FROM orders;";
  if (k === "TRY_CONVERT") return "SELECT TRY_CONVERT('DATE', opened_at) FROM support_tickets;";
  if (k === "INSERT") return "INSERT INTO customer_notes (customer_id, note_date, note_type, note_text, author_employee_id) VALUES (1, '2026-02-01', 'followup', 'Renewal requested', 2);";
  if (k === "UPDATE") return "UPDATE products SET is_active = 0 WHERE stock = 0;";
  if (k === "DELETE") return "DELETE FROM customer_notes WHERE note_type = 'obsolete';";
  if (k === "EXPLAIN") return "EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 10;";
  if (category === "DDL") return `${k} TABLE demo (...);`;
  if (category === "DML") return `${k} ... ;`;
  if (category === "Transazioni") return `${k}; -- blocco transazionale`;
  if (category === "Sicurezza") return `${k} SELECT ON vendite TO analyst;`;
  return `-- esempio uso ${k}`;
}

function getSyntaxContexts(keyword, syntax) {
  const text = `${String(keyword || "")} ${String(syntax || "")}`.toUpperCase();
  return {
    hasWhere: /\bWHERE\b/.test(text),
    hasJoin: /\bJOIN\b/.test(text),
    hasOn: /\bON\b/.test(text),
    hasUsing: /\bUSING\b/.test(text),
    hasGroupBy: /\bGROUP\s+BY\b/.test(text),
    hasHaving: /\bHAVING\b/.test(text),
    hasOrderBy: /\bORDER\s+BY\b/.test(text),
    hasLimit: /\bLIMIT\b|\bTOP\b/.test(text),
    hasWith: /\bWITH\b/.test(text),
    hasSetOperator: /\bUNION\b|\bINTERSECT\b|\bEXCEPT\b/.test(text),
    hasCase: /\bCASE\b|\bWHEN\b|\bTHEN\b|\bELSE\b|\bEND\b/.test(text),
    hasWindow: /\bOVER\b|\bPARTITION\s+BY\b|\bROWS\b|\bRANGE\b|\bGROUPS\b/.test(text),
    hasInsert: /\bINSERT\b|\bVALUES\b/.test(text),
    hasUpdate: /\bUPDATE\b|\bSET\b/.test(text),
    hasDelete: /\bDELETE\b/.test(text),
    hasDdl: /\bCREATE\b|\bALTER\b|\bDROP\b|\bTRUNCATE\b/.test(text),
    hasExplain: /\bEXPLAIN\b|\bSHOWPLAN\b|\bPLAN\b/.test(text),
    hasCast: /\bCAST\b|\bCONVERT\b|\bTRY_CONVERT\b/.test(text)
  };
}

function inferArguments(keyword, category, syntax) {
  const k = keyword.toUpperCase();
  const ctx = getSyntaxContexts(k, syntax);

  if (k === "SELECT") return ["lista colonne o espressioni", "sorgente FROM", "filtri opzionali WHERE/HAVING", "ordinamento e limite opzionali"];
  if (k === "FROM") return ["tabella/vista/subquery", "alias opzionale"];
  if (k === "WHERE") return ["predicato booleano", "operatori logici AND/OR/NOT", "subquery opzionali"];
  if (k === "ORDER BY" || k === "ORDER") return ["espressione di ordinamento", "direzione ASC o DESC", "criteri multipli opzionali"];
  if (k === "LIMIT") return ["numero massimo righe", "OFFSET opzionale"];
  if (k === "OFFSET") return ["numero righe da saltare"];
  if (k === "DISTINCT") return ["insieme colonne su cui valutare unicita"];
  if (k === "AS") return ["espressione o tabella da aliasare", "nome alias"];
  if (k === "BY") return ["espressione usata per ordinare/raggruppare/partizionare"];
  if (k === "AND" || k === "OR") return ["condizione sinistra", "condizione destra"];
  if (k === "NOT") return ["condizione o predicato da negare"];

  if (k.includes("JOIN") || ["JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "CROSS", "NATURAL", "FULL"].includes(k)) {
    return ["sorgente sinistra", "sorgente destra", "condizione di join ON/USING"];
  }
  if (k === "ON") return ["espressione condizionale tra colonne delle due tabelle"];
  if (k === "USING") return ["colonna comune con stesso nome in entrambe le tabelle"];

  if (k === "GROUP BY" || k === "GROUP") return ["chiavi di raggruppamento", "misure aggregate in SELECT"];
  if (k === "HAVING") return ["condizione su funzioni aggregate o chiavi grouped"];

  if (k === "WITH") return ["nome CTE", "query CTE", "query principale che la usa"];
  if (k === "RECURSIVE") return ["query anchor", "query ricorsiva", "condizione di arresto implicita/esplicita"];
  if (k === "UNION" || k === "INTERSECT" || k === "EXCEPT") return ["SELECT sinistra", "SELECT destra", "compatibilita numero/tipo colonne"];
  if (k === "EXISTS") return ["subquery correlata o non correlata"];
  if (k === "IN") return ["valore testato", "lista valori o subquery"];
  if (k === "BETWEEN") return ["valore testato", "estremo inferiore", "estremo superiore"];
  if (k === "LIKE") return ["espressione testuale", "pattern con wildcard %/_", "ESCAPE opzionale"];

  if (k === "CASE" || k === "WHEN" || k === "THEN" || k === "ELSE" || k === "END") {
    return ["condizione WHEN", "valore THEN", "ramo ELSE opzionale"];
  }

  if (k === "CAST") return ["espressione da convertire", "tipo destinazione"];
  if (k === "CONVERT" || k === "TRY_CONVERT") return ["tipo destinazione", "espressione", "stile opzionale (SQL Server)"];
  if (k === "COALESCE") return ["lista valori in priorita (ritorna il primo non NULL)"];
  if (k === "NULLIF") return ["valore A", "valore B (se uguale allora NULL)"];

  if (k === "LAG" || k === "LEAD") return ["espressione target", "offset opzionale", "default opzionale", "finestra OVER(...)"];
  if (k === "ROW_NUMBER") return ["finestra OVER(PARTITION BY ... ORDER BY ...)"];
  if (k === "OVER") return ["PARTITION BY opzionale", "ORDER BY opzionale", "frame ROWS/RANGE/GROUPS opzionale"];
  if (k === "PARTITION") return ["colonne di partizionamento", "ORDER BY opzionale nel frame"];
  if (k === "ROWS" || k === "RANGE" || k === "GROUPS") return ["bound iniziale", "bound finale", "CURRENT ROW/PRECEDING/FOLLOWING"];

  if (k === "INSERT" || k === "INTO") return ["tabella target", "lista colonne", "VALUES multipli o SELECT come source"];
  if (k === "VALUES") return ["tupla di valori", "allineamento con ordine colonne"];
  if (k === "UPDATE") return ["tabella target", "assegnazioni SET", "filtro WHERE (fortemente raccomandato)"];
  if (k === "SET") return ["colonna da aggiornare", "espressione di assegnazione"];
  if (k === "DELETE") return ["tabella target", "filtro WHERE (fortemente raccomandato)"];
  if (k === "RETURNING") return ["colonne da restituire dopo INSERT/UPDATE/DELETE"];

  if (k === "BEGIN" || k === "COMMIT" || k === "ROLLBACK") return ["comando transazione (nessun parametro obbligatorio)"];
  if (k === "SAVEPOINT" || k === "RELEASE") return ["nome savepoint"];

  if (k === "CREATE TABLE") return ["nome tabella", "definizione colonne", "vincoli PK/FK/UNIQUE/CHECK"];
  if (k === "ALTER TABLE") return ["nome tabella", "operazione ADD/DROP/ALTER", "colonna o vincolo target"];
  if (k === "CREATE INDEX") return ["nome indice", "tabella target", "colonne da indicizzare"];
  if (k === "CREATE") return ["tipo oggetto (TABLE/INDEX/VIEW)", "nome oggetto", "definizione"];
  if (k === "ALTER") return ["nome oggetto", "operazione di modifica"];
  if (k === "DROP") return ["tipo oggetto", "nome oggetto"];
  if (k === "TABLE" && category === "DDL") return ["nome tabella", "colonne", "vincoli"];

  if (k === "EXPLAIN" || k === "PLAN") return ["query target da analizzare"];

  if (ctx.hasJoin) return ["sorgenti relazionali", "chiavi di join", "filtri post-join"];
  if (ctx.hasGroupBy) return ["chiavi di gruppo", "misure aggregate", "filtro HAVING opzionale"];
  if (ctx.hasWhere) return ["predicato booleano", "parametri di filtro"];
  if (ctx.hasWindow) return ["funzione analitica", "definizione finestra OVER(...)"];
  if (ctx.hasSetOperator) return ["due o piu SELECT compatibili", "regola di combinazione set"];
  if (ctx.hasDdl) return ["nome oggetto schema", "definizione e opzioni oggetto"];
  if (category === "DDL") return ["nome oggetto schema", "definizione e opzioni oggetto"];
  if (category === "DML") return ["target dati", "valori/assegnazioni", "filtro opzionale"];
  if (category === "Transazioni") return ["comando di controllo transazionale"];
  return ["argomenti dipendenti dal dialetto e dal contesto query"];
}

function inferUseCases(keyword, category, syntax) {
  const k = keyword.toUpperCase();
  const ctx = getSyntaxContexts(k, syntax);

  if (k === "SELECT" || k === "FROM") return [
    "Creare dataset analitici leggibili da dashboard o export.",
    "Ridurre il payload estraendo solo colonne necessarie.",
    "Combinare sorgenti operative e dimensionali in un unico result set."
  ];
  if (k === "WHERE") return [
    "Applicare regole business prima di aggregare i dati.",
    "Limitare scansioni su finestre temporali o stati rilevanti.",
    "Costruire filtri riusabili in report e monitoraggio."
  ];
  if (k === "AND" || k === "OR" || k === "NOT") return [
    "Comporre predicati complessi senza ricorrere a logica applicativa.",
    "Esplicitare eccezioni e regole negative nei filtri.",
    "Riutilizzare pattern booleani stabili nelle query operative."
  ];
  if (k === "ORDER BY" || k === "ORDER" || k === "LIMIT" || k === "OFFSET") return [
    "Top-N analitici (migliori clienti, prodotti, ticket).",
    "Paginazione server-side ordinata e stabile.",
    "Prioritizzazione code operative per importo/data/SLA."
  ];

  if (k.includes("JOIN") || ["JOIN", "ON", "USING", "LEFT", "RIGHT", "INNER", "OUTER", "CROSS", "NATURAL", "FULL"].includes(k)) {
    return [
      "Arricchire un fatto (ordini) con dimensioni (clienti, prodotti, campagne).",
      "Ricostruire flussi end-to-end tra vendite, logistica e supporto.",
      "Confrontare dataset provenienti da domini diversi."
    ];
  }

  if (k === "GROUP BY" || k === "GROUP" || k === "HAVING") return [
    "Calcolare metriche per segmento, canale, area geografica o periodo.",
    "Filtrare gruppi rilevanti in base a soglie aggregate.",
    "Produrre KPI aggregati per forecasting e capacity planning."
  ];

  if (k === "WITH" || k === "RECURSIVE") return [
    "Spezzare query lunghe in blocchi logici manutenibili.",
    "Riutilizzare risultati intermedi senza duplicare sottoquery.",
    "Gestire gerarchie o grafi con CTE ricorsive."
  ];

  if (k === "CASE" || k === "WHEN" || k === "THEN" || k === "ELSE" || k === "END") return [
    "Classificare righe in bucket business direttamente in SQL.",
    "Applicare logiche tariffarie o SLA condizionali.",
    "Uniformare output per report senza post-processing applicativo."
  ];

  if (k === "EXISTS" || k === "IN" || k === "BETWEEN" || k === "LIKE") return [
    "Filtri semantici su membership, intervalli e pattern testuali.",
    "Validare presenza/assenza di record correlati.",
    "Ridurre dataset in modo dichiarativo e leggibile."
  ];

  if (k === "UNION" || k === "INTERSECT" || k === "EXCEPT") return [
    "Comporre feed da sorgenti omogenee.",
    "Confrontare differenze tra snapshot o ambienti diversi.",
    "Costruire set di controllo qualita dati."
  ];

  if (k === "CAST") return [
    "Uniformare tipi in join o confronti (es. TEXT vs INTEGER).",
    "Preparare output per report (es. decimali a interi).",
    "Evitare comportamenti impliciti non portabili tra motori."
  ];
  if (k === "CONVERT" || k === "TRY_CONVERT") return [
    "Migrare dati sporchi da staging a schema finale con tipizzazione.",
    "Normalizzare input eterogenei (date/stringhe/numeri) prima delle aggregazioni.",
    "Gestire conversioni in query analitiche senza post-processing applicativo."
  ];
  if (k === "OVER" || k === "PARTITION" || k === "ROWS" || k === "RANGE" || ctx.hasWindow) return [
    "Analisi temporali con confronti riga precedente/successiva.",
    "Ranking, percentili e cumulati senza perdere dettaglio riga.",
    "Calcolo moving average o running total in report finanziari."
  ];

  if (k === "INSERT" || k === "INTO" || k === "VALUES") return [
    "Caricare dati di test o bootstrap applicativo.",
    "Popolare tabelle di staging da file o API.",
    "Inserire transazioni operative in modo batch."
  ];
  if (k === "UPDATE" || k === "SET") return [
    "Correggere attributi errati su dataset esistente.",
    "Applicare repricing massivo o nuove regole business.",
    "Sincronizzare stati ordini/ticket con processi esterni."
  ];
  if (k === "DELETE") return [
    "Pulizia dati obsoleti o duplicati verificati.",
    "Gestione retention policy su log e note storiche.",
    "Rollback logico di dati caricati per errore."
  ];

  if (k === "BEGIN" || k === "COMMIT" || k === "ROLLBACK" || k === "SAVEPOINT") return [
    "Rendere atomico un flusso di update multipli.",
    "Ripristinare stato precedente in caso di errore.",
    "Isolare step intermedi complessi con savepoint."
  ];

  if (k === "CREATE" || k === "ALTER" || k === "DROP" || k === "TABLE" || k === "INDEX" || k === "CREATE TABLE" || k === "ALTER TABLE" || k === "CREATE INDEX") return [
    "Definire schema consistente con vincoli e chiavi.",
    "Ottimizzare performance con indici mirati.",
    "Evolvere il modello dati in modo controllato."
  ];

  if (k === "EXPLAIN" || k === "PLAN") return [
    "Identificare full scan costose su query critiche.",
    "Validare l'impatto di nuovi indici prima del rilascio.",
    "Confrontare piani tra varianti della stessa query."
  ];

  if (ctx.hasWhere) return [
    "Ridurre dataset a subset rilevante prima di aggregare o joinare.",
    "Applicare regole di filtro coerenti in report ricorrenti."
  ];
  if (category === "DDL") return [
    "Definire schema consistente con vincoli e chiavi.",
    "Evolvere il modello dati in modo controllato."
  ];
  if (category === "DML") return [
    "Caricare dati operativi o di test.",
    "Correggere o sincronizzare dataset in modo incrementale."
  ];
  if (category === "Transazioni") return [
    "Rendere atomico un flusso di update multipli.",
    "Ripristinare stato precedente in caso di errore."
  ];
  return [
    `Usare ${k} in query operative per migliorare leggibilita e controllo.`,
    `Combinare ${k} con CTE, finestre o subquery per analisi avanzate.`
  ];
}

function inferPitfalls(keyword, category, syntax) {
  const k = keyword.toUpperCase();
  const ctx = getSyntaxContexts(k, syntax);

  if (k === "SELECT" || k === "FROM") return [
    "SELECT * su tabelle larghe aumenta I/O e accoppia il codice allo schema.",
    "Alias mancanti in query con molte join riducono leggibilita e manutenzione.",
    "Subquery non necessarie possono complicare il piano di esecuzione."
  ];

  if (k === "WHERE") return [
    "Condizioni con OR e NULL possono filtrare in modo inatteso.",
    "Filtri su funzioni (es. DATE(col)) possono impedire uso indici.",
    "Mischiare logica AND/OR senza parentesi produce risultati errati."
  ];
  if (k === "AND" || k === "OR" || k === "NOT") return [
    "Precedenza operatori non esplicita puo cambiare il risultato logico.",
    "Negazioni su espressioni con NULL richiedono test puntuali."
  ];

  if (k === "ORDER BY" || k === "ORDER") return [
    "ORDER BY non univoco rende instabile la paginazione tra esecuzioni.",
    "Ordinare su colonne non indicizzate puo essere costoso su volumi alti."
  ];
  if (k === "LIMIT" || k === "OFFSET") return [
    "LIMIT senza ORDER BY non garantisce ordine deterministico.",
    "OFFSET elevati peggiorano le performance: valuta keyset pagination."
  ];

  if (k === "CAST" || k === "CONVERT" || k === "TRY_CONVERT") return [
    "Conversioni invalide possono generare errori o NULL (dipende dal motore).",
    "Cast in WHERE/JOIN puo degradare uso indici.",
    "Formati data/numero variano tra dialetti SQL."
  ];

  if (k.includes("JOIN") || ["JOIN", "ON", "USING", "LEFT", "RIGHT", "INNER", "OUTER", "CROSS", "NATURAL", "FULL"].includes(k)) return [
    "Join senza chiave corretta genera duplicazioni (effetto moltiplicazione).",
    "LEFT JOIN con filtro nel WHERE puo diventare involontariamente INNER JOIN.",
    "Tipi incompatibili nelle chiavi di join aumentano costi e mismatch."
  ];

  if (k === "GROUP BY" || k === "GROUP" || k === "HAVING") return [
    "Colonne non aggregate fuori dal GROUP BY causano errori o risultati ambigui.",
    "Granularita errata del group altera i KPI.",
    "Filtri messi in HAVING invece che in WHERE aumentano lavoro inutile."
  ];

  if (k === "WITH" || k === "RECURSIVE") return [
    "CTE usate senza criterio possono peggiorare leggibilita e performance.",
    "Ricorsioni senza condizione di stop adeguata rischiano loop o set eccessivi."
  ];

  if (k === "CASE" || k === "WHEN" || k === "THEN" || k === "ELSE" || k === "END") return [
    "Rami CASE con tipi incompatibili possono forzare cast indesiderati.",
    "Mancare ELSE puo produrre NULL inattesi in output."
  ];

  if (k === "EXISTS" || k === "IN") return [
    "IN con sottoquery contenente NULL puo dare esiti inattesi con NOT IN.",
    "Subquery non ottimizzate possono essere molto costose su grandi volumi."
  ];
  if (k === "BETWEEN") return [
    "BETWEEN e inclusivo su entrambi gli estremi: attenzione su date/timestamp.",
    "Intervalli su testo dipendono da collation e ordinamento lessicografico."
  ];
  if (k === "LIKE") return [
    "Pattern con wildcard iniziale (%abc) inibiscono spesso uso indici.",
    "Case sensitivity e caratteri speciali dipendono da collation/dialetto."
  ];

  if (k === "UNION" || k === "INTERSECT" || k === "EXCEPT") return [
    "Le SELECT devono avere stesso numero e tipo compatibile di colonne.",
    "UNION deduplica e puo costare molto: usa UNION ALL quando possibile."
  ];

  if (k === "OVER" || k === "PARTITION" || k === "ROWS" || k === "RANGE" || ctx.hasWindow) return [
    "ORDER BY incompleto nella finestra produce risultati non deterministici.",
    "Frame implicito puo cambiare comportamento tra DBMS.",
    "Mescolare frame ROWS e RANGE senza attenzione altera il risultato analitico."
  ];

  if (k === "INSERT" || k === "INTO" || k === "VALUES") return [
    "Ordine valori non allineato alle colonne causa dati errati.",
    "Assenza di validazioni puo introdurre duplicati o violazioni di vincoli."
  ];
  if (k === "UPDATE" || k === "SET" || k === "DELETE") return [
    "Dimenticare WHERE in UPDATE/DELETE impatta tutte le righe.",
    "Aggiornamenti massivi senza transazione rendono difficile il rollback."
  ];

  if (k === "BEGIN" || k === "COMMIT" || k === "ROLLBACK" || k === "SAVEPOINT") return [
    "Transaction scope troppo ampio aumenta lock e contention.",
    "Gestione errori incompleta puo lasciare transazioni aperte."
  ];

  if (k === "CREATE" || k === "ALTER" || k === "DROP" || k === "TABLE" || k === "INDEX" || k === "CREATE TABLE" || k === "ALTER TABLE" || k === "CREATE INDEX") return [
    "Modifiche DDL in produzione possono bloccare workload concorrenti.",
    "Evoluzioni schema senza piano di migrazione possono rompere query esistenti."
  ];

  if (k === "EXPLAIN" || k === "PLAN") return [
    "Il piano stimato puo differire da runtime reale senza ANALYZE/statistiche aggiornate.",
    "Ottimizzare solo su dataset piccolo porta decisioni fuorvianti."
  ];

  if (ctx.hasWhere) return [
    "Condizioni complesse senza indice adeguato degradano drasticamente le performance.",
    "Logica booleana non testata su casi limite produce filtri sbagliati."
  ];
  if (ctx.hasJoin) return [
    "Cardinalita attesa e reale possono divergere e gonfiare i result set.",
    "Join su colonne non indicizzate aumentano tempi di risposta."
  ];
  if (ctx.hasGroupBy) return [
    "Raggruppamento a granularita sbagliata compromette KPI e decisioni.",
    "Aggregate su colonne con NULL richiedono controlli espliciti."
  ];
  if (ctx.hasDdl) return [
    "Oggetti creati senza naming convention rendono difficile manutenzione.",
    "Assenza di rollback plan aumenta rischio durante migrazioni."
  ];
  if (ctx.hasExplain) return [
    "Leggere solo il costo totale senza dettaglio operazioni puo trarre in inganno.",
    "Piani diversi tra ambienti richiedono confronto di statistiche e indici."
  ];
  if (category === "DML") return [
    "Dimenticare WHERE in UPDATE/DELETE impatta tutte le righe.",
    "Assenza di transazione aumenta rischio di stato parziale."
  ];
  return [
    "Verifica sempre supporto e sintassi specifica del tuo DBMS.",
    "Aggiungi test query su dataset realistici per evitare regressioni logiche."
  ];
}

function inferDialectNote(keyword) {
  const k = keyword.toUpperCase();
  if (k === "CONVERT") {
    if (state.dialect === "sqlserver") return "Modalita SQL Server: CONVERT(tipo, espressione [, stile]).";
    if (state.dialect === "postgresql") return "Modalita PostgreSQL: usa CAST(...) o operatore :: al posto di CONVERT.";
    return "Modalita SQLite: CONVERT(tipo, espressione) e fornita come funzione custom nel playground.";
  }
  if (k === "TRY_CONVERT") {
    if (state.dialect === "sqlserver") return "TRY_CONVERT e nativa e ritorna NULL se conversione fallisce.";
    if (state.dialect === "postgresql") return "TRY_CONVERT non e nativa in PostgreSQL; equivalente con CASE/NULLIF + CAST.";
    return "TRY_CONVERT nel lab SQLite e simulata e ritorna NULL su conversione non valida.";
  }
  if (["RIGHT JOIN", "FULL JOIN", "MERGE", "TRUNCATE", "GRANT", "REVOKE"].includes(k)) {
    return "Supporto variabile: verifica sempre il dialetto target (SQLite/MySQL/PostgreSQL/SQL Server).";
  }
  if (k === "WINDOW" || k === "OVER") {
    return "Window functions hanno piccole differenze di sintassi e frame defaults tra DBMS.";
  }
  return `Modalita attiva: ${DIALECTS[state.dialect] || DIALECTS.sqlite}. Verifica differenze sintattiche sul DBMS target.`;
}

function getDetailedKeywords() {
  return [
    {
      keyword: "SELECT",
      category: "Query",
      syntax: "SELECT col1, col2 FROM tabella WHERE condizione;",
      description: "Estrae colonne/righe ed e la base di quasi ogni analisi SQL.",
      examples: [
        "SELECT name, country FROM customers WHERE country = 'Italy';",
        "SELECT COUNT(*) AS n_orders FROM orders;",
        "SELECT DISTINCT segment FROM customers ORDER BY segment;"
      ]
    },
    {
      keyword: "JOIN",
      category: "Query",
      syntax: "SELECT ... FROM a JOIN b ON a.id = b.a_id;",
      description: "Combina fatti e dimensioni su chiavi logiche.",
      examples: [
        "SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id;",
        "SELECT oi.id, p.name FROM order_items oi JOIN products p ON p.id = oi.product_id;"
      ]
    },
    {
      keyword: "LEFT JOIN",
      category: "Query",
      syntax: "FROM a LEFT JOIN b ON ...",
      description: "Mantiene tutte le righe del lato sinistro, anche senza match.",
      examples: [
        "SELECT c.id, o.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id;",
        "SELECT e.id, t.id FROM employees e LEFT JOIN support_tickets t ON t.customer_id = e.id;"
      ]
    },
    {
      keyword: "GROUP BY",
      category: "Query",
      syntax: "SELECT chiave, SUM(x) FROM t GROUP BY chiave;",
      description: "Raggruppa dati per dimensione e abilita aggregate.",
      examples: [
        "SELECT segment, COUNT(*) FROM customers GROUP BY segment;",
        "SELECT currency, ROUND(SUM(total_amount), 2) FROM orders GROUP BY currency;"
      ]
    },
    {
      keyword: "HAVING",
      category: "Query",
      syntax: "... GROUP BY chiave HAVING condizione_aggregate;",
      description: "Filtra gruppi dopo il calcolo delle funzioni aggregate.",
      examples: [
        "SELECT segment, COUNT(*) n FROM customers GROUP BY segment HAVING n > 20;",
        "SELECT channel, SUM(total_amount) s FROM orders GROUP BY channel HAVING s > 100000;"
      ]
    },
    {
      keyword: "WITH",
      category: "Query",
      syntax: "WITH cte AS (SELECT ...) SELECT ... FROM cte;",
      description: "Scompone query complesse in blocchi leggibili e riusabili.",
      examples: [
        "WITH monthly AS (SELECT substr(order_date,1,7) m, SUM(total_amount) s FROM orders GROUP BY substr(order_date,1,7)) SELECT * FROM monthly;",
        "WITH high_value AS (SELECT customer_id, SUM(total_amount) s FROM orders GROUP BY customer_id HAVING s > 50000) SELECT * FROM high_value;"
      ]
    },
    {
      keyword: "CASE",
      category: "Query",
      syntax: "CASE WHEN condizione THEN valore ELSE fallback END",
      description: "Introduce logica condizionale dentro SELECT/ORDER BY/GROUP BY.",
      examples: [
        "SELECT CASE WHEN total_amount > 1000 THEN 'high' ELSE 'normal' END AS bucket FROM orders;",
        "SELECT CASE WHEN status IN ('PAID','SHIPPED') THEN 1 ELSE 0 END AS billable FROM orders;"
      ]
    },
    {
      keyword: "CAST",
      category: "Query",
      syntax: "CAST(espressione AS tipo)",
      description: "Converte esplicitamente un valore in un tipo diverso.",
      examples: [
        "SELECT CAST(total_amount AS INTEGER) FROM orders LIMIT 10;",
        "SELECT CAST(signup_date AS TEXT) FROM customers LIMIT 10;",
        "SELECT CAST(discount_pct * 100 AS INTEGER) AS discount_pct_int FROM order_items LIMIT 20;"
      ],
      dialectNote: "Standard SQL. Sintassi generalmente consistente tra i DBMS."
    },
    {
      keyword: "CONVERT",
      category: "Query",
      syntax: "CONVERT(tipo_destinazione, espressione)",
      description: "Converte tipi con sintassi dialetto-specifica. Utile in ETL e clean-up dati.",
      examples: [
        "SELECT CONVERT('REAL', total_amount) FROM orders LIMIT 10;",
        "SELECT CONVERT('TEXT', opened_at) FROM support_tickets LIMIT 10;",
        "SELECT CONVERT('INTEGER', discount_amount) FROM orders LIMIT 10;"
      ],
      dialectNote: "In SQL Server la forma canonica e CONVERT(tipo, espressione[,stile]). In questo lab SQLite e implementata come funzione custom."
    },
    {
      keyword: "TRY_CONVERT",
      category: "Query",
      syntax: "TRY_CONVERT(tipo_destinazione, espressione)",
      description: "Versione tollerante: se conversione fallisce ritorna NULL.",
      examples: [
        "SELECT TRY_CONVERT('INTEGER', '123'), TRY_CONVERT('INTEGER', 'abc');",
        "SELECT TRY_CONVERT('DATE', opened_at) FROM support_tickets LIMIT 10;"
      ],
      dialectNote: "Nativa in SQL Server; in questo lab e simulata via funzione custom."
    },
    {
      keyword: "COALESCE",
      category: "Query",
      syntax: "COALESCE(v1, v2, ...)",
      description: "Ritorna il primo valore non NULL nella lista.",
      examples: [
        "SELECT COALESCE(closed_at, opened_at) FROM support_tickets;",
        "SELECT COALESCE(discount_amount, 0) FROM orders;"
      ]
    },
    {
      keyword: "NULLIF",
      category: "Query",
      syntax: "NULLIF(a, b)",
      description: "Ritorna NULL quando a = b, utile per evitare divisioni per zero.",
      examples: [
        "SELECT total_amount / NULLIF(discount_amount, 0) FROM orders;",
        "SELECT NULLIF(status, 'CANCELLED') FROM orders;"
      ]
    },
    {
      keyword: "OVER",
      category: "Query",
      syntax: "funzione() OVER (PARTITION BY ... ORDER BY ...)",
      description: "Definisce finestra per calcoli analitici senza collassare le righe.",
      examples: [
        "SELECT customer_id, SUM(total_amount) OVER (PARTITION BY customer_id) AS customer_total FROM orders;",
        "SELECT order_date, LAG(total_amount) OVER (ORDER BY order_date) FROM orders;"
      ]
    },
    {
      keyword: "ROW_NUMBER",
      category: "Query",
      syntax: "ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)",
      description: "Numerazione progressiva, utile per dedup e top-N per gruppo.",
      examples: [
        "SELECT id, ROW_NUMBER() OVER (ORDER BY total_amount DESC) AS rn FROM orders;",
        "SELECT * FROM (SELECT customer_id, total_amount, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY total_amount DESC) rn FROM orders) x WHERE rn = 1;"
      ]
    },
    {
      keyword: "LAG",
      category: "Query",
      syntax: "LAG(colonna, offset, default) OVER (...)",
      description: "Legge il valore della riga precedente nella stessa finestra.",
      examples: [
        "SELECT order_date, total_amount, LAG(total_amount) OVER (ORDER BY order_date) AS prev_total FROM orders;",
        "SELECT month, revenue - LAG(revenue) OVER (ORDER BY month) AS delta FROM monthly_kpi;"
      ]
    },
    {
      keyword: "LEAD",
      category: "Query",
      syntax: "LEAD(colonna, offset, default) OVER (...)",
      description: "Legge il valore della riga successiva nella stessa finestra.",
      examples: [
        "SELECT order_date, total_amount, LEAD(total_amount) OVER (ORDER BY order_date) AS next_total FROM orders;",
        "SELECT shipped_at, LEAD(shipped_at) OVER (ORDER BY shipped_at) FROM shipments;"
      ]
    },
    {
      keyword: "INSERT",
      category: "DML",
      syntax: "INSERT INTO tabella (c1, c2) VALUES (v1, v2);",
      description: "Inserisce nuove righe in una tabella.",
      examples: [
        "INSERT INTO campaigns (name, channel, start_date, end_date, budget, status) VALUES ('Promo', 'EMAIL', '2026-01-01', '2026-02-01', 5000, 'PLANNED');"
      ]
    },
    {
      keyword: "UPDATE",
      category: "DML",
      syntax: "UPDATE tabella SET col = valore WHERE condizione;",
      description: "Aggiorna righe esistenti.",
      examples: [
        "UPDATE products SET is_active = 0 WHERE stock = 0;",
        "UPDATE orders SET status = 'REFUNDED' WHERE id = 10;"
      ]
    },
    {
      keyword: "DELETE",
      category: "DML",
      syntax: "DELETE FROM tabella WHERE condizione;",
      description: "Rimuove righe esistenti.",
      examples: [
        "DELETE FROM customer_notes WHERE note_date < '2023-01-01';",
        "DELETE FROM support_tickets WHERE status = 'CLOSED' AND closed_at < '2024-01-01';"
      ]
    },
    {
      keyword: "BEGIN",
      category: "Transazioni",
      syntax: "BEGIN TRANSACTION;",
      description: "Apre un blocco atomico di operazioni.",
      examples: [
        "BEGIN; UPDATE products SET stock = stock - 2 WHERE id = 10; COMMIT;",
        "BEGIN; UPDATE orders SET status = 'PAID' WHERE id = 44; ROLLBACK;"
      ]
    },
    {
      keyword: "COMMIT",
      category: "Transazioni",
      syntax: "COMMIT;",
      description: "Conferma tutte le modifiche della transazione corrente.",
      examples: [
        "BEGIN; UPDATE products SET stock = stock + 5 WHERE id = 4; COMMIT;"
      ]
    },
    {
      keyword: "ROLLBACK",
      category: "Transazioni",
      syntax: "ROLLBACK;",
      description: "Annulla modifiche non confermate.",
      examples: [
        "BEGIN; UPDATE orders SET status = 'CANCELLED' WHERE id = 8; ROLLBACK;"
      ]
    },
    {
      keyword: "CREATE TABLE",
      category: "DDL",
      syntax: "CREATE TABLE nome (colonna tipo vincoli...);",
      description: "Definisce una nuova tabella con struttura e vincoli.",
      examples: [
        "CREATE TABLE audit_log (id INTEGER PRIMARY KEY, event TEXT NOT NULL, created_at TEXT NOT NULL);"
      ]
    },
    {
      keyword: "ALTER TABLE",
      category: "DDL",
      syntax: "ALTER TABLE nome ADD COLUMN colonna tipo;",
      description: "Evolve una tabella esistente.",
      examples: [
        "ALTER TABLE customers ADD COLUMN churn_risk REAL;"
      ]
    },
    {
      keyword: "CREATE INDEX",
      category: "DDL",
      syntax: "CREATE INDEX idx_nome ON tabella(colonna1, colonna2);",
      description: "Accelera filtri, join e ordinamenti su colonne usate spesso.",
      examples: [
        "CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date);"
      ]
    },
    {
      keyword: "EXPLAIN",
      category: "Avanzato/SQLite",
      syntax: "EXPLAIN QUERY PLAN SELECT ...;",
      description: "Mostra il piano di esecuzione, utile per tuning.",
      examples: [
        "EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 10;",
        "EXPLAIN QUERY PLAN SELECT * FROM inventory_movements WHERE movement_type = 'OUT';"
      ]
    }
  ];
}

function getExtendedKeywords() {
  return [
    "ABORT", "ACTION", "ADD", "AFTER", "ALL", "ALTER", "ALWAYS", "ANALYZE", "AND", "ANY", "AS", "ASC", "ATTACH", "AUTOINCREMENT",
    "BEFORE", "BEGIN", "BETWEEN", "BY", "CASCADE", "CASE", "CAST", "CONVERT", "TRY_CONVERT", "CHECK", "COLLATE", "COLUMN", "COMMIT", "CONFLICT",
    "CONSTRAINT", "CREATE", "CROSS", "CURRENT", "CURRENT_DATE", "CURRENT_TIME", "CURRENT_TIMESTAMP", "DATABASE", "DEFAULT",
    "DEFERRABLE", "DEFERRED", "DELETE", "DESC", "DETACH", "DISTINCT", "DO", "DROP", "EACH", "ELSE", "END", "ESCAPE", "EXCEPT",
    "EXCLUDE", "EXISTS", "EXPLAIN", "FAIL", "FILTER", "FIRST", "FOLLOWING", "FOR", "FOREIGN", "FROM", "FULL", "FUNCTION", "GENERATED",
    "GLOB", "GRANT", "GROUP", "GROUPS", "HAVING", "IF", "IGNORE", "IMMEDIATE", "IN", "INDEX", "INDEXED", "INITIALLY", "INNER", "INSERT",
    "INSTEAD", "INTERSECT", "INTO", "IS", "ISNULL", "JOIN", "KEY", "LAST", "LEFT", "LIKE", "LIMIT", "LOOP", "MATCH", "MATERIALIZED",
    "MERGE", "NATURAL", "NO", "NOT", "NOTHING", "NOTNULL", "NULL", "NULLS", "OF", "OFFSET", "ON", "OPEN", "OR", "ORDER", "OTHERS", "OUTER",
    "OVER", "PARTITION", "PLAN", "PRAGMA", "PRECEDING", "PRIMARY", "PROCEDURE", "QUERY", "RAISE", "RANGE", "RECURSIVE", "REFERENCES", "REGEXP",
    "REINDEX", "RELEASE", "RENAME", "REPLACE", "RESTRICT", "RETURNING", "REVOKE", "RIGHT", "ROLE", "ROLLBACK", "ROW", "ROWS", "SAVEPOINT", "SCHEMA", "SELECT",
    "SET", "TABLE", "TEMP", "TEMPORARY", "THEN", "TIES", "TO", "TRANSACTION", "TRIGGER", "TRUNCATE", "UNBOUNDED", "UNION", "UNIQUE", "UPDATE", "USER",
    "USING", "VACUUM", "VALUES", "VIEW", "VIRTUAL", "WHEN", "WHERE", "WHILE", "WINDOW", "WITH", "WITHOUT"
  ];
}
