import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests-ui',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', {outputFolder: 'playwright-report',open:'never'}]],
  use: {
    baseURL:'http://127.0.0.1:5173',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
  },
  projects: [
    {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
    {name:'mobile-chromium',use:{...devices['Pixel 7'],browserName:'chromium'}},
  ],
  webServer: {
    command:'VITE_ESTUDEI_UI_TESTS=true ./node_modules/.bin/vite --host 127.0.0.1 --port 5173 --strictPort',
    url:'http://127.0.0.1:5173/?ui-test=1',
    reuseExistingServer:!process.env.CI,
    timeout:120_000,
  },
});
