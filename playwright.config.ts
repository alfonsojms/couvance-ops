import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

// Cada corrida E2E usa su propio servidor y una base SQLite nueva, para que los datos
// creados por corridas anteriores (o por el entorno de desarrollo en :3000) no contaminen los tests.
const E2E_PORT = 3101;
const E2E_DB_PATH = path.join(os.tmpdir(), `couvance-ops-e2e-${process.pid}-${Date.now()}.db`);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${E2E_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx tsx src/server/node-entry.ts',
    url: `http://127.0.0.1:${E2E_PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60 * 1000,
    env: {
      PORT: String(E2E_PORT),
      DATABASE_URL: `file:${E2E_DB_PATH}`,
    },
  },
});
