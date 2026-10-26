import { resolvePriceTableId, searchCustomerProducts } from '@yandeh/shared'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { Db } from '../db/client.js'
import { clientes, produtos, tabelasPrecoItens } from '../db/schema.js'
import {
  customerProductsQuerySchema,
  customerProductsResponseSchema,
  productsCatalogSchema,
  sellerIdHeaderSchema,
} from '../http/schemas.js'

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

    const [customer] = await database
      .select({
        id: clientes.id,
        sellerId: clientes.vendedorId,
        priceTableId: clientes.tabelaPrecoId,
      })
      .from(clientes)
      .where(eq(clientes.id, request.params.id))
      .limit(1)

    if (!customer) {
      return reply.code(404).send({ message: 'Cliente não encontrado' })
    }

    if (customer.sellerId !== sellerId.data) {
      return reply.code(403).send({ message: 'Cliente não pertence à carteira do vendedor' })
    }

    const table = resolvePriceTableId({ priceTableId: customer.priceTableId })

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
}
