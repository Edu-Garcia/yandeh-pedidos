import type { Product } from './types.js'

/**
 * Unidades correspondentes a N lotes (RN05 / D9).
 * `Unidades = lote × fator_embalagem`.
 */
export function unitsFromLots(lots: number, factor: number): number {
  return lots * factor
}

/**
 * Lotes correspondentes a N unidades, ou `null` se não fecha lote inteiro (RN05 / D9).
 * Lote vazio na UI ⇔ retorno `null`.
 */
export function lotsFromUnits(units: number, factor: number): number | null {
  const lots = units / factor
  return Number.isInteger(lots) ? lots : null
}

/**
 * Produto mostra o campo Lote? Falso para `UN` com fator 1 (RN05 / D9 / A25).
 */
export function hasLotField(product: Pick<Product, 'saleUnit' | 'packFactor'>): boolean {
  return product.saleUnit !== 'UN' || product.packFactor !== 1
}

/**
 * Campo Unidades somente leitura ⇔ `venda_somente_multiplo` (RN05 / D9 / A25).
 */
export function isUnitsReadOnly(product: Pick<Product, 'multipleOnly'>): boolean {
  return product.multipleOnly
}

/**
 * Quantidade em unidades válida para o produto (RN05 / A7 / A22).
 * Inteiro ≥ 1; múltiplo do fator quando `venda_somente_multiplo`.
 */
export function isValidQuantity(
  product: Pick<Product, 'packFactor' | 'multipleOnly'>,
  quantityUnits: number,
): boolean {
  if (!Number.isInteger(quantityUnits) || quantityUnits < 1) {
    return false
  }
  if (product.multipleOnly) {
    return quantityUnits % product.packFactor === 0
  }
  return true
}
