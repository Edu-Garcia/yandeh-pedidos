import { unitPriceFor } from './price.js'
import { isSellable } from './sellable.js'
import type { CustomerProduct, PriceItem, Product } from './types.js'

/**
 * Normaliza texto para busca case/acento-insensível (RN04 / A21).
 * NFD + remove marcas combinantes — sem extensão `unaccent` no Postgres.
 */
export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/**
 * Trecho da descrição (case/acento-insensível) ou EAN exato (RN04 / A3 / A21).
 * EAN duplicado: todos os produtos com o código batem.
 */
export function matchesProductQuery(
  product: Pick<Product, 'ean' | 'description'>,
  query: string,
): boolean {
  const trimmed = query.trim()
  if (trimmed === '') {
    return false
  }
  if (product.ean === trimmed) {
    return true
  }
  return normalizeSearchText(product.description).includes(normalizeSearchText(trimmed))
}

/**
 * Busca vendáveis do catálogo na tabela efetiva (RN03 + RN04).
 * Ordena por `id` para resposta estável.
 */
export function searchCustomerProducts(input: {
  products: readonly Product[]
  priceItems: readonly PriceItem[]
  priceTableId: string
  query: string
}): CustomerProduct[] {
  const matched: CustomerProduct[] = []

  for (const product of input.products) {
    if (!matchesProductQuery(product, input.query)) {
      continue
    }
    const unitPrice = unitPriceFor(product, input.priceTableId, input.priceItems)
    if (unitPrice == null || !isSellable(product, unitPrice)) {
      continue
    }
    matched.push({
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
    })
  }

  return matched.sort((a, b) => a.id.localeCompare(b.id))
}
