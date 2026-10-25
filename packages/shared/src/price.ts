import type { Cents, Customer, EffectivePriceTable, PriceItem, Product } from './types'
import { FALLBACK_PRICE_TABLE_ID } from './rules'

/**
 * Tabela efetiva do cliente (RN02 / D11 / A2).
 * `tabela = cliente.tabela_preco_id ?? 'TP01'`. `isFallback` só quando o id é nulo.
 */
export function resolvePriceTableId(customer: Pick<Customer, 'priceTableId'>): EffectivePriceTable {
  const isFallback = customer.priceTableId == null
  return {
    tableId: customer.priceTableId ?? FALLBACK_PRICE_TABLE_ID,
    isFallback,
  }
}

/**
 * Preço unitário (centavos) do produto na tabela, ou `null` se não houver item.
 */
export function unitPriceFor(
  product: Pick<Product, 'id'>,
  tableId: string,
  priceItems: readonly PriceItem[],
): Cents | null {
  const item = priceItems.find(
    (entry) => entry.productId === product.id && entry.priceTableId === tableId,
  )
  return item === undefined ? null : item.unitPrice
}
