import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { E2E_DATABASE_URL, REPO_ROOT } from './env'

const apiRoot = path.join(REPO_ROOT, 'apps/api')

export function resetE2eDatabase(): void {
  execFileSync('pnpm', ['exec', 'tsx', 'src/test/prepare-isolated-database.ts', '--reset-only'], {
    cwd: apiRoot,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
  })
}

export function prepareE2eDatabase(): void {
  execFileSync('pnpm', ['exec', 'tsx', 'src/test/prepare-isolated-database.ts'], {
    cwd: apiRoot,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
  })
}
