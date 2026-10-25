import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { fileURLToPath } from 'node:url'
import { db, pool } from './client.js'

// Funciona tanto via tsx (src/db) quanto compilado (dist/db): a pasta drizzle/ fica em apps/api/.
const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url))

await migrate(db, { migrationsFolder })
console.log('[migrate] ok')
await pool.end()
