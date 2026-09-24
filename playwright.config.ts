import path from 'path';
import dotenv from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  expect: {
    timeout: 10_000,
  },
  use: {
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter marketing dev',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter workspace dev',
      url: 'http://127.0.0.1:3002',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter org-console dev',
      url: 'http://127.0.0.1:3001',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
