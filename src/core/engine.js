import { save, load, clear, getStatus } from './persist.js';

function seeded(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function createDemoDb(SQL) {
  const db = new SQL.Database();
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, segment TEXT);
    CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL);
    CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT, total_amount REAL, status TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id));
    CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER, product_id INTEGER, quantity INTEGER, unit_price REAL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id));
  `);

  const rnd = seeded(42);
  const segments = ['SMB', 'Mid-Market', 'Enterprise'];
  const statuses = ['PAID', 'SHIPPED', 'REFUNDED', 'PENDING'];
  const categories = ['Software', 'Hardware', 'Service'];

  db.run('BEGIN');
  for (let i = 1; i <= 20; i += 1) {
    db.run('INSERT INTO customers VALUES (?, ?, ?)', [i, `Customer ${i}`, segments[i % segments.length]]);
  }
  for (let i = 1; i <= 30; i += 1) {
    const price = Number((20 + rnd() * 500).toFixed(2));
    db.run('INSERT INTO products VALUES (?, ?, ?, ?)', [i, `Product ${i}`, categories[i % categories.length], price]);
  }
  for (let i = 1; i <= 120; i += 1) {
    const cid = 1 + (i % 20);
    const month = String(1 + (i % 9)).padStart(2, '0');
    const day = String(1 + (i % 27)).padStart(2, '0');
    const total = Number((50 + rnd() * 2000).toFixed(2));
    db.run('INSERT INTO orders VALUES (?, ?, ?, ?, ?)', [i, cid, `2026-${month}-${day}`, total, statuses[i % statuses.length]]);
    const pid = 1 + (i % 30);
    db.run('INSERT INTO order_items VALUES (?, ?, ?, ?, ?)', [i, i, pid, 1 + (i % 5), Number((10 + rnd() * 120).toFixed(2))]);
  }
  db.run('COMMIT');
  return db;
}

const mutatingRegex = /\b(insert|update|delete|create|drop|alter|replace|begin|commit|rollback|pragma)\b/i;

export async function createEngine() {
  if (typeof initSqlJs !== 'function') {
    throw new Error('sql.js non e stato caricato');
  }
  const SQL = await initSqlJs({ locateFile: (file) => file });
  const persistSupported = getStatus().supported;
  const persisted = persistSupported ? await load() : null;
  let db = persisted ? new SQL.Database(persisted) : createDemoDb(SQL);
  if (!persisted && persistSupported) await save(db.export());

  async function persist() {
    if (persistSupported) await save(db.export());
  }

  async function resetDemo() {
    if (db) db.close();
    db = createDemoDb(SQL);
    await persist();
  }

  function getTables() {
    const rows = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    return rows[0] ? rows[0].values.map((v) => v[0]) : [];
  }

  function queryRows(sql) {
    const rows = db.exec(sql);
    if (!rows[0]) return { columns: [], rows: [] };
    return { columns: rows[0].columns, rows: rows[0].values };
  }

  async function execute(sql) {
    const result = db.exec(sql);
    const changed = mutatingRegex.test(sql);
    if (changed) await persist();
    return { result, changed };
  }

  return { execute, queryRows, getTables, resetDemo, persist, clear: clear };
}
