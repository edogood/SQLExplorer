/* database-page.js — standalone DB explorer (schema, preview, custom table creator) */

(function () {
  "use strict";

  var state = { SQL: null, db: null, previewTable: "", seed: 981245, productPricingCache: new Map() };
  var dom = {};

  document.addEventListener("DOMContentLoaded", function () {
    cacheDom();
    wireEvents();
    initEngine();
  });

  function cacheDom() {
    dom.dbStatus = document.getElementById("dbStatus");
    dom.tableSelect = document.getElementById("tableSelect");
    dom.tableMeta = document.getElementById("tableMeta");
    dom.tablePreview = document.getElementById("tablePreview");
    dom.dbVisualizer = document.getElementById("dbVisualizer");
    dom.dbVisualizerMeta = document.getElementById("dbVisualizerMeta");
    dom.customTableName = document.getElementById("customTableName");
    dom.customColumns = document.getElementById("customColumns");
    dom.customRows = document.getElementById("customRows");
    dom.createTableBtn = document.getElementById("createTableBtn");
    dom.resultContainer = document.getElementById("resultContainer");
    dom.resetDbBtn = document.getElementById("resetDbBtn");
  }

  function wireEvents() {
    if (dom.tableSelect) dom.tableSelect.addEventListener("change", function () {
      state.previewTable = dom.tableSelect.value;
      renderTablePreview(state.previewTable);
    });
    if (dom.createTableBtn) dom.createTableBtn.addEventListener("click", createCustomTable);
    if (dom.resetDbBtn) dom.resetDbBtn.addEventListener("click", function () {
      DBPersist.clear().then(function () {
        initDemoDatabase();
        persistDB();
        setBadge(dom.dbStatus, "Database demo rigenerato", "success");
      });
    });
  }

  async function initEngine() {
    try {
      setBadge(dom.dbStatus, "Caricamento SQL engine...", "neutral");
      state.SQL = await initSqlJs({
        locateFile: function (file) { return file; }
      });

      var restored = false;
      if (typeof DBPersist !== "undefined") {
        var bytes = await DBPersist.load();
        if (bytes) {
          state.db = new state.SQL.Database(bytes);
          createSqlFunctions();
          restored = true;
        }
      }

      if (!restored) {
        initDemoDatabase();
        persistDB();
      }

      setBadge(dom.dbStatus, "Database pronto", "success");
      refreshTableSelector();
    } catch (error) {
      setBadge(dom.dbStatus, "Errore engine SQL", "error");
      if (dom.resultContainer) dom.resultContainer.innerHTML = '<pre class="error-block">' + escapeHtml(error.message) + "</pre>";
    }
  }

  function persistDB() {
    if (state.db && typeof DBPersist !== "undefined") {
      DBPersist.save(state.db.export());
    }
  }

  /* ---- Demo Database (mirrors app.js) ---- */

  function initDemoDatabase() {
    if (!state.SQL) return;
    if (state.db) state.db.close();
    state.db = new state.SQL.Database();
    state.seed += 997;
    state.productPricingCache = new Map();
    createSqlFunctions();
    createSchema();
    seedRegions(); seedDepartments(); seedEmployees(); seedSuppliers();
    seedCampaigns(); seedWarehouses(); seedCustomers(); seedProducts();
    var ctx = seedOrdersAndItems();
    seedPayments(ctx.orders); seedShipments(ctx.orders);
    seedReturns(ctx.items); seedSupportTickets(ctx.orders);
    seedCustomerNotes(); seedInventoryMovements(ctx.items);
    refreshTableSelector();
  }

  function createSqlFunctions() {
    if (!state.db || typeof state.db.create_function !== "function") return;
    state.db.create_function("CONVERT", function (t, v) { return convertValue(t, v, false); });
    state.db.create_function("TRY_CONVERT", function (t, v) { return convertValue(t, v, true); });
    state.db.create_function("SAFE_DIVIDE", function (n, d) {
      var den = Number(d); if (!Number.isFinite(den) || den === 0) return null; return Number(n) / den;
    });
  }

  function convertValue(targetType, value, softFail) {
    try {
      if (value === null || value === undefined) return null;
      var target = String(targetType || "TEXT").toUpperCase().trim().replace(/^['"]|['"]$/g, "");
      if (["TEXT","STRING","CHAR","NCHAR","VARCHAR","NVARCHAR"].indexOf(target) >= 0) return String(value);
      if (["INT","INTEGER","BIGINT","SMALLINT"].indexOf(target) >= 0) { var p = parseInt(String(value), 10); if (!Number.isFinite(p)) throw new Error("err"); return p; }
      if (["REAL","FLOAT","DOUBLE","NUMERIC","DECIMAL"].indexOf(target) >= 0) { var p2 = parseFloat(String(value)); if (!Number.isFinite(p2)) throw new Error("err"); return p2; }
      if (["BOOL","BOOLEAN"].indexOf(target) >= 0) return Number(value) ? 1 : 0;
      return String(value);
    } catch (_e) { if (softFail) return null; throw new Error("CONVERT fallita verso " + targetType); }
  }

  function createSchema() {
    state.db.run("PRAGMA foreign_keys = ON;");
    state.db.run("CREATE TABLE regions (id INTEGER PRIMARY KEY, name TEXT NOT NULL, market TEXT NOT NULL);");
    state.db.run("CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT NOT NULL, location TEXT NOT NULL, annual_budget REAL NOT NULL);");
    state.db.run("CREATE TABLE employees (id INTEGER PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, department_id INTEGER NOT NULL, manager_id INTEGER, title TEXT NOT NULL, salary REAL NOT NULL, hire_date TEXT NOT NULL, employment_type TEXT NOT NULL, FOREIGN KEY (department_id) REFERENCES departments(id), FOREIGN KEY (manager_id) REFERENCES employees(id));");
    state.db.run("CREATE TABLE suppliers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, country TEXT NOT NULL, rating REAL NOT NULL, payment_terms TEXT NOT NULL);");
    state.db.run("CREATE TABLE campaigns (id INTEGER PRIMARY KEY, name TEXT NOT NULL, channel TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, budget REAL NOT NULL, status TEXT NOT NULL);");
    state.db.run("CREATE TABLE warehouses (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL, region_id INTEGER NOT NULL, capacity INTEGER NOT NULL, FOREIGN KEY (region_id) REFERENCES regions(id));");
    state.db.run("CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, country TEXT NOT NULL, city TEXT NOT NULL, region_id INTEGER NOT NULL, segment TEXT NOT NULL, signup_date TEXT NOT NULL, credit_limit REAL NOT NULL, tier TEXT NOT NULL, FOREIGN KEY (region_id) REFERENCES regions(id));");
    state.db.run("CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, supplier_id INTEGER NOT NULL, sku TEXT NOT NULL UNIQUE, price REAL NOT NULL, cost_price REAL NOT NULL, stock INTEGER NOT NULL, launched_at TEXT NOT NULL, is_active INTEGER NOT NULL, FOREIGN KEY (supplier_id) REFERENCES suppliers(id));");
    state.db.run("CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, employee_id INTEGER NOT NULL, campaign_id INTEGER, order_date TEXT NOT NULL, status TEXT NOT NULL, currency TEXT NOT NULL, channel TEXT NOT NULL, discount_amount REAL NOT NULL, total_amount REAL NOT NULL, FOREIGN KEY (customer_id) REFERENCES customers(id), FOREIGN KEY (employee_id) REFERENCES employees(id), FOREIGN KEY (campaign_id) REFERENCES campaigns(id));");
    state.db.run("CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, product_id INTEGER NOT NULL, warehouse_id INTEGER NOT NULL, quantity INTEGER NOT NULL, unit_price REAL NOT NULL, discount_pct REAL NOT NULL, tax_rate REAL NOT NULL, FOREIGN KEY (order_id) REFERENCES orders(id), FOREIGN KEY (product_id) REFERENCES products(id), FOREIGN KEY (warehouse_id) REFERENCES warehouses(id));");
    state.db.run("CREATE TABLE payments (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, payment_date TEXT NOT NULL, method TEXT NOT NULL, amount REAL NOT NULL, fx_rate REAL NOT NULL, gateway_fee REAL NOT NULL, status TEXT NOT NULL, FOREIGN KEY (order_id) REFERENCES orders(id));");
    state.db.run("CREATE TABLE shipments (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, warehouse_id INTEGER NOT NULL, carrier TEXT NOT NULL, shipped_at TEXT NOT NULL, delivered_at TEXT, status TEXT NOT NULL, tracking_code TEXT NOT NULL UNIQUE, shipping_cost REAL NOT NULL, FOREIGN KEY (order_id) REFERENCES orders(id), FOREIGN KEY (warehouse_id) REFERENCES warehouses(id));");
    state.db.run("CREATE TABLE returns (id INTEGER PRIMARY KEY, order_item_id INTEGER NOT NULL, return_date TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL, refund_amount REAL NOT NULL, FOREIGN KEY (order_item_id) REFERENCES order_items(id));");
    state.db.run("CREATE TABLE inventory_movements (id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL, warehouse_id INTEGER NOT NULL, movement_date TEXT NOT NULL, movement_type TEXT NOT NULL, quantity INTEGER NOT NULL, unit_cost REAL NOT NULL, reference TEXT NOT NULL, FOREIGN KEY (product_id) REFERENCES products(id), FOREIGN KEY (warehouse_id) REFERENCES warehouses(id));");
    state.db.run("CREATE TABLE support_tickets (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, order_id INTEGER, priority TEXT NOT NULL, status TEXT NOT NULL, opened_at TEXT NOT NULL, closed_at TEXT, sla_hours INTEGER NOT NULL, topic TEXT NOT NULL, FOREIGN KEY (customer_id) REFERENCES customers(id), FOREIGN KEY (order_id) REFERENCES orders(id));");
    state.db.run("CREATE TABLE customer_notes (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, note_date TEXT NOT NULL, note_type TEXT NOT NULL, note_text TEXT NOT NULL, author_employee_id INTEGER NOT NULL, FOREIGN KEY (customer_id) REFERENCES customers(id), FOREIGN KEY (author_employee_id) REFERENCES employees(id));");
  }

  /* ---- Seeded random & helpers ---- */
  function seededRandom() { state.seed = (state.seed * 1664525 + 1013904223) % 4294967296; return state.seed / 4294967296; }
  function randomInt(min, max) { return Math.floor(seededRandom() * (max - min + 1)) + min; }
  function pick(list) { return list[randomInt(0, list.length - 1)]; }
  function randomDate(from, to) { var s = new Date(from).getTime(), e = new Date(to).getTime(), d = new Date(Math.floor(s + seededRandom() * (e - s))); return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0"); }
  function slugify(v) { return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function getProductPricing(pid) {
    if (state.productPricingCache.has(pid)) return state.productPricingCache.get(pid);
    var r = state.db.exec("SELECT price, cost_price FROM products WHERE id = " + Number(pid) + " LIMIT 1");
    if (!r.length || !r[0].values.length) return { price: 0, cost: 0 };
    var p = { price: Number(r[0].values[0][0]), cost: Number(r[0].values[0][1]) };
    state.productPricingCache.set(pid, p);
    return p;
  }

  /* ---- Seed functions (compact versions) ---- */
  function seedRegions() { var rows = [[1,"Southern Europe","EMEA"],[2,"DACH","EMEA"],[3,"France + Benelux","EMEA"],[4,"Nordics","EMEA"],[5,"Iberia","EMEA"],[6,"UK + Ireland","EMEA"]]; var s = state.db.prepare("INSERT INTO regions (id, name, market) VALUES (?, ?, ?)"); rows.forEach(function(r){s.run(r);}); s.free(); }
  function seedDepartments() { var rows = [[1,"Sales","Milan",1800000],[2,"Support","Rome",920000],[3,"Operations","Turin",1450000],[4,"Finance","Naples",780000],[5,"R&D","Bologna",2050000],[6,"People","Florence",510000],[7,"Logistics","Genoa",1310000],[8,"Marketing","Verona",990000]]; var s = state.db.prepare("INSERT INTO departments (id, name, location, annual_budget) VALUES (?, ?, ?, ?)"); rows.forEach(function(r){s.run(r);}); s.free(); }
  function seedEmployees() { var fn=["Luca","Anna","Marco","Giulia","Davide","Sara","Paolo","Elisa","Franco","Marta","Fabio","Chiara","Matteo","Irene","Dario","Noemi"]; var ln=["Rossi","Bianchi","Esposito","Ricci","Ferrari","Moretti","Conti","Greco","Romano","Gallo","Costa","Marini","Fontana","Villa","Riva","Orlando"]; var tt=["Account Executive","Senior Analyst","Operations Lead","Data Specialist","Support Engineer","Finance Controller","Product Owner","Logistics Planner"]; var et=["FULL_TIME","FULL_TIME","FULL_TIME","PART_TIME","CONTRACTOR"]; var s=state.db.prepare("INSERT INTO employees (id,first_name,last_name,department_id,manager_id,title,salary,hire_date,employment_type) VALUES (?,?,?,?,?,?,?,?,?)"); for(var i=1;i<=56;i++){s.run([i,pick(fn),pick(ln),randomInt(1,8),i<=10?null:randomInt(1,10),pick(tt),(randomInt(30000,128000)+randomInt(0,99)/100).toFixed(2),randomDate("2016-01-01","2025-11-30"),pick(et)]);} s.free(); }
  function seedSuppliers() { var nm=["Nordic Components","Atlas Source","Kappa Industrial","GreenPulse","Mistral Electronics","Coreline Parts","Westbridge Supply","Blue Harbor Wholesale","Quantum Semi","Aria Distribution","Omnia Logistic Trade","SilverOak Labs"]; var co=["Italy","Germany","Poland","Czech Republic","France","Spain","Romania","Netherlands","Belgium"]; var pt=["NET15","NET30","NET30","NET45","NET60"]; var s=state.db.prepare("INSERT INTO suppliers (id,name,country,rating,payment_terms) VALUES (?,?,?,?,?)"); for(var i=1;i<=34;i++){s.run([i,pick(nm)+" "+String.fromCharCode(64+((i%26)||26)),pick(co),(randomInt(26,50)/10).toFixed(1),pick(pt)]);} s.free(); }
  function seedCampaigns() { var cn=["Winter Renewal","Black Friday Pro","Q1 Expansion","Partner Boost","New Region Launch","Cloud Upsell","Retention Sprint","SMB Starter Push","Premium Tier Upgrade","Channel Revamp","Service Bundle Wave"]; var ch=["EMAIL","SEM","SOCIAL","PARTNER","WEBINAR","OUTBOUND"]; var st=["PLANNED","ACTIVE","CLOSED","PAUSED","ACTIVE","CLOSED"]; var s=state.db.prepare("INSERT INTO campaigns (id,name,channel,start_date,end_date,budget,status) VALUES (?,?,?,?,?,?,?)"); for(var i=1;i<=18;i++){var sd=randomDate("2023-01-01","2025-11-20"); s.run([i,pick(cn)+" "+i,pick(ch),sd,randomDate(sd,"2026-02-28"),(randomInt(10000,280000)+randomInt(0,99)/100).toFixed(2),pick(st)]);} s.free(); }
  function seedWarehouses() { var rows=[[1,"WH-Milan-01","Milan",1,120000],[2,"WH-Rome-01","Rome",1,90000],[3,"WH-Berlin-01","Berlin",2,140000],[4,"WH-Madrid-01","Madrid",5,110000],[5,"WH-Paris-01","Paris",3,135000],[6,"WH-Amsterdam-01","Amsterdam",3,95000],[7,"WH-Stockholm-01","Stockholm",4,86000],[8,"WH-London-01","London",6,150000]]; var s=state.db.prepare("INSERT INTO warehouses (id,name,city,region_id,capacity) VALUES (?,?,?,?,?)"); rows.forEach(function(r){s.run(r);}); s.free(); }
  function seedCustomers() { var nm=["Alba Digital","Nordic Trade","Studio Venere","Delta Retail","Blue Orbit","Sfera Group","Atlas Food","City Hub","Linea Verde","Polo Moda","Start One","Arco Travel","Nova Pharma","Lago Energy","Pixel Forge","Terra Lab","Globe Health","Urban Cargo","Helix Labs","Cobalt Network","Verde Capital","Signal Core"]; var co=["Italy","France","Germany","Spain","Portugal","Netherlands","Austria","Belgium","UK","Sweden"]; var ci=["Milan","Rome","Turin","Naples","Madrid","Paris","Berlin","Vienna","Porto","Brussels","London","Stockholm"]; var sg=["Enterprise","Mid-Market","SMB","Public","Startup","Enterprise","SMB"]; var ti=["GOLD","SILVER","BRONZE","PLATINUM","SILVER","GOLD"]; var s=state.db.prepare("INSERT INTO customers (id,name,email,country,city,region_id,segment,signup_date,credit_limit,tier) VALUES (?,?,?,?,?,?,?,?,?,?)"); for(var i=1;i<=220;i++){var b=pick(nm); s.run([i,b+" "+String.fromCharCode(64+((i%26)||26)),slugify(b)+"."+i+"@demo-sql.test",pick(co),pick(ci),randomInt(1,6),pick(sg),randomDate("2020-01-01","2025-12-20"),(randomInt(1000,85000)+randomInt(0,99)/100).toFixed(2),pick(ti)]);} s.free(); }
  function seedProducts() { var pp=[["Notebook Air","Hardware"],["Dock USB-C","Hardware"],["Cloud Plan Basic","Software"],["Cloud Plan Pro","Software"],["Monitor 27","Hardware"],["Headset Pro","Accessories"],["Mouse Slim","Accessories"],["Security Audit","Services"],["Onboarding Pack","Services"],["Automation Suite","Software"],["Keyboard Mech","Accessories"],["Server Blade","Hardware"],["Data Backup","Services"],["Analytics Plus","Software"],["Edge Router","Hardware"],["Storage Node","Hardware"],["API Gateway Pack","Software"],["Warranty Plus","Services"]]; var s=state.db.prepare("INSERT INTO products (id,name,category,supplier_id,sku,price,cost_price,stock,launched_at,is_active) VALUES (?,?,?,?,?,?,?,?,?,?)"); for(var i=1;i<=180;i++){var p=pick(pp); var pr=randomInt(15,2600)+randomInt(0,99)/100; var m=0.38+seededRandom()*0.36; var c=Math.max(5,pr*(1-m)); s.run([i,p[0]+" "+i,p[1],randomInt(1,34),"SKU-"+String(i).padStart(4,"0")+"-"+randomInt(10,99),pr.toFixed(2),c.toFixed(2),randomInt(0,1600),randomDate("2019-01-01","2026-01-20"),randomInt(0,100)<88?1:0]); state.productPricingCache.set(i,{price:pr,cost:c});} s.free(); }
  function seedOrdersAndItems() { var orders=[],items=[]; var os=state.db.prepare("INSERT INTO orders (id,customer_id,employee_id,campaign_id,order_date,status,currency,channel,discount_amount,total_amount) VALUES (?,?,?,?,?,?,?,?,?,?)"); var ou=state.db.prepare("UPDATE orders SET discount_amount=?, total_amount=? WHERE id=?"); var is2=state.db.prepare("INSERT INTO order_items (id,order_id,product_id,warehouse_id,quantity,unit_price,discount_pct,tax_rate) VALUES (?,?,?,?,?,?,?,?)"); var sts=["NEW","SHIPPED","PAID","CANCELLED","PAID","SHIPPED","PAID","REFUNDED"]; var cur=["EUR","EUR","EUR","USD","GBP"]; var chs=["WEB","MOBILE","B2B","RESELLER","INSIDE_SALES"]; var iid=1; for(var oid=1;oid<=760;oid++){var cid=randomInt(1,220); var eid=randomInt(1,56); var cpid=randomInt(0,100)<62?randomInt(1,18):null; var od=randomDate("2023-01-01","2026-02-10"); var st=pick(sts); var cu=pick(cur); var ch=pick(chs); os.run([oid,cid,eid,cpid,od,st,cu,ch,0,0]); var ic=randomInt(1,6); var tot=0; for(var j=0;j<ic;j++){var pid=randomInt(1,180); var wid=randomInt(1,8); var q=randomInt(1,9); var pr=getProductPricing(pid); var up=pr.price*(0.9+seededRandom()*0.25); var dp=Number((randomInt(0,22)/100).toFixed(2)); var tr=pick([0.04,0.1,0.22]); var lb=q*up*(1-dp); var lt=lb*(1+tr); tot+=lt; is2.run([iid,oid,pid,wid,q,up.toFixed(2),dp.toFixed(2),tr.toFixed(2)]); items.push({id:iid,orderId:oid,productId:pid,warehouseId:wid,quantity:q,unitPrice:up,orderDate:od,orderStatus:st}); iid++;} var da=tot*(randomInt(0,12)/100); var ft=Math.max(tot-da,0); if(st==="CANCELLED") ft=0; ou.run([da.toFixed(2),ft.toFixed(2),oid]); orders.push({id:oid,customerId:cid,status:st,currency:cu,channel:ch,orderDate:od,totalAmount:ft});} os.free(); ou.free(); is2.free(); return {orders:orders,items:items}; }
  function seedPayments(rows) { var mt=["CARD","WIRE","PAYPAL","SEPA","APPLE_PAY","CARD"]; var sts=["SETTLED","SETTLED","PENDING","SETTLED","FAILED"]; var s=state.db.prepare("INSERT INTO payments (id,order_id,payment_date,method,amount,fx_rate,gateway_fee,status) VALUES (?,?,?,?,?,?,?,?)"); var pid=1; rows.forEach(function(o){if(o.status==="CANCELLED"||o.totalAmount<=0)return; var sc=o.totalAmount>9000&&randomInt(0,100)<28?2:1; for(var i=0;i<sc;i++){var ba=o.totalAmount/sc; var fx=o.currency==="EUR"?1:o.currency==="USD"?Number((0.86+seededRandom()*0.1).toFixed(4)):Number((1.08+seededRandom()*0.12).toFixed(4)); var gf=ba*(0.008+seededRandom()*0.02); var ps=o.status==="REFUNDED"&&i===sc-1?"SETTLED":pick(sts); s.run([pid,o.id,randomDate(o.orderDate,"2026-02-21"),pick(mt),ba.toFixed(2),fx,gf.toFixed(2),ps]); pid++;}}); s.free(); }
  function seedShipments(rows) { var cr=["DHL","UPS","BRT","FedEx","GLS","DPD"]; var sts=["DELIVERED","IN_TRANSIT","DELIVERED","DELIVERED","HOLD"]; var s=state.db.prepare("INSERT INTO shipments (id,order_id,warehouse_id,carrier,shipped_at,delivered_at,status,tracking_code,shipping_cost) VALUES (?,?,?,?,?,?,?,?,?)"); var sid=1; rows.forEach(function(o){if(!["SHIPPED","PAID","REFUNDED"].includes(o.status))return; if(o.totalAmount<=0)return; if(o.status==="PAID"&&randomInt(0,100)<24)return; var sa=randomDate(o.orderDate,"2026-02-21"); var st=pick(sts); var da=st==="DELIVERED"?randomDate(sa,"2026-02-22"):null; s.run([sid,o.id,randomInt(1,8),pick(cr),sa,da,st,"TRK-"+String(o.id).padStart(5,"0")+"-"+String(sid).padStart(4,"0"),(randomInt(5,80)+randomInt(0,99)/100).toFixed(2)]); sid++;}); s.free(); }
  function seedReturns(items) { var re=["Damaged","Wrong item","Late delivery","No longer needed","Quality issue"]; var sts=["REQUESTED","APPROVED","REFUNDED","REJECTED","REFUNDED"]; var s=state.db.prepare("INSERT INTO returns (id,order_item_id,return_date,reason,status,refund_amount) VALUES (?,?,?,?,?,?)"); var rid=1; items.forEach(function(it){if(!["PAID","SHIPPED","REFUNDED"].includes(it.orderStatus))return; if(randomInt(0,100)>11)return; s.run([rid,it.id,randomDate(it.orderDate,"2026-02-22"),pick(re),pick(sts),(it.quantity*it.unitPrice*(0.25+seededRandom()*0.75)).toFixed(2)]); rid++;}); s.free(); }
  function seedSupportTickets(rows) { var pr=["LOW","MEDIUM","MEDIUM","HIGH","URGENT"]; var sts=["OPEN","CLOSED","PENDING","ESCALATED","CLOSED","CLOSED"]; var tp=["Shipping delay","Invoice mismatch","Refund request","Technical issue","Contract question","Wrong quantity"]; var s=state.db.prepare("INSERT INTO support_tickets (id,customer_id,order_id,priority,status,opened_at,closed_at,sla_hours,topic) VALUES (?,?,?,?,?,?,?,?,?)"); for(var tid=1;tid<=380;tid++){var o=rows[randomInt(0,rows.length-1)]; var st=pick(sts); var op=randomDate(o.orderDate,"2026-02-20"); s.run([tid,o.customerId,o.id,pick(pr),st,op,st==="CLOSED"?randomDate(op,"2026-02-22"):null,pick([24,48,72,96]),pick(tp)]);} s.free(); }
  function seedCustomerNotes() { var nt=["upsell","risk","health","followup","complaint","renewal"]; var fr=["requested custom pricing","asked for enterprise SLA","reported delayed invoice","wants training bundle","needs legal review","prefers quarterly billing"]; var s=state.db.prepare("INSERT INTO customer_notes (id,customer_id,note_date,note_type,note_text,author_employee_id) VALUES (?,?,?,?,?,?)"); for(var nid=1;nid<=460;nid++){var t=pick(nt); s.run([nid,randomInt(1,220),randomDate("2022-01-01","2026-02-20"),t,"Customer "+pick(fr)+" ("+t+")",randomInt(1,56)]);} s.free(); }
  function seedInventoryMovements(items) { var s=state.db.prepare("INSERT INTO inventory_movements (id,product_id,warehouse_id,movement_date,movement_type,quantity,unit_cost,reference) VALUES (?,?,?,?,?,?,?,?)"); var mid=1; for(var pid=1;pid<=180;pid++){for(var n=0;n<2;n++){var p=getProductPricing(pid); s.run([mid,pid,randomInt(1,8),randomDate("2022-01-01","2025-11-20"),"IN",randomInt(80,620),p.cost.toFixed(2),"PO-"+String(pid).padStart(4,"0")+"-"+(n+1)]); mid++;}} items.forEach(function(it){if(randomInt(0,100)>56)return; var p=getProductPricing(it.productId); s.run([mid,it.productId,it.warehouseId,it.orderDate,"OUT",it.quantity,p.cost.toFixed(2),"SO-"+String(it.orderId).padStart(5,"0")]); mid++;}); for(var i=0;i<140;i++){var pid2=randomInt(1,180); var p2=getProductPricing(pid2); var q=randomInt(1,25); var sign=randomInt(0,100)<40?-1:1; s.run([mid,pid2,randomInt(1,8),randomDate("2023-01-01","2026-02-20"),"ADJUSTMENT",q*sign,p2.cost.toFixed(2),"ADJ-"+String(mid).padStart(6,"0")]); mid++;} s.free(); }

  /* ---- UI rendering ---- */

  function refreshTableSelector() {
    if (!dom.tableSelect || !state.db) return;
    var r = state.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    var names = r.length ? r[0].values.map(function (row) { return row[0]; }) : [];
    dom.tableSelect.innerHTML = names.map(function (n) { return '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + "</option>"; }).join("");
    if (!names.length) { dom.tableMeta.textContent = "Righe: 0"; dom.tablePreview.innerHTML = ""; renderSchemaVisualizer([]); return; }
    if (names.indexOf(state.previewTable) < 0) state.previewTable = names[0];
    dom.tableSelect.value = state.previewTable;
    renderTablePreview(state.previewTable);
    renderSchemaVisualizer(names);
  }

  function renderTablePreview(tableName) {
    if (!tableName || !isSafeIdentifier(tableName) || !state.db) return;
    var cnt = state.db.exec('SELECT COUNT(*) FROM "' + tableName + '"');
    if (dom.tableMeta) dom.tableMeta.textContent = "Righe: " + Number(cnt && cnt[0] && cnt[0].values[0][0] || 0);
    var prev = state.db.exec('SELECT * FROM "' + tableName + '" LIMIT 10');
    if (!prev.length) { if (dom.tablePreview) dom.tablePreview.innerHTML = '<p class="info-block">Nessun dato.</p>'; return; }
    if (dom.tablePreview) dom.tablePreview.innerHTML = renderTable(prev[0].columns, prev[0].values);
  }

  function renderSchemaVisualizer(tableNames) {
    if (!dom.dbVisualizer) return;
    if (!tableNames.length) { dom.dbVisualizerMeta.textContent = "Tabelle: 0 | Relazioni: 0"; dom.dbVisualizer.innerHTML = '<p class="info-block">Nessuna tabella disponibile.</p>'; return; }
    var nw = 188, nh = 86, gx = 230, gy = 150, mg = 26;
    var cols = Math.max(1, Math.ceil(Math.sqrt(tableNames.length)));
    var positions = new Map(), tableStats = new Map();
    tableNames.forEach(function (name, idx) {
      positions.set(name, { x: mg + (idx % cols) * gx, y: mg + Math.floor(idx / cols) * gy });
      var cr = state.db.exec('PRAGMA table_info("' + name + '")');
      var c = cr.length ? cr[0].values.length : 0;
      var rr = state.db.exec('SELECT COUNT(*) FROM "' + name + '"');
      tableStats.set(name, { columns: c, rows: Number(rr && rr[0] && rr[0].values[0][0] || 0) });
    });
    var links = [];
    tableNames.forEach(function (table) {
      var fk = state.db.exec('PRAGMA foreign_key_list("' + table + '")');
      if (!fk.length) return;
      fk[0].values.forEach(function (row) { var ref = row[2]; if (positions.has(ref)) links.push({ source: table, target: ref, sourceCol: row[3], targetCol: row[4] }); });
    });
    var rowsNeeded = Math.ceil(tableNames.length / cols);
    var w = mg * 2 + (cols - 1) * gx + nw, h = mg * 2 + (rowsNeeded - 1) * gy + nh;
    var lines = links.map(function (lk) {
      var s = positions.get(lk.source), t = positions.get(lk.target);
      var x1 = s.x + nw / 2, y1 = s.y + nh / 2, x2 = t.x + nw / 2, y2 = t.y + nh / 2;
      return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="schema-link" marker-end="url(#arrowHead)"></line><text x="' + ((x1 + x2) / 2) + '" y="' + ((y1 + y2) / 2 - 4) + '" class="schema-link-label">' + escapeHtml(lk.sourceCol + "->" + lk.targetCol) + "</text>";
    }).join("");
    var nodes = tableNames.map(function (table) {
      var p = positions.get(table), st = tableStats.get(table);
      var lb = table.length > 26 ? table.slice(0, 26) + "..." : table;
      return '<g class="schema-node" data-table="' + escapeHtml(table) + '"><rect x="' + p.x + '" y="' + p.y + '" width="' + nw + '" height="' + nh + '" rx="12" ry="12"></rect><text x="' + (p.x + 12) + '" y="' + (p.y + 24) + '" class="schema-node-title">' + escapeHtml(lb) + '</text><text x="' + (p.x + 12) + '" y="' + (p.y + 47) + '" class="schema-node-meta">colonne: ' + st.columns + '</text><text x="' + (p.x + 12) + '" y="' + (p.y + 67) + '" class="schema-node-meta">righe: ' + st.rows + "</text></g>";
    }).join("");
    if (dom.dbVisualizerMeta) dom.dbVisualizerMeta.textContent = "Tabelle: " + tableNames.length + " | Relazioni: " + links.length;
    dom.dbVisualizer.innerHTML = '<svg viewBox="0 0 ' + w + " " + h + '" class="schema-svg" role="img" aria-label="Schema database"><defs><marker id="arrowHead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="schema-arrow"></path></marker></defs>' + lines + nodes + "</svg>";
    Array.from(dom.dbVisualizer.querySelectorAll(".schema-node")).forEach(function (node) {
      node.addEventListener("click", function () { var t = node.getAttribute("data-table"); if (t) { state.previewTable = t; dom.tableSelect.value = t; renderTablePreview(t); } });
    });
  }

  function createCustomTable() {
    if (!state.db) return;
    var tableName = (dom.customTableName.value || "").trim();
    var columnsRaw = (dom.customColumns.value || "").trim();
    var rowCount = Math.max(0, Math.min(500, Number(dom.customRows.value) || 0));
    if (!isSafeIdentifier(tableName)) { setBadge(dom.dbStatus, "Nome tabella non valido", "error"); return; }
    var columnDefs = splitSqlColumns(columnsRaw).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!columnDefs.length) { setBadge(dom.dbStatus, "Definizione colonne vuota", "error"); return; }
    var parsed = columnDefs.map(parseColumnDefinition);
    if (parsed.some(function (c) { return !c.name; })) { setBadge(dom.dbStatus, "Errore parsing colonne", "error"); return; }
    try {
      state.db.run('DROP TABLE IF EXISTS "' + tableName + '"');
      state.db.run('CREATE TABLE "' + tableName + '" (' + columnDefs.join(", ") + ")");
      if (rowCount > 0) {
        var namesSql = parsed.map(function (c) { return '"' + c.name + '"'; }).join(", ");
        var placeholders = parsed.map(function () { return "?"; }).join(", ");
        var ins = state.db.prepare('INSERT INTO "' + tableName + '" (' + namesSql + ") VALUES (" + placeholders + ")");
        for (var i = 0; i < rowCount; i++) { ins.run(parsed.map(function (c) { return generateValueForType(c, i); })); }
        ins.free();
      }
      setBadge(dom.dbStatus, "Tabella " + tableName + " creata", "success");
      persistDB();
      refreshTableSelector();
      if (dom.resultContainer) {
        var preview = state.db.exec('SELECT * FROM "' + tableName + '" LIMIT 20');
        dom.resultContainer.innerHTML = preview.length ? renderTable(preview[0].columns, preview[0].values) : '<p class="info-block">Tabella creata (vuota).</p>';
      }
    } catch (error) {
      setBadge(dom.dbStatus, "Errore creazione tabella", "error");
      if (dom.resultContainer) dom.resultContainer.innerHTML = '<pre class="error-block">' + escapeHtml(error.message) + "</pre>";
    }
  }

  function parseColumnDefinition(def) {
    var m = def.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/);
    if (!m) return { name: "", type: "TEXT", raw: def.trim() };
    var tm = m[2].match(/^([A-Za-z]+)/);
    return { name: m[1], type: tm ? tm[1].toUpperCase() : "TEXT", raw: def.trim(), isPrimaryInt: /PRIMARY\s+KEY/i.test(def) && /INT/i.test(def) };
  }

  function generateValueForType(col, index) {
    if (col.isPrimaryInt) return index + 1;
    var t = col.type;
    if (/INT/.test(t)) return randomInt(0, 9999);
    if (/REAL|DOUB|FLOA|DEC|NUM/.test(t)) return Number((randomInt(1, 9000) + seededRandom()).toFixed(2));
    if (/DATE/.test(t) && !/TIME/.test(t)) return randomDate("2020-01-01", "2026-02-20");
    if (/TIME/.test(t)) return randomDate("2020-01-01", "2026-02-20") + " " + String(randomInt(0, 23)).padStart(2, "0") + ":" + String(randomInt(0, 59)).padStart(2, "0") + ":00";
    if (/BOOL/.test(t)) return randomInt(0, 1);
    var wa = ["alpha","beta","gamma","delta","zeta","kappa","nova","spark","atlas","luna"];
    var wb = ["lab","ops","team","group","node","core","wave","dash","field","unit"];
    return pick(wa) + "_" + pick(wb) + "_" + (index + 1);
  }

  function splitSqlColumns(input) {
    var cols = [], current = "", depth = 0;
    for (var i = 0; i < input.length; i++) { var c = input[i]; if (c === "(") depth++; if (c === ")") depth = Math.max(depth - 1, 0); if (c === "," && depth === 0) { cols.push(current); current = ""; } else { current += c; } }
    if (current.trim()) cols.push(current);
    return cols;
  }

  /* ---- Utility ---- */
  function renderTable(columns, rows) {
    var h = columns.map(function (c) { return "<th>" + escapeHtml(c) + "</th>"; }).join("");
    var b = rows.map(function (r) { return "<tr>" + r.map(function (v) { return "<td>" + escapeHtml(v === null ? "NULL" : String(v)) + "</td>"; }).join("") + "</tr>"; }).join("");
    return '<div class="table-wrap"><table class="data-table"><thead><tr>' + h + "</tr></thead><tbody>" + b + "</tbody></table></div>";
  }
  function setBadge(el, text, type) { if (!el) return; el.textContent = text; el.className = "badge " + type; }
  function isSafeIdentifier(name) { return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name); }
  function escapeHtml(v) { return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
})();
