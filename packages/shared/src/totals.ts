import type { Cents, OrderLineInput, OrderLineTotals, OrderTotals } from './types.js'

/**
 * RN07 / D8: desconto_linha = round(bruto × d / 100), half-up por linha.
 * Domínio documentado: 0 ≤ d ≤ 100 (fora disso é issue em T-08, não clamp).
 */
function lineDiscount(gross: Cents, discountPercent: number): Cents {
  return Math.round((gross * discountPercent) / 100)
}

/** Totais de uma linha, em centavos (RN06, RN07 / D7, D8). */
export function lineTotals(line: OrderLineInput): OrderLineTotals {
  const gross = line.quantityUnits * line.unitPrice
  const discount = lineDiscount(gross, line.discountPercent)
  return { gross, discount, net: gross - discount }
}

/** Soma dos totais das linhas. Arredondamento já ocorreu em cada linha. */
export function orderTotals(lines: OrderLineInput[]): OrderTotals {
  let gross = 0
  let discount = 0
  let net = 0
  for (const line of lines) {
    const totals = lineTotals(line)
    gross += totals.gross
    discount += totals.discount
    net += totals.net
  }
  return { gross, discount, net }
}
