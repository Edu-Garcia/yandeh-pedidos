import { randomUUID } from 'node:crypto'
import {
  businessDate,
  orderTotals,
  resolvePriceTableId,
  statusForDiscount,
  unitPriceFor,
  validateOrder,
  type OrderLineInput,
  type ValidateOrderLine,
} from '@yandeh/shared'
import { eq, inArray } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { Db } from '../db/client.js'
import {
  availableCreditForCustomer,
  lockCustomerForUpdate,
  type CreditReader,
} from '../db/pending-credit.js'
import {
  clientes,
  pedidos,
  pedidosItens,
  produtos,
  tabelasPrecoItens,
  vendedores,
} from '../db/schema.js'
import { env } from '../env.js'
import { findCustomerInSellerWallet } from '../http/seller-access.js'
import {
  createOrderBodySchema,
  createdOrderSchema,
  idempotencyKeyHeaderSchema,
  productsCatalogSchema,
  sellerIdHeaderSchema,
  validationIssuesSchema,
} from '../http/schemas.js'

/** Postgres unique_violation — a corrida da mesma Idempotency-Key cai aqui (RN13). */
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  while (current && typeof current === 'object') {
    if ('code' in current && (current as { code: unknown }).code === '23505') {
      return true
    }
    current = 'cause' in current ? (current as { cause: unknown }).cause : undefined
  }
  return false
}

async function createdOrderByIdempotencyKey(database: CreditReader, key: string) {
  const [order] = await database
    .select({
      id: pedidos.id,
      customerId: pedidos.clienteId,
      sellerId: pedidos.vendedorId,
      status: pedidos.status,
    })
    .from(pedidos)
    .where(eq(pedidos.idempotencyKey, key))
    .limit(1)

  if (!order) {
    return null
  }

  const itemRows = await database
    .select({
      productId: pedidosItens.produtoId,
      quantity: pedidosItens.quantidade,
      unitPrice: pedidosItens.precoUnidadeCentavos,
      discountPercent: pedidosItens.descontoPercentual,
    })
    .from(pedidosItens)
    .where(eq(pedidosItens.pedidoId, order.id))

  const pricedLines: OrderLineInput[] = itemRows.map((line) => ({
    productId: line.productId,
    quantityUnits: line.quantity,
    unitPrice: line.unitPrice,
    discountPercent: line.discountPercent,
  }))

  return createdOrderSchema.parse({
    id: order.id,
    customerId: order.customerId,
    sellerId: order.sellerId,
    status: order.status,
    totals: orderTotals(pricedLines),
    items: itemRows,
  })
}

const idempotencyKeyConflict = {
  message: 'Idempotency-Key já foi usada em outro pedido',
  code: 'IDEMPOTENCY_KEY_CONFLICT',
} as const

type ExistingOrder = NonNullable<Awaited<ReturnType<typeof createdOrderByIdempotencyKey>>>

function resolveIdempotencyKey(
  existing: ExistingOrder,
  sellerId: string,
  customerId: string,
): { kind: 'replay'; order: ExistingOrder } | { kind: 'conflict' } {
  if (existing.sellerId === sellerId && existing.customerId === customerId) {
    return { kind: 'replay', order: existing }
  }
  return { kind: 'conflict' }
}

export type OrderRouteDeps = {
  now?: () => Date
}

