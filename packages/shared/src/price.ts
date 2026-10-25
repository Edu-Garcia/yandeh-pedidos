import type { Cents, Customer, EffectivePriceTable, PriceItem, Product } from './types'
import { FALLBACK_PRICE_TABLE_ID } from './rules'

/**
 * Tabela efetiva do cliente (RN02 / D11 / A2).
 * Id nulo, vazio ou só espaços → TP01. `isFallback` indica que o fallback foi usado.
 */
export function resolvePriceTableId(customer: Pick<Customer, 'priceTableId'>): EffectivePriceTable {
  const raw = customer.priceTableId
  if (raw == null || raw.trim() === '') {
    return { tableId: FALLBACK_PRICE_TABLE_ID, isFallback: true }
  }
  return { tableId: raw, isFallback: false }
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
