import { save, load, clear, getStatus } from './persist.js';

function seeded(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function quoteIdent(name) {
  return `'${String(name).replaceAll("'", "''")}'`;
}

function safeTableName(name) {
  const sanitized = String(name || '').replace(/[^A-Za-z0-9_]/g, '');
  return sanitized || 'temp';
}

export function createDemoDb(SQL) {
  const db = new SQL.Database();
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE customer_segments (
      id INTEGER PRIMARY KEY,
      code TEXT UNIQUE,
      description TEXT
    );
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY,
      name TEXT,
      segment TEXT,
      country TEXT,
      credit_limit REAL,
      email TEXT,
      phone TEXT,
      created_at TEXT
    );
    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      name TEXT,
      category TEXT,
      price REAL,
      cost_price REAL,
      active INTEGER,
      created_at TEXT
    );
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER,
      name TEXT,
      order_date TEXT,
      status TEXT,
      currency TEXT,
      total_amount REAL,
      discount_amount REAL,
      channel TEXT,
      store_id INTEGER,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );
    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      unit_price REAL,
      discount_pct REAL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
    CREATE TABLE payments (
      id INTEGER PRIMARY KEY,
      order_id INTEGER,
      method TEXT,
      paid_at TEXT,
      amount REAL,
      status TEXT,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );
    CREATE TABLE shipments (
      id INTEGER PRIMARY KEY,
      order_id INTEGER,
      shipped_at TEXT,
      carrier TEXT,
      shipping_cost REAL,
      delivered_at TEXT,
      status TEXT,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );
    CREATE TABLE returns (
      id INTEGER PRIMARY KEY,
      order_id INTEGER,
      returned_at TEXT,
      reason TEXT,
      refund_amount REAL,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );
    CREATE TABLE events (
      event_id INTEGER PRIMARY KEY,
      user_id INTEGER,
      session_id TEXT,
      event_time TEXT,
      event_type TEXT,
      page TEXT,
      referrer TEXT,
      device TEXT
    );
    CREATE TABLE dim_date (
      date TEXT PRIMARY KEY,
      year INTEGER,
      month INTEGER,
      day INTEGER,
      week INTEGER,
      dow INTEGER
    );
    CREATE TABLE fact_orders (
      order_id INTEGER PRIMARY KEY,
      date TEXT,
      customer_id INTEGER,
      total_amount REAL,
      status TEXT,
      channel TEXT,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(date) REFERENCES dim_date(date),
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );
  `);

  const rnd = seeded(42);
  const segments = [
    { code: 'SMB', desc: 'Small business' },
    { code: 'MID', desc: 'Mid market B2B' },
    { code: 'ENT', desc: 'Enterprise' },
    { code: 'CONS', desc: 'Consumer' },
    { code: 'PART', desc: 'Partner / reseller' }
  ];
  const countries = ['Italy', 'Spain', 'France', 'Germany', 'USA', 'UK', 'Canada', 'Brazil'];
  const roles = ['viewer', 'analyst', 'manager', 'admin'];
  const categories = ['Software', 'Hardware', 'Service', 'Training', 'Accessories', 'Cloud', 'Support', 'Licenses'];
  const channels = ['online', 'physical', 'partner'];
  const cities = ['Milan', 'Rome', 'Paris', 'Berlin', 'Madrid', 'London', 'New York', 'Toronto'];
  const orderStatuses = ['PAID', 'SHIPPED', 'REFUNDED', 'PENDING', 'CANCELLED'];
  const paymentStatuses = ['PAID', 'PARTIAL', 'DECLINED'];
  const shippingStatuses = ['CREATED', 'SHIPPED', 'DELIVERED', 'RETURNED'];
  const currencies = ['EUR', 'USD', 'GBP'];
  const methods = ['card', 'paypal', 'wire', 'cash'];
  const eventTypes = ['pageview', 'add_to_cart', 'purchase', 'refund', 'login', 'signup', 'support'];

  db.run('BEGIN');
  segments.forEach((seg, idx) => {
    db.run('INSERT INTO customer_segments (id, code, description) VALUES (?, ?, ?)', [idx + 1, seg.code, seg.desc]);
  });

  for (let i = 1; i <= 400; i += 1) {
    const segment = segments[i % segments.length].code;
    const country = countries[i % countries.length];
    const credit = Number((2000 + rnd() * 48000).toFixed(2));
    const email = i % 50 === 0 ? null : `customer${i}@example.com`;
    const phone = i % 33 === 0 ? null : `+39-02-${String(100000 + i).slice(-6)}`;
    const createdMonth = String(1 + (i % 12)).padStart(2, '0');
    const createdDay = String(1 + (i % 27)).padStart(2, '0');
    db.run(
      'INSERT INTO customers (id, name, segment, country, credit_limit, email, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [i, `Customer ${i}`, segment, country, credit, email, phone, `2024-${createdMonth}-${createdDay}`]
    );
  }

  for (let i = 1; i <= 240; i += 1) {
    const category = categories[i % categories.length];
    const cost = Number((10 + rnd() * 250).toFixed(2));
    const price = Number((cost * (1.2 + rnd() * 1.1)).toFixed(2));
    const active = i % 19 !== 0 ? 1 : 0;
    const createdMonth = String(1 + (i % 12)).padStart(2, '0');
    db.run(
      'INSERT INTO products (id, name, category, price, cost_price, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [i, `Product ${i}`, category, price, cost, active, `2024-${createdMonth}-01`]
    );
  }

  let orderId = 1;
  let orderItemId = 1;
  let paymentId = 1;
  let returnId = 1;
  let shipmentId = 1;
  let eventId = 1;

  function randomCurrency() {
    return currencies[Math.floor(rnd() * currencies.length)];
  }

  function generateDates() {
    const month = String(1 + Math.floor(rnd() * 12)).padStart(2, '0');
    const day = String(1 + Math.floor(rnd() * 28)).padStart(2, '0');
    return { month, day, date: `2025-${month}-${day}` };
  }

  function ensureDimDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const jsDate = new Date(y, m - 1, d);
    const startOfYear = new Date(y, 0, 1);
    const dayOfYear = Math.floor((jsDate - startOfYear) / 86400000) + 1;
    const week = Math.max(1, Math.ceil(dayOfYear / 7));
    db.run('INSERT OR IGNORE INTO dim_date (date, year, month, day, week, dow) VALUES (?, ?, ?, ?, ?, ?)', [
      dateStr,
      y,
      m,
      d,
      week,
      jsDate.getDay()
    ]);
  }

  for (let i = 1; i <= 4200; i += 1) {
    const { month, day, date } = generateDates();
    const customerId = 1 + Math.floor(rnd() * 400);
    const status = orderStatuses[i % orderStatuses.length];
    const currency = randomCurrency();
    const channel = channels[i % channels.length];
    const discountAmount = Number((rnd() * 30).toFixed(2));
    let orderTotal = 0;

    db.run(
      'INSERT INTO orders (id, customer_id, name, order_date, status, currency, total_amount, discount_amount, channel, store_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [orderId, customerId, `Order ${orderId}`, date, status, currency, 0, discountAmount, channel, 1 + (i % 14)]
    );

    const itemsCount = 1 + Math.floor(rnd() * 4);
    for (let k = 0; k < itemsCount; k += 1) {
      const productId = 1 + Math.floor(rnd() * 240);
      const qty = 1 + Math.floor(rnd() * 4);
      const unitPrice = Number((20 + rnd() * 380).toFixed(2));
      const discount = Number((rnd() * 0.25).toFixed(3));
      orderTotal += Number((unitPrice * qty * (1 - discount)).toFixed(2));
      db.run(
        'INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, discount_pct) VALUES (?, ?, ?, ?, ?, ?)',
        [orderItemId, orderId, productId, qty, unitPrice, discount]
      );
      orderItemId += 1;
    }

    // Inject controlled outliers and nulls
    if (i % 700 === 0) orderTotal = orderTotal * 6;
    if (i % 555 === 0) orderTotal = null;

    db.run('UPDATE orders SET total_amount = ? WHERE id = ?', [orderTotal, orderId]);

    const paidAmount =
      status === 'CANCELLED'
        ? 0
        : Number(((orderTotal || 0) * (paymentStatuses[i % paymentStatuses.length] === 'PARTIAL' ? 0.6 : 1)).toFixed(2));
    db.run(
      'INSERT INTO payments (id, order_id, method, paid_at, amount, status) VALUES (?, ?, ?, ?, ?, ?)',
      [paymentId, orderId, methods[i % methods.length], `2025-${month}-${String(Number(day) + 1).padStart(2, '0')}`, paidAmount, paymentStatuses[i % paymentStatuses.length]]
    );
    paymentId += 1;

    db.run(
      'INSERT INTO shipments (id, order_id, shipped_at, carrier, shipping_cost, delivered_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        shipmentId,
        orderId,
        `2025-${month}-${String(Number(day) + 1).padStart(2, '0')}`,
        ['DHL', 'UPS', 'FedEx', 'Poste', 'GLS'][orderId % 5],
        Number((5 + rnd() * 20).toFixed(2)),
        `2025-${month}-${String(Number(day) + 4).padStart(2, '0')}`,
        shippingStatuses[i % shippingStatuses.length]
      ]
    );
    shipmentId += 1;

    if (status === 'REFUNDED' && rnd() > 0.4) {
      const refundVal = Number(((paidAmount || 0) * (0.2 + rnd() * 0.6)).toFixed(2));
      db.run(
        'INSERT INTO returns (id, order_id, returned_at, reason, refund_amount) VALUES (?, ?, ?, ?, ?)',
        [returnId, orderId, `2025-${month}-${String(Number(day) + 3).padStart(2, '0')}`, 'customer_return', refundVal]
      );
      returnId += 1;
    }

    // events per order with duplicate session injection
    const eventCount = 2 + Math.floor(rnd() * 4);
    for (let e = 0; e < eventCount; e += 1) {
      const etype = eventTypes[(i + e) % eventTypes.length];
      const sessionId = `sess-${customerId}-${Math.floor(orderId / 3)}`;
      const referrer = e === 0 ? 'ads' : e === 1 ? 'email' : 'direct';
      db.run(
        'INSERT INTO events (event_id, user_id, session_id, event_time, event_type, page, referrer, device) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          eventId,
          customerId,
          sessionId,
          `${date}T10:${String(10 + e).padStart(2, '0')}:00`,
          etype,
          ['/home', '/product', '/cart', '/checkout'][e % 4],
          referrer,
          ['mobile', 'desktop'][e % 2]
        ]
      );
      // controlled duplicate
      if (e === 0 && i % 200 === 0) {
        db.run(
          'INSERT INTO events (event_id, user_id, session_id, event_time, event_type, page, referrer, device) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            eventId + 100000,
            customerId,
            sessionId,
            `${date}T10:${String(10 + e).padStart(2, '0')}:05`,
            etype,
            '/home',
            referrer,
            'mobile'
          ]
        );
      }
      eventId += 1;
    }

    ensureDimDate(date);
    db.run('INSERT INTO fact_orders (order_id, date, customer_id, total_amount, status, channel) VALUES (?, ?, ?, ?, ?, ?)', [
      orderId,
      date,
      customerId,
      orderTotal,
      status,
      channel
    ]);

    orderId += 1;
  }

  // populate remaining dim_date gaps across 2025
  for (let m = 1; m <= 12; m += 1) {
    for (let d = 1; d <= 28; d += 1) {
      ensureDimDate(`2025-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
  }

  db.run('CREATE INDEX idx_orders_customer ON orders(customer_id)');
  db.run('CREATE INDEX idx_orders_status ON orders(status)');
  db.run('CREATE INDEX idx_orders_date ON orders(order_date)');
  db.run('CREATE INDEX idx_order_items_order ON order_items(order_id)');
  db.run('CREATE INDEX idx_order_items_product ON order_items(product_id)');
  db.run('CREATE INDEX idx_payments_order ON payments(order_id)');
  db.run('CREATE INDEX idx_returns_order ON returns(order_id)');
  db.run('CREATE INDEX idx_shipments_order ON shipments(order_id)');
  db.run('CREATE INDEX idx_events_user ON events(user_id)');
  db.run('CREATE INDEX idx_events_session ON events(session_id)');
  db.run('CREATE INDEX idx_events_time ON events(event_time)');

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

  function describeTable(name) {
    const tbl = safeTableName(name);
    const columnsResult = db.exec(`PRAGMA table_info(${quoteIdent(tbl)})`);
    const columnsRows = columnsResult[0] ? columnsResult[0].values : [];
    const fkResult = db.exec(`PRAGMA foreign_key_list(${quoteIdent(tbl)})`);
    const fkRows = fkResult[0] ? fkResult[0].values : [];

    const columns = columnsRows.map((row) => ({
      cid: row[0],
      name: row[1],
      type: row[2],
      notnull: row[3] === 1,
      defaultValue: row[4],
      pk: row[5] === 1,
      fk: fkRows.find((fk) => fk[3] === row[1])
        ? {
            table: fkRows.find((fk) => fk[3] === row[1])[2],
            column: fkRows.find((fk) => fk[3] === row[1])[4]
          }
        : null
    }));

    const foreignKeys = fkRows.map((fk) => ({
      id: fk[0],
      seq: fk[1],
      table: fk[2],
      from: fk[3],
      to: fk[4]
    }));

    return { name: tbl, columns, foreignKeys };
  }

  function describe() {
    const tables = getTables().map(describeTable);
    const edges = tables
      .flatMap((t) =>
        t.foreignKeys.map((fk) => ({
          from: t.name,
          to: fk.table,
          fromColumn: fk.from,
          toColumn: fk.to
        }))
      )
      .filter((edge) => tables.find((t) => t.name === edge.to));
    return { tables, edges };
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

  return {
    execute,
    queryRows,
    getTables,
    describe,
    resetDemo,
    persist,
    clear: clear
  };
}
