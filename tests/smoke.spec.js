const { test, expect } = require('@playwright/test');
const BASE = 'http://localhost:8899';

test('navigation links exist on all dedicated pages', async ({ page }) => {
  for (const p of ['index.html', 'playground.html', 'database.html', 'exercises.html', 'guided.html', 'trainer.html', 'keyword.html']) {
    await page.goto(`${BASE}/${p}`);
    for (const href of ['playground.html', 'database.html', 'exercises.html', 'guided.html', 'trainer.html', 'keyword.html']) {
      await expect(page.locator(`nav.top-nav a[href="${href}"]`)).toBeVisible();
    }
  }
});

test('db persistence across pages', async ({ page }) => {
  await page.goto(`${BASE}/database.html`);
  await expect(page.locator('#dbStatus')).toContainText(/pronto/i);
  await page.fill('#customTableName', 'smoke_test');
  await page.fill('#customColumns', 'id INTEGER PRIMARY KEY, label TEXT');
  await page.fill('#customRows', '2');
  await page.click('#createTableBtn');
  await expect(page.locator('#dbStatus')).toContainText(/smoke_test creata/i);

  await page.goto(`${BASE}/playground.html?q=${encodeURIComponent('SELECT * FROM smoke_test;')}&autorun=1`);
  await expect(page.locator('#dbStatus')).toContainText(/query eseguita|database pronto/i);
  await expect(page.locator('#resultContainer')).toContainText('label');
});

test('exercise try in playground link works', async ({ page }) => {
  await page.goto(`${BASE}/exercises.html`);
  const link = page.locator('a:has-text("Try in Playground")').first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute('href');
  expect(href).toContain('playground.html');
  expect(href).toContain('autorun=1');
  await page.goto(`${BASE}/${href}`);
  await expect(page.locator('#dbStatus')).toContainText(/query eseguita|database pronto/i);
});

test('keyword try in playground link works', async ({ page }) => {
  await page.goto(`${BASE}/keyword.html`);
  const link = page.locator('a:has-text("Try in Playground")').first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute('href');
  expect(href).toContain('playground.html');
  expect(href).toContain('autorun=1');
  await page.goto(`${BASE}/${href}`);
  await expect(page.locator('#dbStatus')).toContainText(/query eseguita|database pronto/i);
});

test('non-sqlite deep link requires manual run and shows banner', async ({ page }) => {
  const query = 'SELECT 1 AS check_val;';
  const target = `${BASE}/playground.html?q=${encodeURIComponent(query)}&dialect=postgresql&autorun=1`;
  await page.goto(target);
  await expect(page.locator('#dbStatus')).toContainText(/Dialetto non eseguibile|pronto/i);
  await expect(page.locator('#dialectNotice')).toBeVisible();
  await expect(page.locator('#resultContainer')).not.toContainText('check_val');
  await page.click('#runQueryBtn');
  await expect(page.locator('#resultContainer')).toContainText('check_val');
});
