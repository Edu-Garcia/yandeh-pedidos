import { resolveE2eDatabaseUrl } from '../db/test-database-url.js'
import { prepareIsolatedDatabase, resetIsolatedDatabase } from './isolated-database.js'

const resetOnly = process.argv.includes('--reset-only')
const databaseUrl = process.env.DATABASE_URL?.trim() || resolveE2eDatabaseUrl()

try {
  if (resetOnly) {
    await resetIsolatedDatabase(databaseUrl)
  } else {
    await prepareIsolatedDatabase(databaseUrl)
  }
} catch (error) {
  const label = resetOnly ? 'resetar' : 'preparar'
  console.error(`[isolated-database] falhou ao ${label}:`, databaseUrl)
  console.error(error)
  process.exitCode = 1
}
