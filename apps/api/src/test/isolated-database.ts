import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { runMigrate } from '../db/migrate.js'
import * as schema from '../db/schema.js'
import {
  databaseNameFromUrl,
  maintenanceDatabaseUrl,
  withoutTestSuffix,
} from '../db/test-database-url.js'
import { resetTestData } from './reset-test-data.js'

function quoteIdent(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`
}

async function connectAdmin(databaseUrl: string): Promise<pg.Client> {
  const candidates = [maintenanceDatabaseUrl(databaseUrl), withoutTestSuffix(databaseUrl)]
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
  throw new Error(`Não deu para conectar no Postgres para criar o banco isolado. ${hint}`, {
    cause: errors[errors.length - 1],
  })
}

export async function ensureDatabaseExists(databaseUrl: string): Promise<void> {
  const name = databaseNameFromUrl(databaseUrl)
  const client = await connectAdmin(databaseUrl)
  try {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name])
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE ${quoteIdent(name)}`)
    }
  } finally {
    await client.end()
  }
}

export async function resetIsolatedDatabase(databaseUrl: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl })
  const db = drizzle(pool, { schema })
  try {
    await resetTestData(db)
  } finally {
    await pool.end()
  }
}

/** Cria o banco se faltar, aplica migrações e volta os dados ao seed (D21/D22). */
export async function prepareIsolatedDatabase(databaseUrl: string): Promise<void> {
  await ensureDatabaseExists(databaseUrl)
  const pool = new pg.Pool({ connectionString: databaseUrl })
  const db = drizzle(pool, { schema })
  try {
    await runMigrate(db)
    await resetTestData(db)
  } finally {
    await pool.end()
  }
}
