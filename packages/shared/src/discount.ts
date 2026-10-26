import type { OrderLineInput, OrderStatus } from './types.js'

/**
 * Maior desconto percentual entre as linhas (RN10 / D7 / A9).
 * Pedido sem linhas: 0 (nenhum item com desconto). Comparação da alçada é `>` estrito.
 */
export function maxDiscount(lines: ReadonlyArray<Pick<OrderLineInput, 'discountPercent'>>): number {
  if (lines.length === 0) {
    return 0
  }
  return Math.max(...lines.map((line) => line.discountPercent))
}

/**
 * Status do pedido pela alçada: maior desconto de item vs alçada do vendedor (RN10 / D7 / A9 / R5).
 * `maior_desconto > alcada` → "Aguardando aprovação"; senão → "Enviado" (`>` estrito, igual é permitido).
 */
export function statusForDiscount(
  lines: ReadonlyArray<Pick<OrderLineInput, 'discountPercent'>>,
  authorityPercent: number,
): OrderStatus {
  return maxDiscount(lines) > authorityPercent ? 'Aguardando aprovação' : 'Enviado'
}
