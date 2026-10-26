import { availableCredit, orderTotals, reservedCredit } from '@yandeh/shared'
import { asc, eq, inArray } from 'drizzle-orm'
import type { Db } from './client.js'
import { pedidos, pedidosItens } from './schema.js'

export async function pendingNetsByCustomer(database: Db, customerIds: string[]) {
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

/** Crédito disponível do cliente (RN09) sem lock — transação FOR UPDATE fica na T-15. */
export async function availableCreditForCustomer(
  database: Db,
  customer: { id: string; creditLimit: number; creditUsed: number },
) {
  const pending = await pendingNetsByCustomer(database, [customer.id])
  const reserved = reservedCredit(pending.get(customer.id) ?? [])
  return availableCredit(
    { creditLimit: customer.creditLimit, creditUsed: customer.creditUsed },
    reserved,
  )
}
