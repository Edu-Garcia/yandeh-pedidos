import type { Cents, Product } from './types'

/**
 * Produto vendável (RN03 / A4 / A5).
 * Vendável ⇔ `ativo` e existe preço (`price != null`).
 * Preço 0 é válido (A27 / T-02), não ausência.
 */
export function isSellable(product: Pick<Product, 'active'>, price: Cents | null): boolean {
  return product.active && price != null
}
