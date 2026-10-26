import {
  availableCredit,
  FALLBACK_PRICE_TABLE_ID,
  reservedCredit,
  resolvePriceTableId,
} from '@yandeh/shared'
import { asc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { FastifyInstance } from 'fastify'
import type { Db } from '../db/client.js'
import { pendingNetsByCustomer } from '../db/pending-credit.js'
import { clientes, supervisores, tabelasPreco, vendedores } from '../db/schema.js'
import {
  sellerCustomersResponseSchema,
  sellersResponseSchema,
  supervisorsResponseSchema,
} from '../http/schemas.js'

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

  app.get<{ Params: { id: string } }>('/sellers/:id/customers', async (request, reply) => {
    const sellerId = request.params.id

    const [seller] = await database
      .select({ id: vendedores.id })
      .from(vendedores)
      .where(eq(vendedores.id, sellerId))
      .limit(1)

    if (!seller) {
      return reply.code(404).send({ message: 'Vendedor não encontrado' })
    }

    const fallbackTable = alias(tabelasPreco, 'tabela_fallback')

    const customers = await database
      .select({
        id: clientes.id,
        tradeName: clientes.nomeFantasia,
        city: clientes.cidade,
        uf: clientes.uf,
        priceTableId: clientes.tabelaPrecoId,
        assignedTableName: tabelasPreco.nome,
        fallbackTableName: fallbackTable.nome,
        creditLimit: clientes.limiteCreditoCentavos,
        creditUsed: clientes.creditoUtilizadoCentavos,
      })
      .from(clientes)
      .leftJoin(tabelasPreco, eq(clientes.tabelaPrecoId, tabelasPreco.id))
      .innerJoin(fallbackTable, eq(fallbackTable.id, FALLBACK_PRICE_TABLE_ID))
      .where(eq(clientes.vendedorId, sellerId))
      .orderBy(asc(clientes.id))

    const pendingByCustomer = await pendingNetsByCustomer(
      database,
      customers.map((customer) => customer.id),
    )

    const payload = customers.map((customer) => {
      const table = resolvePriceTableId({ priceTableId: customer.priceTableId })
      const reserved = reservedCredit(pendingByCustomer.get(customer.id) ?? [])
      return {
        id: customer.id,
        tradeName: customer.tradeName,
        city: customer.city,
        uf: customer.uf,
        priceTableId: table.tableId,
        priceTableName: table.isFallback
          ? customer.fallbackTableName
          : (customer.assignedTableName ?? customer.fallbackTableName),
        isFallback: table.isFallback,
        availableCredit: availableCredit(
          { creditLimit: customer.creditLimit, creditUsed: customer.creditUsed },
          reserved,
        ),
      }
    })

    return sellerCustomersResponseSchema.parse(payload)
  })
}
