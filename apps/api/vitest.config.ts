import { defineConfig } from 'vitest/config'
import { resolveTestDatabaseUrl } from './src/db/test-database-url.js'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globalSetup: ['src/test/global-setup.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    env: {
      DATABASE_URL: resolveTestDatabaseUrl(),
    },
  },
})
