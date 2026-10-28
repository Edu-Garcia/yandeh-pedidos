import { DEFAULT_DATABASE_URL, resolveTestDatabaseUrl } from '../db/test-database-url.js'
import { prepareIsolatedDatabase } from './isolated-database.js'

export default async function setup(): Promise<void> {
  const testUrl = resolveTestDatabaseUrl({
    DATABASE_URL: process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL,
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
  })

  try {
    await prepareIsolatedDatabase(testUrl)
    process.env.DATABASE_URL = testUrl
  } catch (error) {
    console.error('[api test setup] falhou ao preparar o banco de teste:', testUrl)
    console.error(error)
    throw error
  }
}
