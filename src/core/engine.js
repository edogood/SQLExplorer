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

function createDemoDb(SQL) {
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
      churn_risk REAL,
      created_at TEXT,
      rbac_role TEXT
    );
    CREATE TABLE product_categories (
      id INTEGER PRIMARY KEY,
      name TEXT
    );
    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      name TEXT,
      category_id INTEGER,
      sku TEXT,
      cost_price REAL,
      price REAL,
      currency TEXT,
      is_active INTEGER,
      FOREIGN KEY(category_id) REFERENCES product_categories(id)
    );
    CREATE TABLE product_prices_history (
      id INTEGER PRIMARY KEY,
      product_id INTEGER,
      effective_from TEXT,
      price REAL,
      currency TEXT,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
    CREATE TABLE stores (
      id INTEGER PRIMARY KEY,
      name TEXT,
      channel TEXT,
      city TEXT
    );
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER,
      store_id INTEGER,
      order_date TEXT,
      status TEXT,
      total_amount REAL,
      currency TEXT,
      payment_status TEXT,
      shipping_status TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(store_id) REFERENCES stores(id)
    );
    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      unit_price REAL,
      discount_pct REAL,
      tax_amount REAL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
    CREATE TABLE payments (
      id INTEGER PRIMARY KEY,
      order_id INTEGER,
      paid_at TEXT,
      amount REAL,
      method TEXT,
      status TEXT,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );
    CREATE TABLE refunds (
      id INTEGER PRIMARY KEY,
      order_id INTEGER,
      order_item_id INTEGER,
      refund_at TEXT,
      amount REAL,
      reason TEXT,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(order_item_id) REFERENCES order_items(id)
    );
    CREATE TABLE carriers (
      id INTEGER PRIMARY KEY,
      name TEXT,
      mode TEXT
    );
    CREATE TABLE shipments (
      id INTEGER PRIMARY KEY,
      order_id INTEGER,
      carrier_id INTEGER,
      shipped_at TEXT,
      delivered_at TEXT,
      status TEXT,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(carrier_id) REFERENCES carriers(id)
    );
    CREATE TABLE inventory_movements (
      id INTEGER PRIMARY KEY,
      product_id INTEGER,
      store_id INTEGER,
      movement_date TEXT,
      quantity INTEGER,
      movement_type TEXT,
      source TEXT,
      FOREIGN KEY(product_id) REFERENCES products(id),
      FOREIGN KEY(store_id) REFERENCES stores(id)
    );
    CREATE TABLE employees (
      id INTEGER PRIMARY KEY,
      store_id INTEGER,
      name TEXT,
      role TEXT,
      hired_at TEXT,
      salary REAL,
      FOREIGN KEY(store_id) REFERENCES stores(id)
    );
    CREATE TABLE events (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER,
      event_type TEXT,
      event_time TEXT,
      session_id TEXT,
      metadata TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );
    CREATE TABLE currency_rates (
      id INTEGER PRIMARY KEY,
      rate_date TEXT,
      currency TEXT,
      usd_rate REAL
    );
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY,
      entity TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('INSERT','UPDATE','DELETE')),
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE customer_notes (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER,
      note_date TEXT,
      note_type TEXT,
      note_text TEXT,
      author_employee_id INTEGER,
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(author_employee_id) REFERENCES employees(id)
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
  const channels = ['online', 'physical'];
  const cities = ['Milan', 'Rome', 'Paris', 'Berlin', 'Madrid', 'London', 'New York', 'Toronto'];
  const orderStatuses = ['PAID', 'SHIPPED', 'REFUNDED', 'PENDING'];
  const paymentStatuses = ['PAID', 'PARTIAL', 'DECLINED'];
  const shippingStatuses = ['CREATED', 'SHIPPED', 'DELIVERED', 'RETURNED'];
  const currencies = ['EUR', 'USD', 'GBP'];
  const methods = ['card', 'paypal', 'wire', 'cash'];
  const eventTypes = ['pageview', 'add_to_cart', 'purchase', 'refund', 'login', 'signup'];

  db.run('BEGIN');
  segments.forEach((seg, idx) => {
    db.run('INSERT INTO customer_segments (id, code, description) VALUES (?, ?, ?)', [idx + 1, seg.code, seg.desc]);
  });

  for (let i = 1; i <= 400; i += 1) {
    const segment = segments[i % segments.length].code;
    const country = countries[i % countries.length];
    const credit = Number((2000 + rnd() * 48000).toFixed(2));
    const churn = Number((rnd() * 0.9).toFixed(3));
    const role = roles[i % roles.length];
    const createdMonth = String(1 + (i % 12)).padStart(2, '0');
    const createdDay = String(1 + (i % 27)).padStart(2, '0');
    db.run(
      'INSERT INTO customers (id, name, segment, country, credit_limit, churn_risk, created_at, rbac_role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [i, `Customer ${i}`, segment, country, credit, churn, `2025-${createdMonth}-${createdDay}`, role]
    );
  }

  categories.forEach((name, idx) => {
    db.run('INSERT INTO product_categories (id, name) VALUES (?, ?)', [idx + 1, name]);
  });

  for (let i = 1; i <= 240; i += 1) {
    const category = 1 + (i % categories.length);
    const sku = `SKU-${String(i).padStart(4, '0')}`;
    const cost = Number((10 + rnd() * 250).toFixed(2));
    const price = Number((cost * (1.3 + rnd() * 0.9)).toFixed(2));
    const currency = currencies[i % currencies.length];
    const active = i % 17 !== 0 ? 1 : 0;
    db.run(
      'INSERT INTO products (id, name, category_id, sku, cost_price, price, currency, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [i, `Product ${i}`, category, sku, cost, price, currency, active]
    );
    // price history: last 3 months
    for (let m = 0; m < 3; m += 1) {
      const month = String(12 - m).padStart(2, '0');
      const histPrice = Number((price * (1 - m * 0.03 + rnd() * 0.02)).toFixed(2));
      db.run(
        'INSERT INTO product_prices_history (product_id, effective_from, price, currency) VALUES (?, ?, ?, ?)',
        [i, `2025-${month}-01`, histPrice, currency]
      );
    }
  }

  for (let i = 1; i <= 14; i += 1) {
    db.run('INSERT INTO stores (id, name, channel, city) VALUES (?, ?, ?, ?)', [
      i,
      `Store ${i}`,
      channels[i % channels.length],
      cities[i % cities.length]
    ]);
  }

  let orderId = 1;
  let orderItemId = 1;
  let paymentId = 1;
  let refundId = 1;
  let shipmentId = 1;
  let inventoryId = 1;
  let eventId = 1;
  let noteId = 1;

  const carriers = ['DHL', 'UPS', 'FedEx', 'Poste', 'GLS'];
  carriers.forEach((c, idx) => {
    db.run('INSERT INTO carriers (id, name, mode) VALUES (?, ?, ?)', [idx + 1, c, idx % 2 === 0 ? 'air' : 'ground']);
  });

  for (let i = 1; i <= 40; i += 1) {
    const storeId = 1 + (i % 14);
    const hiredMonth = String(1 + (i % 12)).padStart(2, '0');
    db.run('INSERT INTO employees (id, store_id, name, role, hired_at, salary) VALUES (?, ?, ?, ?, ?, ?)', [
      i,
      storeId,
      `Employee ${i}`,
      roles[i % roles.length],
      `2024-${hiredMonth}-15`,
      Number((32000 + rnd() * 28000).toFixed(2))
    ]);
  }

  function randomCurrency() {
    return currencies[Math.floor(rnd() * currencies.length)];
  }

  for (let i = 1; i <= 3600; i += 1) {
    const customerId = 1 + Math.floor(rnd() * 400);
    const storeId = 1 + Math.floor(rnd() * 14);
    const month = String(1 + Math.floor(rnd() * 12)).padStart(2, '0');
    const day = String(1 + Math.floor(rnd() * 28)).padStart(2, '0');
    const status = orderStatuses[i % orderStatuses.length];
    const currency = randomCurrency();
    const paymentStatus = paymentStatuses[i % paymentStatuses.length];
    const shippingStatus = shippingStatuses[i % shippingStatuses.length];
    const orderDate = `2025-${month}-${day}`;
    let orderTotal = 0;

    db.run(
      'INSERT INTO orders (id, customer_id, store_id, order_date, status, total_amount, currency, payment_status, shipping_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [orderId, customerId, storeId, orderDate, status, 0, currency, paymentStatus, shippingStatus]
    );

    const itemsCount = 1 + Math.floor(rnd() * 4);
    for (let k = 0; k < itemsCount; k += 1) {
      const productId = 1 + Math.floor(rnd() * 240);
      const qty = 1 + Math.floor(rnd() * 4);
      const unitPrice = Number((20 + rnd() * 380).toFixed(2));
      const discount = Number((rnd() * 0.25).toFixed(3));
      const tax = Number((unitPrice * qty * 0.22).toFixed(2));
      orderTotal += Number((unitPrice * qty * (1 - discount) + tax).toFixed(2));
      db.run(
        'INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, discount_pct, tax_amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [orderItemId, orderId, productId, qty, unitPrice, discount, tax]
      );
      orderItemId += 1;
    }

    db.run('UPDATE orders SET total_amount = ? WHERE id = ?', [orderTotal, orderId]);

    const paidAmount = paymentStatus === 'DECLINED' ? 0 : Number((orderTotal * (paymentStatus === 'PARTIAL' ? 0.6 : 1)).toFixed(2));
    db.run(
      'INSERT INTO payments (id, order_id, paid_at, amount, method, status) VALUES (?, ?, ?, ?, ?, ?)',
      [
        paymentId,
        orderId,
        `2025-${month}-${String(Number(day) + 1).padStart(2, '0')}`,
        paidAmount,
        methods[i % methods.length],
        paymentStatus
      ]
    );
    paymentId += 1;

    if (status === 'REFUNDED' && paidAmount > 0 && rnd() > 0.5) {
      const refundVal = Number((paidAmount * (0.2 + rnd() * 0.6)).toFixed(2));
      db.run(
        'INSERT INTO refunds (id, order_id, order_item_id, refund_at, amount, reason) VALUES (?, ?, ?, ?, ?, ?)',
        [
          refundId,
          orderId,
          orderItemId - 1,
          `2025-${month}-${String(Number(day) + 3).padStart(2, '0')}`,
          refundVal,
          'customer_return'
        ]
      );
      refundId += 1;
    }

    db.run(
      'INSERT INTO shipments (id, order_id, carrier_id, shipped_at, delivered_at, status) VALUES (?, ?, ?, ?, ?, ?)',
      [
        shipmentId,
        orderId,
        1 + (orderId % carriers.length),
        `2025-${month}-${String(Number(day) + 1).padStart(2, '0')}`,
        `2025-${month}-${String(Number(day) + 4).padStart(2, '0')}`,
        shippingStatus
      ]
    );
    shipmentId += 1;

    // events per order
    const eventCount = 2 + Math.floor(rnd() * 4);
    for (let e = 0; e < eventCount; e += 1) {
      const etype = eventTypes[(i + e) % eventTypes.length];
      db.run(
        'INSERT INTO events (id, customer_id, event_type, event_time, session_id, metadata) VALUES (?, ?, ?, ?, ?, ?)',
        [
          eventId,
          customerId,
          etype,
          `2025-${month}-${String(Number(day) + e).padStart(2, '0')}T10:${String(10 + e).padStart(2, '0')}:00`,
          `sess-${customerId}-${orderId}`,
          etype === 'add_to_cart' ? '{"cart_size":1}' : '{}'
        ]
      );
      eventId += 1;
    }

    // inventory movement
    const movementQty = 1 + Math.floor(rnd() * 6);
    db.run(
      'INSERT INTO inventory_movements (id, product_id, store_id, movement_date, quantity, movement_type, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        inventoryId,
        1 + Math.floor(rnd() * 240),
        storeId,
        `2025-${month}-${day}`,
        -movementQty,
        'sale',
        'order'
      ]
    );
    inventoryId += 1;

    if (rnd() > 0.75) {
      db.run(
        'INSERT INTO audit_log (entity, event_type, payload, created_at) VALUES (?, ?, ?, ?)',
        ['orders', 'UPDATE', `{"order_id":${orderId},"status":"${status}"}`, `2025-${month}-${day}T12:00:00`]
      );
    }

    if (rnd() > 0.8) {
      db.run(
        'INSERT INTO customer_notes (id, customer_id, note_date, note_type, note_text, author_employee_id) VALUES (?, ?, ?, ?, ?, ?)',
        [
          noteId,
          customerId,
          `2025-${month}-${day}`,
          'followup',
          'Reminder: validate payment method',
          1 + Math.floor(rnd() * 30)
        ]
      );
      noteId += 1;
    }

    orderId += 1;
  }

  // currency rates last 5 months for three currencies
  let rateId = 1;
  for (let m = 1; m <= 5; m += 1) {
    const month = String(13 - m).padStart(2, '0');
    currencies.forEach((cur) => {
      const base = cur === 'EUR' ? 1.08 : cur === 'GBP' ? 1.26 : 1;
      db.run('INSERT INTO currency_rates (id, rate_date, currency, usd_rate) VALUES (?, ?, ?, ?)', [
        rateId,
        `2025-${month}-01`,
        cur,
        Number((base + rnd() * 0.05).toFixed(4))
      ]);
      rateId += 1;
    });
  }

  db.run('CREATE INDEX idx_orders_customer ON orders(customer_id)');
  db.run('CREATE INDEX idx_orders_status ON orders(status)');
  db.run('CREATE INDEX idx_order_items_order ON order_items(order_id)');
  db.run('CREATE INDEX idx_order_items_product ON order_items(product_id)');
  db.run('CREATE INDEX idx_payments_order ON payments(order_id)');
  db.run('CREATE INDEX idx_refunds_order ON refunds(order_id)');
  db.run('CREATE INDEX idx_shipments_order ON shipments(order_id)');
  db.run('CREATE INDEX idx_events_customer ON events(customer_id)');
  db.run('CREATE INDEX idx_products_category ON products(category_id)');
  db.run('CREATE INDEX idx_inventory_product ON inventory_movements(product_id)');

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
