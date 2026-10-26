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
import { availableCreditForCustomer } from '../db/pending-credit.js'
import { pedidos, pedidosItens, produtos, tabelasPrecoItens, vendedores } from '../db/schema.js'
import { env } from '../env.js'
import { findCustomerInSellerWallet } from '../http/seller-access.js'
import {
  createOrderBodySchema,
  createdOrderSchema,
  productsCatalogSchema,
  sellerIdHeaderSchema,
  validationIssuesSchema,
} from '../http/schemas.js'

export type OrderRouteDeps = {
  now?: () => Date
}

export function registerOrderRoutes(app: FastifyInstance, database: Db, deps: OrderRouteDeps = {}) {
  app.post('/orders', async (request, reply) => {
    const sellerId = sellerIdHeaderSchema.safeParse(request.headers['x-seller-id'])
    if (!sellerId.success) {
      return reply.code(400).send({ message: 'Cabeçalho X-Seller-Id é obrigatório' })
    }

    const body = createOrderBodySchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ message: 'Corpo da requisição inválido' })
    }

    const access = await findCustomerInSellerWallet(database, sellerId.data, body.data.customerId)
    if (!access.ok) {
      return reply.code(access.statusCode).send({ message: access.message })
    }

    const { customer } = access
    const table = resolvePriceTableId({ priceTableId: customer.priceTableId })
    const productIds = [...new Set(body.data.items.map((item) => item.productId))]

    const [sellerRows, productRows, priceRows, credit] = await Promise.all([
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
      availableCreditForCustomer(database, customer),
    ])

    const catalog = productsCatalogSchema.parse(productRows)
    const lines: ValidateOrderLine[] = body.data.items.map((item) => ({
      productId: item.productId,
      quantityUnits: item.quantity,
      unitPrice: unitPriceFor({ id: item.productId }, table.tableId, priceRows),
      discountPercent: item.discountPercent,
    }))

    const issues = validateOrder({
      lines,
      products: catalog,
      availableCredit: credit,
    })
    if (issues.length > 0) {
      return reply.code(422).send(validationIssuesSchema.parse(issues))
    }

    const pricedLines: OrderLineInput[] = lines.map((line) => ({
      productId: line.productId,
      quantityUnits: line.quantityUnits,
      unitPrice: line.unitPrice ?? 0,
      discountPercent: line.discountPercent,
    }))
    const totals = orderTotals(pricedLines)
    const status = statusForDiscount(pricedLines, sellerRows[0]!.discountAuthorityPercent)
    const orderId = randomUUID()
    const now = deps.now ?? (() => new Date())
    const orderDate = businessDate(now(), env.BUSINESS_TIMEZONE)

    await database.transaction(async (tx) => {
      await tx.insert(pedidos).values({
        id: orderId,
        clienteId: customer.id,
        vendedorId: sellerId.data,
        data: orderDate,
        status,
        idempotencyKey: null,
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
    })

    return reply.code(201).send(
      createdOrderSchema.parse({
        id: orderId,
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
