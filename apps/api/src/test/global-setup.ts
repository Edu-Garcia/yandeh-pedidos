import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { runMigrate } from '../db/migrate.js'
import * as schema from '../db/schema.js'
import {
  DEFAULT_DATABASE_URL,
  databaseNameFromUrl,
  maintenanceDatabaseUrl,
  resolveTestDatabaseUrl,
  withoutTestSuffix,
} from '../db/test-database-url.js'
import { resetTestData } from './reset-test-data.js'

function quoteIdent(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`
}

async function connectAdmin(testUrl: string): Promise<pg.Client> {
  const candidates = [maintenanceDatabaseUrl(testUrl), withoutTestSuffix(testUrl)]
  const unique = [...new Set(candidates)]
  const errors: unknown[] = []
  for (const url of unique) {
    const client = new pg.Client({ connectionString: url })
    try {
      await client.connect()
      return client
    } catch (error) {
      errors.push(error)
      await client.end().catch(() => undefined)
    }
  }
  const hint =
    'Suba o Postgres (`docker compose up -d postgres` ou o stack completo) e tente de novo.'
  throw new Error(`Não deu para conectar no Postgres para criar o banco de teste. ${hint}`, {
    cause: errors[errors.length - 1],
  })
}

async function ensureDatabase(testUrl: string): Promise<void> {
  const name = databaseNameFromUrl(testUrl)
  const client = await connectAdmin(testUrl)
  try {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name])
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE ${quoteIdent(name)}`)
    }
  } finally {
    await client.end()
  }
}

export default async function setup(): Promise<void> {
  const testUrl = resolveTestDatabaseUrl({
    DATABASE_URL: process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL,
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
  })

  try {
    await ensureDatabase(testUrl)
    process.env.DATABASE_URL = testUrl

    const pool = new pg.Pool({ connectionString: testUrl })
    const db = drizzle(pool, { schema })
    try {
      await runMigrate(db)
      await resetTestData(db)
    } finally {
      await pool.end()
    }
  } catch (error) {
    console.error('[api test setup] falhou ao preparar o banco de teste:', testUrl)
    console.error(error)
    throw error
  }
}
