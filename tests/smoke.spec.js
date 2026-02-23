const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:8899";

test.describe("Smoke tests", () => {
  test("1) index.html nav contains Database + Exercises links", async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    const nav = page.locator("nav.top-nav");
    await expect(nav.locator('a[href="database.html"]')).toBeVisible();
    await expect(nav.locator('a[href="exercises.html"]')).toBeVisible();
  });

  test("2) database.html loads with schema SVG and table nodes", async ({ page }) => {
    await page.goto(`${BASE}/database.html`);
    // Wait for DB to initialise
    await expect(page.locator("#dbStatus")).toContainText("Database pronto", { timeout: 30000 });
    // Schema SVG should exist with at least a few nodes
    const svg = page.locator(".schema-svg");
    await expect(svg).toBeVisible({ timeout: 10000 });
    const nodes = svg.locator(".schema-node");
    const count = await nodes.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("3) Create custom table in database.html, then query it in playground.html", async ({ page, context }) => {
    // Step A: Create a custom table
    await page.goto(`${BASE}/database.html`);
    await expect(page.locator("#dbStatus")).toContainText("Database pronto", { timeout: 30000 });

    // Fill in custom table form
    await page.fill("#customTableName", "smoke_test");
    await page.fill("#customColumns", "id INTEGER PRIMARY KEY,\nlabel TEXT,\nvalue INTEGER");
    await page.fill("#customRows", "5");
    await page.click("#createTableBtn");

    // Wait for table creation
    await expect(page.locator("#dbStatus")).toContainText("smoke_test creata", { timeout: 10000 });

    // Step B: Navigate to playground and query the table
    await page.goto(`${BASE}/playground.html?q=${encodeURIComponent("SELECT * FROM smoke_test;")}&autorun=1`);
    await expect(page.locator("#dbStatus")).toContainText(/pronto|eseguita|auto-run/i, { timeout: 30000 });

    // Wait for result container to have table content
    await expect(page.locator("#resultContainer")).not.toContainText("attesa", { timeout: 15000 });
    // The result should show data from smoke_test
    const resultText = await page.locator("#resultContainer").textContent();
    expect(resultText).toContain("label");
  });

  test("4) exercises.html can open exercise in playground via deep-link", async ({ page }) => {
    await page.goto(`${BASE}/exercises.html`);
    // Find a simple exercise (SELECT base) rather than one using CONVERT
    const selectLink = page.locator('article.keyword-card:has-text("SELECT base") a.btn.btn-primary').first();
    await expect(selectLink).toBeVisible({ timeout: 5000 });
    const href = await selectLink.getAttribute("href");
    expect(href).toContain("playground.html");
    expect(href).toContain("autorun=1");

    // Navigate to the link
    await page.goto(`${BASE}/${href}`);
    await expect(page.locator("#dbStatus")).toContainText(/pronto|Query eseguita/i, { timeout: 30000 });
    // Should have results without error
    await page.waitForTimeout(2000);
    const hasError = await page.locator(".error-block").count();
    expect(hasError).toBe(0);
  });

  test("5) keywords.html shows cards with Try in Playground links", async ({ page }) => {
    await page.goto(`${BASE}/keywords.html`);
    // Wait for keyword cards to render
    await expect(page.locator(".keyword-card").first()).toBeVisible({ timeout: 5000 });
    // Find the first "Apri nel Playground" link
    const playgroundLink = page.locator('a:has-text("Apri nel Playground")').first();
    await expect(playgroundLink).toBeVisible();
    const href = await playgroundLink.getAttribute("href");
    expect(href).toContain("playground.html");
    expect(href).toContain("autorun=1");

    // Navigate to it
    await page.goto(`${BASE}/${href}`);
    await expect(page.locator("#dbStatus")).toContainText(/pronto|Query eseguita/i, { timeout: 30000 });
    // Verify no errors
    const hasError = await page.locator(".error-block").count();
    expect(hasError).toBe(0);
  });

  test("6) guided.html is functional (not just a link)", async ({ page }) => {
    await page.goto(`${BASE}/guided.html`);
    // Should have step cards
    await expect(page.locator("#guidedStepList .keyword-card").first()).toBeVisible({ timeout: 5000 });
    const count = await page.locator("#guidedStepList .keyword-card").count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("7) trainer.html is functional (not just a link)", async ({ page }) => {
    await page.goto(`${BASE}/trainer.html`);
    // Should have keyword cards
    await expect(page.locator("#trainerPageList .keyword-card").first()).toBeVisible({ timeout: 5000 });
    const count = await page.locator("#trainerPageList .keyword-card").count();
    expect(count).toBeGreaterThanOrEqual(5);
  });
});
