const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60000,
  retries: 0,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: "npx serve . -l 8899 --no-clipboard",
    port: 8899,
    reuseExistingServer: true,
    timeout: 15000,
  },
});