export function registerOrderRoutes(app: FastifyInstance, database: Db, deps: OrderRouteDeps = {}) {
  app.post('/orders', async (request, reply) => {
    const sellerId = sellerIdHeaderSchema.safeParse(request.headers['x-seller-id'])
    if (!sellerId.success) {
      return reply.code(400).send({ message: 'Cabeçalho X-Seller-Id é obrigatório' })
    }

    const idempotencyKey = idempotencyKeyHeaderSchema.safeParse(request.headers['idempotency-key'])
    if (!idempotencyKey.success) {
      return reply.code(400).send({
        message: 'Cabeçalho Idempotency-Key é obrigatório e deve ser um UUID',
      })
    }

    const body = createOrderBodySchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ message: 'Corpo da requisição inválido' })
    }

    const access = await findCustomerInSellerWallet(database, sellerId.data, body.data.customerId)
    if (!access.ok) {
      return reply.code(access.statusCode).send({ message: access.message })
    }

    const existingBeforeWrite = await createdOrderByIdempotencyKey(database, idempotencyKey.data)
    if (existingBeforeWrite) {
      const resolved = resolveIdempotencyKey(
        existingBeforeWrite,
        sellerId.data,
        body.data.customerId,
      )
      if (resolved.kind === 'conflict') {
        return reply.code(409).send(idempotencyKeyConflict)
      }
      return reply.code(200).send(resolved.order)
    }

    const { customer } = access
    const table = resolvePriceTableId({ priceTableId: customer.priceTableId })
    const productIds = [...new Set(body.data.items.map((item) => item.productId))]

    const [sellerRows, productRows, priceRows] = await Promise.all([
      database
        .select({ discountAuthorityPercent: vendedores.alcadaDescontoPercentual })
        .from(vendedores)
        .where(eq(vendedores.id, sellerId.data))
        .limit(1),
      productIds.length === 0
        ? Promise.resolve([])
        : database
            .select({
              id: produtos.id,
              sku: produtos.sku,
              ean: produtos.ean,
              description: produtos.descricao,
              category: produtos.categoria,
              brand: produtos.marca,
              saleUnit: produtos.unidadeVenda,
              packFactor: produtos.fatorEmbalagem,
              multipleOnly: produtos.vendaSomenteMultiplo,
              active: produtos.ativo,
            })
            .from(produtos)
            .where(inArray(produtos.id, productIds)),
      database
        .select({
          productId: tabelasPrecoItens.produtoId,
          priceTableId: tabelasPrecoItens.tabelaPrecoId,
          unitPrice: tabelasPrecoItens.precoUnidadeCentavos,
        })
        .from(tabelasPrecoItens)
        .where(eq(tabelasPrecoItens.tabelaPrecoId, table.tableId)),
    ])

    const catalog = productsCatalogSchema.parse(productRows)
    const lines: ValidateOrderLine[] = body.data.items.map((item) => ({
      productId: item.productId,
      quantityUnits: item.quantity,
      unitPrice: unitPriceFor({ id: item.productId }, table.tableId, priceRows),
      discountPercent: item.discountPercent,
    }))

    const pricedLines: OrderLineInput[] = lines.map((line) => ({
      productId: line.productId,
      quantityUnits: line.quantityUnits,
      unitPrice: line.unitPrice ?? 0,
      discountPercent: line.discountPercent,
    }))
    const totals = orderTotals(pricedLines)
    const status = statusForDiscount(pricedLines, sellerRows[0]!.discountAuthorityPercent)
    const now = deps.now ?? (() => new Date())
    const orderDate = businessDate(now(), env.BUSINESS_TIMEZONE)

    let outcome
    try {
      outcome = await database.transaction(async (tx) => {
        const locked = await lockCustomerForUpdate(tx, customer.id)
        if (!locked) {
          return { ok: false as const, statusCode: 404 as const, message: 'Cliente não encontrado' }
        }

        const existing = await createdOrderByIdempotencyKey(tx, idempotencyKey.data)
        if (existing) {
          const resolved = resolveIdempotencyKey(existing, sellerId.data, body.data.customerId)
          if (resolved.kind === 'conflict') {
            return { ok: false as const, statusCode: 409 as const, conflict: true as const }
          }
          return { ok: true as const, replay: resolved.order }
        }

        const credit = await availableCreditForCustomer(tx, locked)
        const issues = validateOrder({
          lines,
          products: catalog,
          availableCredit: credit,
        })
        if (issues.length > 0) {
          return { ok: false as const, statusCode: 422 as const, issues }
        }

        const orderId = randomUUID()
        await tx.insert(pedidos).values({
          id: orderId,
          clienteId: customer.id,
          vendedorId: sellerId.data,
          data: orderDate,
          status,
          idempotencyKey: idempotencyKey.data,
        })
        await tx.insert(pedidosItens).values(
          pricedLines.map((line) => ({
            pedidoId: orderId,
            produtoId: line.productId,
            quantidade: line.quantityUnits,
            precoUnidadeCentavos: line.unitPrice,
            descontoPercentual: line.discountPercent,
          })),
        )

        if (status === 'Enviado') {
          await tx
            .update(clientes)
            .set({ creditoUtilizadoCentavos: locked.creditUsed + totals.net })
            .where(eq(clientes.id, locked.id))
        }

        return { ok: true as const, orderId }
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        const existing = await createdOrderByIdempotencyKey(database, idempotencyKey.data)
        if (existing) {
          const resolved = resolveIdempotencyKey(existing, sellerId.data, body.data.customerId)
          if (resolved.kind === 'conflict') {
            return reply.code(409).send(idempotencyKeyConflict)
          }
          return reply.code(200).send(resolved.order)
        }
      }
      throw error
    }

    if (!outcome.ok) {
      if (outcome.statusCode === 422) {
        return reply.code(422).send(validationIssuesSchema.parse(outcome.issues))
      }
      if (outcome.statusCode === 409) {
        return reply.code(409).send(idempotencyKeyConflict)
      }
      return reply.code(outcome.statusCode).send({ message: outcome.message })
    }

    if ('replay' in outcome) {
      return reply.code(200).send(outcome.replay)
    }

    return reply.code(201).send(
      createdOrderSchema.parse({
        id: outcome.orderId,
        customerId: customer.id,
        sellerId: sellerId.data,
        status,
        totals,
        items: pricedLines.map((line) => ({
          productId: line.productId,
          quantity: line.quantityUnits,
          unitPrice: line.unitPrice,
          discountPercent: line.discountPercent,
        })),
      }),
    )
  })
}
