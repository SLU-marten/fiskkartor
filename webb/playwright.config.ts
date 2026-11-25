import { defineConfig, devices } from '@playwright/test';

// Testsidan byggs först (npm run e2e). CHROMIUM_PATH pekar på en redan installerad Chromium
// när `npx playwright install` inte går att köra.
export default defineConfig({
  testDir: 'tests',
  testMatch: '*.spec.ts',
  timeout: 120_000,
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
});
