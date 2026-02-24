const { test, expect } = require('@playwright/test');

const routes = ['/', '/playground', '/syntax', '/keywords', '/guided', '/trainer', '/exercises', '/database', '/visualizer'];

for (const route of routes) {
  test(`route ${route} has h1 and no global overflow`, async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(route);
    await expect(page.locator('h1').first()).toBeVisible();
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasOverflow).toBeFalsy();
    expect(errors).toEqual([]);
  });
}

test('playground executes SELECT 1', async ({ page }) => {
  await page.goto('/playground');
  await page.getByRole('button', { name: 'Esegui' }).click();
  await expect(page.locator('table')).toContainText('ok');
});

test('playground blocks ALTER SYSTEM', async ({ page }) => {
  await page.goto('/playground');
  await page.locator('textarea').fill('ALTER SYSTEM SET work_mem = 1;');
  await page.getByRole('button', { name: 'Esegui' }).click();
  await expect(page.locator('.error-text')).toContainText('QUERY_BLOCKED');
});
