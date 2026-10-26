import {
  buildRepeatDraft,
  orderTotals,
  resolvePriceTableId,
  searchCustomerProducts,
  type CustomerProduct,
  type OrderLineInput,
  type Product,
} from '@yandeh/shared'
import { desc, eq, inArray } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { Db } from '../db/client.js'
import { pedidos, pedidosItens, produtos, tabelasPrecoItens } from '../db/schema.js'
import { findCustomerInSellerWallet } from '../http/seller-access.js'
import {
  customerOrdersResponseSchema,
  customerProductsQuerySchema,
  customerProductsResponseSchema,
  productsCatalogSchema,
  repeatDraftResponseSchema,
  sellerIdHeaderSchema,
} from '../http/schemas.js'

/** Data civil gravada (YYYY-MM-DD). DATE do Postgres chega como string ou Date UTC. */
function civilDateFromColumn(value: string | Date): string {
  if (typeof value === 'string') {
    return value.slice(0, 10)
  }
  return value.toISOString().slice(0, 10)
}

function toCustomerProduct(product: Product, unitPrice: number): CustomerProduct {
  return {
    id: product.id,
    sku: product.sku,
    ean: product.ean,
    description: product.description,
    category: product.category,
    brand: product.brand,
    saleUnit: product.saleUnit,
    packFactor: product.packFactor,
    multipleOnly: product.multipleOnly,
    unitPrice,
  }
}

export function registerCustomerRoutes(app: FastifyInstance, database: Db) {
  app.get<{ Params: { id: string } }>('/customers/:id/products', async (request, reply) => {
    const sellerId = sellerIdHeaderSchema.safeParse(request.headers['x-seller-id'])
    if (!sellerId.success) {
      return reply.code(400).send({ message: 'Cabeçalho X-Seller-Id é obrigatório' })
    }

    const query = customerProductsQuerySchema.safeParse(request.query)
    if (!query.success) {
      return reply.code(400).send({ message: 'Parâmetro q é obrigatório' })
    }

    const access = await findCustomerInSellerWallet(database, sellerId.data, request.params.id)
    if (!access.ok) {
      return reply.code(access.statusCode).send({ message: access.message })
    }

    const table = resolvePriceTableId({ priceTableId: access.customer.priceTableId })

    const productRows = await database
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

    const priceRows = await database
      .select({
        productId: tabelasPrecoItens.produtoId,
        priceTableId: tabelasPrecoItens.tabelaPrecoId,
        unitPrice: tabelasPrecoItens.precoUnidadeCentavos,
      })
      .from(tabelasPrecoItens)
      .where(eq(tabelasPrecoItens.tabelaPrecoId, table.tableId))

    const payload = searchCustomerProducts({
      products: productsCatalogSchema.parse(productRows),
      priceItems: priceRows,
      priceTableId: table.tableId,
      query: query.data.q,
    })

    return customerProductsResponseSchema.parse(payload)
  })

  app.get<{ Params: { id: string } }>('/customers/:id/orders', async (request, reply) => {
    const sellerId = sellerIdHeaderSchema.safeParse(request.headers['x-seller-id'])
    if (!sellerId.success) {
      return reply.code(400).send({ message: 'Cabeçalho X-Seller-Id é obrigatório' })
    }

    const access = await findCustomerInSellerWallet(database, sellerId.data, request.params.id)
    if (!access.ok) {
      return reply.code(access.statusCode).send({ message: access.message })
    }

    const orderRows = await database
      .select({
        id: pedidos.id,
        date: pedidos.data,
        status: pedidos.status,
      })
      .from(pedidos)
      .where(eq(pedidos.clienteId, access.customer.id))
      .orderBy(desc(pedidos.data), desc(pedidos.id))

    if (orderRows.length === 0) {
      return customerOrdersResponseSchema.parse([])
    }

    const itemRows = await database
      .select({
        orderId: pedidosItens.pedidoId,
        productId: pedidosItens.produtoId,
        quantity: pedidosItens.quantidade,
        unitPrice: pedidosItens.precoUnidadeCentavos,
        discountPercent: pedidosItens.descontoPercentual,
      })
      .from(pedidosItens)
      .where(
        inArray(
          pedidosItens.pedidoId,
          orderRows.map((order) => order.id),
        ),
      )

    const linesByOrder = new Map<string, OrderLineInput[]>()
    for (const item of itemRows) {
      const lines = linesByOrder.get(item.orderId) ?? []
      lines.push({
        productId: item.productId,
        quantityUnits: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
      })
      linesByOrder.set(item.orderId, lines)
    }

    return customerOrdersResponseSchema.parse(
      orderRows.map((order) => ({
        id: order.id,
        date: civilDateFromColumn(order.date),
        status: order.status,
        total: orderTotals(linesByOrder.get(order.id) ?? []).net,
      })),
    )
  })

  app.post<{ Params: { id: string; orderId: string } }>(
    '/customers/:id/orders/:orderId/repeat',
    async (request, reply) => {
      const sellerId = sellerIdHeaderSchema.safeParse(request.headers['x-seller-id'])
      if (!sellerId.success) {
        return reply.code(400).send({ message: 'Cabeçalho X-Seller-Id é obrigatório' })
      }

      const access = await findCustomerInSellerWallet(database, sellerId.data, request.params.id)
      if (!access.ok) {
        return reply.code(access.statusCode).send({ message: access.message })
      }

      const [order] = await database
        .select({
          id: pedidos.id,
          customerId: pedidos.clienteId,
        })
        .from(pedidos)
        .where(eq(pedidos.id, request.params.orderId))
        .limit(1)

      if (!order || order.customerId !== access.customer.id) {
        return reply.code(404).send({ message: 'Pedido não encontrado' })
      }

      const itemRows = await database
        .select({
          productId: pedidosItens.produtoId,
          quantity: pedidosItens.quantidade,
        })
        .from(pedidosItens)
        .where(eq(pedidosItens.pedidoId, order.id))

      const table = resolvePriceTableId({ priceTableId: access.customer.priceTableId })
      const productIds = [...new Set(itemRows.map((item) => item.productId))]

      const [productRows, priceRows] = await Promise.all([
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
      const productsById = new Map(catalog.map((product) => [product.id, product]))
      const draft = buildRepeatDraft(
        {
          id: order.id,
          items: itemRows.map((item) => ({
            productId: item.productId,
            quantityUnits: item.quantity,
          })),
        },
        catalog,
        { tableId: table.tableId, items: priceRows },
      )

      return repeatDraftResponseSchema.parse({
        lines: draft.lines.map((line) => ({
          productId: line.productId,
          product: toCustomerProduct(productsById.get(line.productId)!, line.unitPrice),
          quantityUnits: line.quantityUnits,
          discountPercent: line.discountPercent,
          lots: line.lots,
        })),
        removed: draft.removed.map((item) => {
          const product = productsById.get(item.productId)
          return {
            productId: item.productId,
            description: product?.description ?? null,
            ean: product?.ean ?? null,
            reason: item.reason,
          }
        }),
        notices: draft.notices.map((notice) => ({
          ...notice,
          description: productsById.get(notice.productId)?.description ?? null,
        })),
      })
    },
  )
}
