import { defineConfig } from '@playwright/test'
import {
  E2E_API_ORIGIN,
  E2E_API_PORT,
  E2E_DATABASE_URL,
  E2E_WEB_ORIGIN,
  E2E_WEB_PORT,
  REPO_ROOT,
} from './e2e/env'

process.env.E2E_DATABASE_URL = E2E_DATABASE_URL
process.env.E2E_API_PORT = E2E_API_PORT
process.env.E2E_WEB_PORT = E2E_WEB_PORT

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: './e2e/global-setup.ts',
  outputDir: 'test-results',
  use: {
    baseURL: E2E_WEB_ORIGIN,
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR',
    timezoneId: 'America/Fortaleza',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @yandeh/api exec tsx src/server.ts',
      url: `${E2E_API_ORIGIN}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      cwd: REPO_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: E2E_DATABASE_URL,
        API_PORT: E2E_API_PORT,
        HOST: '127.0.0.1',
        NODE_ENV: 'test',
      },
    },
    {
      command: `pnpm --filter @yandeh/web exec vite --host 127.0.0.1 --port ${E2E_WEB_PORT} --strictPort`,
      url: E2E_WEB_ORIGIN,
      timeout: 120_000,
      reuseExistingServer: false,
      cwd: REPO_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        VITE_API_URL: E2E_API_ORIGIN,
      },
    },
  ],
})
