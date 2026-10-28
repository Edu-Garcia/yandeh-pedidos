import { sql } from 'drizzle-orm'
import type { Db } from '../db/client.js'
import { seedDatabase } from '../db/seed.js'

export async function resetTestData(database: Db): Promise<void> {
  // Não inclui __drizzle_migrations: o schema permanece; só os dados voltam ao seed.
  await database.execute(
    sql`TRUNCATE TABLE pedidos_itens, pedidos, tabelas_preco_itens, produtos, clientes, tabelas_preco, vendedores, supervisores RESTART IDENTITY CASCADE`,
  )
  await seedDatabase(database)
}
