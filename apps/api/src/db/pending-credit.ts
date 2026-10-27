import { availableCredit, orderTotals, reservedCredit } from '@yandeh/shared'
import { asc, eq, inArray } from 'drizzle-orm'
import type { Db } from './client.js'
import { clientes, pedidos, pedidosItens } from './schema.js'

/** `db` ou o `tx` de `database.transaction` — ambos expõem `select`. */
export type CreditReader = Pick<Db, 'select'>

export async function pendingNetsByCustomer(database: CreditReader, customerIds: string[]) {
  const byCustomer = new Map<string, Array<{ id: string; status: string; net: number }>>()
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

  for (const [orderId, order] of linesByOrder) {
    const list = byCustomer.get(order.customerId) ?? []
    list.push({ id: orderId, status: order.status, net: orderTotals(order.lines).net })
    byCustomer.set(order.customerId, list)
  }

  return byCustomer
}

/** Trava a linha do cliente (RN09) para a transação de crédito. */
export async function lockCustomerForUpdate(database: CreditReader, customerId: string) {
  const [row] = await database
    .select({
      id: clientes.id,
      creditLimit: clientes.limiteCreditoCentavos,
      creditUsed: clientes.creditoUtilizadoCentavos,
    })
    .from(clientes)
    .where(eq(clientes.id, customerId))
    .for('update')

  return row
}

/** Crédito disponível do cliente (RN09) — chamar depois do lock na T-15. */
export async function availableCreditForCustomer(
  database: CreditReader,
  customer: { id: string; creditLimit: number; creditUsed: number },
  options?: { excludeOrderId?: string },
) {
  const pending = await pendingNetsByCustomer(database, [customer.id])
  const reserved = reservedCredit(
    (pending.get(customer.id) ?? []).filter((order) => order.id !== options?.excludeOrderId),
  )
  return availableCredit(
    { creditLimit: customer.creditLimit, creditUsed: customer.creditUsed },
    reserved,
  )
}
