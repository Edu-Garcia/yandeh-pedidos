import { maxDiscount, orderTotals, type OrderLineInput } from '@yandeh/shared'
import { and, desc, eq, inArray } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Db } from '../db/client.js'
import {
  availableCreditForCustomer,
  lockCustomerForUpdate,
  type CreditReader,
} from '../db/pending-credit.js'
import { clientes, pedidos, pedidosItens, vendedores } from '../db/schema.js'
import {
  PENDING_APPROVAL_STATUS,
  supervisorIdHeaderSchema,
  supervisorOrderSchema,
  supervisorOrdersQuerySchema,
  supervisorOrdersResponseSchema,
  validationIssuesSchema,
} from '../http/schemas.js'
import { findSupervisor } from '../http/supervisor-access.js'

const ORDER_NOT_FOUND = { message: 'Pedido não encontrado' } as const
const ORDER_NOT_PENDING = { message: 'Pedido não está aguardando aprovação' } as const

/** Data civil gravada (YYYY-MM-DD). DATE do Postgres chega como string ou Date UTC. */
function civilDateFromColumn(value: string | Date): string {
  if (typeof value === 'string') {
    return value.slice(0, 10)
  }
  return value.toISOString().slice(0, 10)
}

type SupervisorOrderRow = {
  id: string
  date: string | Date
  status: string
  customerId: string
  customerTradeName: string
  sellerId: string
  sellerName: string
  discountAuthorityPercent: number
}

async function linesByOrderIds(database: CreditReader, orderIds: string[]) {
  const byOrder = new Map<string, OrderLineInput[]>()
  if (orderIds.length === 0) {
    return byOrder
  }

  const itemRows = await database
    .select({
      orderId: pedidosItens.pedidoId,
      productId: pedidosItens.produtoId,
      quantityUnits: pedidosItens.quantidade,
      unitPrice: pedidosItens.precoUnidadeCentavos,
      discountPercent: pedidosItens.descontoPercentual,
    })
    .from(pedidosItens)
    .where(inArray(pedidosItens.pedidoId, orderIds))

  for (const item of itemRows) {
    const lines = byOrder.get(item.orderId) ?? []
    lines.push({
      productId: item.productId,
      quantityUnits: item.quantityUnits,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
    })
    byOrder.set(item.orderId, lines)
  }

  return byOrder
}

function toSupervisorOrder(order: SupervisorOrderRow, lines: OrderLineInput[]) {
  return supervisorOrderSchema.parse({
    id: order.id,
    date: civilDateFromColumn(order.date),
    status: order.status,
    total: orderTotals(lines).net,
    maxDiscount: maxDiscount(lines),
    customer: {
      id: order.customerId,
      tradeName: order.customerTradeName,
    },
    seller: {
      id: order.sellerId,
      name: order.sellerName,
      discountAuthorityPercent: order.discountAuthorityPercent,
    },
  })
}

async function lockSupervisorOrder(database: CreditReader, orderId: string, supervisorId: string) {
  const [row] = await database
    .select({
      id: pedidos.id,
      date: pedidos.data,
      status: pedidos.status,
      customerId: pedidos.clienteId,
      customerTradeName: clientes.nomeFantasia,
      sellerId: pedidos.vendedorId,
      sellerName: vendedores.nome,
      discountAuthorityPercent: vendedores.alcadaDescontoPercentual,
      supervisorId: vendedores.supervisorId,
    })
    .from(pedidos)
    .innerJoin(vendedores, eq(pedidos.vendedorId, vendedores.id))
    .innerJoin(clientes, eq(pedidos.clienteId, clientes.id))
    .where(eq(pedidos.id, orderId))
    .for('update')

  if (!row || row.supervisorId !== supervisorId) {
    return null
  }

  return row
}

type Decision = 'approve' | 'reject'

