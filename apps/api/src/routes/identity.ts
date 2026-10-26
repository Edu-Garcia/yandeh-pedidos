import { asc } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { Db } from '../db/client.js'
import { supervisores, vendedores } from '../db/schema.js'
import { sellersResponseSchema, supervisorsResponseSchema } from '../http/schemas.js'

export function registerIdentityRoutes(app: FastifyInstance, database: Db) {
  app.get('/sellers', async () => {
    const rows = await database
      .select({
        id: vendedores.id,
        name: vendedores.nome,
        supervisorId: vendedores.supervisorId,
        discountAuthorityPercent: vendedores.alcadaDescontoPercentual,
      })
      .from(vendedores)
      .orderBy(asc(vendedores.id))

    return sellersResponseSchema.parse(rows)
  })

  app.get('/supervisors', async () => {
    const rows = await database
      .select({
        id: supervisores.id,
        name: supervisores.nome,
      })
      .from(supervisores)
      .orderBy(asc(supervisores.id))

    return supervisorsResponseSchema.parse(rows)
  })
}
