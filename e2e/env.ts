import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')

export const E2E_API_PORT = process.env.E2E_API_PORT?.trim() || '3334'
export const E2E_WEB_PORT = process.env.E2E_WEB_PORT?.trim() || '5174'
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL?.trim() || 'postgres://yandeh:yandeh@localhost:5432/yandeh_e2e'

export const E2E_API_ORIGIN = `http://127.0.0.1:${E2E_API_PORT}`
export const E2E_WEB_ORIGIN = `http://127.0.0.1:${E2E_WEB_PORT}`