async function decidePendingOrder(
  database: Db,
  orderId: string,
  supervisorId: string,
  decision: Decision,
) {
  return database.transaction(async (tx) => {
    const order = await lockSupervisorOrder(tx, orderId, supervisorId)
    if (!order) {
      return { ok: false as const, statusCode: 404 as const, body: ORDER_NOT_FOUND }
    }

    if (order.status !== PENDING_APPROVAL_STATUS) {
      return { ok: false as const, statusCode: 409 as const, body: ORDER_NOT_PENDING }
    }

    const lines = (await linesByOrderIds(tx, [order.id])).get(order.id) ?? []
    const net = orderTotals(lines).net

    if (decision === 'approve') {
      const locked = (await lockCustomerForUpdate(tx, order.customerId))!

      const credit = await availableCreditForCustomer(tx, locked, { excludeOrderId: order.id })
      if (net > credit) {
        return {
          ok: false as const,
          statusCode: 422 as const,
          body: validationIssuesSchema.parse([
            {
              code: 'INSUFFICIENT_CREDIT',
              message: 'Total líquido acima do crédito disponível',
              available: credit,
              net,
            },
          ]),
        }
      }

      await tx.update(pedidos).set({ status: 'Aprovado' }).where(eq(pedidos.id, order.id))
      await tx
        .update(clientes)
        .set({ creditoUtilizadoCentavos: locked.creditUsed + net })
        .where(eq(clientes.id, locked.id))

      return {
        ok: true as const,
        order: toSupervisorOrder({ ...order, status: 'Aprovado' }, lines),
      }
    }

    await tx.update(pedidos).set({ status: 'Rejeitado' }).where(eq(pedidos.id, order.id))

    return {
      ok: true as const,
      order: toSupervisorOrder({ ...order, status: 'Rejeitado' }, lines),
    }
  })
}

/** Mesmo 404 do Fastify para rota inexistente — não revela a rota nem o supervisor. */
async function requireKnownSupervisor(
  request: FastifyRequest,
  reply: FastifyReply,
  database: Db,
): Promise<string | null> {
  const supervisorId = supervisorIdHeaderSchema.safeParse(request.headers['x-supervisor-id'])
  if (!supervisorId.success) {
    reply.callNotFound()
    return null
  }

  const supervisor = await findSupervisor(database, supervisorId.data)
  if (!supervisor) {
    reply.callNotFound()
    return null
  }

  return supervisor.id
}

export function registerSupervisorRoutes(app: FastifyInstance, database: Db) {
  app.get('/supervisor/orders', async (request, reply) => {
    const supervisorId = await requireKnownSupervisor(request, reply, database)
    if (!supervisorId) {
      return
    }

    const query = supervisorOrdersQuerySchema.safeParse(request.query)
    if (!query.success) {
      return reply.code(400).send({
        message: 'Parâmetro status deve ser Aguardando aprovação',
      })
    }

    const rows = await database
      .select({
        id: pedidos.id,
        date: pedidos.data,
        status: pedidos.status,
        customerId: pedidos.clienteId,
        customerTradeName: clientes.nomeFantasia,
        sellerId: pedidos.vendedorId,
        sellerName: vendedores.nome,
        discountAuthorityPercent: vendedores.alcadaDescontoPercentual,
      })
      .from(pedidos)
      .innerJoin(vendedores, eq(pedidos.vendedorId, vendedores.id))
      .innerJoin(clientes, eq(pedidos.clienteId, clientes.id))
      .where(
        and(eq(pedidos.status, PENDING_APPROVAL_STATUS), eq(vendedores.supervisorId, supervisorId)),
      )
      .orderBy(desc(pedidos.data), desc(pedidos.id))

    const lines = await linesByOrderIds(
      database,
      rows.map((order) => order.id),
    )

    return supervisorOrdersResponseSchema.parse(
      rows.map((order) => toSupervisorOrder(order, lines.get(order.id) ?? [])),
    )
  })

  app.post<{ Params: { id: string } }>('/supervisor/orders/:id/approve', async (request, reply) => {
    const supervisorId = await requireKnownSupervisor(request, reply, database)
    if (!supervisorId) {
      return
    }

    const outcome = await decidePendingOrder(database, request.params.id, supervisorId, 'approve')
    if (!outcome.ok) {
      return reply.code(outcome.statusCode).send(outcome.body)
    }
    return reply.code(200).send(outcome.order)
  })

  app.post<{ Params: { id: string } }>('/supervisor/orders/:id/reject', async (request, reply) => {
    const supervisorId = await requireKnownSupervisor(request, reply, database)
    if (!supervisorId) {
      return
    }

    const outcome = await decidePendingOrder(database, request.params.id, supervisorId, 'reject')
    if (!outcome.ok) {
      return reply.code(outcome.statusCode).send(outcome.body)
    }
    return reply.code(200).send(outcome.order)
  })
}
