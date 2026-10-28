import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import type { Db } from './client.js'

// Funciona tanto via tsx (src/db) quanto compilado (dist/db): a pasta drizzle/ fica em apps/api/.
function resolveMigrationsFolder(): string {
  const fromMeta = fileURLToPath(new URL('../../drizzle', import.meta.url))
  if (existsSync(path.join(fromMeta, 'meta/_journal.json'))) {
    return fromMeta
  }
  return path.resolve(process.cwd(), 'drizzle')
}

export async function runMigrate(database: Db): Promise<void> {
  await migrate(database, { migrationsFolder: resolveMigrationsFolder() })
}

function invokedAsCli(): boolean {
  const entry = process.argv[1]
  return entry?.endsWith('migrate.ts') === true || entry?.endsWith('migrate.js') === true
}

if (invokedAsCli()) {
  const { db, pool } = await import('./client.js')
  await runMigrate(db)
  console.log('[migrate] ok')
  await pool.end()
}
