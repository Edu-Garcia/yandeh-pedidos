import { availableCredit, orderTotals, reservedCredit, resolvePriceTableId } from '@yandeh/shared'
import { asc, eq, inArray } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { Db } from '../db/client.js'
import { clientes, pedidos, pedidosItens, supervisores, vendedores } from '../db/schema.js'
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

    const customers = await database
      .select({
        id: clientes.id,
        tradeName: clientes.nomeFantasia,
        city: clientes.cidade,
        uf: clientes.uf,
        priceTableId: clientes.tabelaPrecoId,
        creditLimit: clientes.limiteCreditoCentavos,
        creditUsed: clientes.creditoUtilizadoCentavos,
      })
      .from(clientes)
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

async function pendingNetsByCustomer(database: Db, customerIds: string[]) {
  const byCustomer = new Map<string, Array<{ status: string; net: number }>>()
  if (customerIds.length === 0) {
    return byCustomer
  }

  const rows = await database
    .select({
      orderId: pedidos.id,
      customerId: pedidos.clienteId,
      status: pedidos.status,
      productId: pedidosItens.produtoId,
      quantityUnits: pedidosItens.quantidade,
      unitPrice: pedidosItens.precoUnidadeCentavos,
      discountPercent: pedidosItens.descontoPercentual,
    })
    .from(pedidos)
    .innerJoin(pedidosItens, eq(pedidosItens.pedidoId, pedidos.id))
    .where(inArray(pedidos.clienteId, customerIds))
    .orderBy(asc(pedidos.id), asc(pedidosItens.produtoId))

  const linesByOrder = new Map<
    string,
    {
      customerId: string
      status: string
      lines: Array<{
        productId: string
        quantityUnits: number
        unitPrice: number
        discountPercent: number
      }>
    }
  >()

  for (const row of rows) {
    const line = {
      productId: row.productId,
      quantityUnits: row.quantityUnits,
      unitPrice: row.unitPrice,
      discountPercent: row.discountPercent,
    }
    const existing = linesByOrder.get(row.orderId)
    if (existing) {
      existing.lines.push(line)
    } else {
      linesByOrder.set(row.orderId, {
        customerId: row.customerId,
        status: row.status,
        lines: [line],
      })
    }
  }

  for (const order of linesByOrder.values()) {
    const list = byCustomer.get(order.customerId) ?? []
    list.push({ status: order.status, net: orderTotals(order.lines).net })
    byCustomer.set(order.customerId, list)
  }

  return byCustomer
}
