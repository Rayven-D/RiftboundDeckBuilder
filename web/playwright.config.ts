import { defineConfig, devices } from '@playwright/test';

/**
 * Real-browser checks (H-431, H-440): Chromium only, against `ng serve` on its own port so it never shares a server
 * with a session on 4200. 4310 by default; set E2E_PORT when another session already serves on 4310 (Playwright
 * refuses a busy port, reuseExistingServer is off). How to run and why: brain/05-Services/Browser Tests.md.
 */
const PORT = Number(process.env['E2E_PORT'] ?? 4310);

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx ng serve --port ${PORT}`,
    url: `http://localhost:${PORT}/favicon.svg`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
