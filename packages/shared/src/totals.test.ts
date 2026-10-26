import { describe, expect, it } from 'vitest'
import { formatBRL, toCents } from './money.js'
import { lineTotals, orderTotals } from './totals.js'
import type { OrderLineInput } from './types.js'

/** Intl pt-BR pode emitir NBSP/NNBSP entre "R$" e o valor. */
function normalizeBRL(value: string): string {
  return value.replace(/[\u00A0\u202F]/g, ' ')
}

function line(
  productId: string,
  quantityUnits: number,
  unitPrice: number,
  discountPercent: number,
): OrderLineInput {
  return { productId, quantityUnits, unitPrice, discountPercent }
}

/** PH001 / P006 Macarrão: preço histórico do seed 3,29 (não o TP01 atual). */
const ph001P006 = line('P006', 40, toCents(3.29), 2)

/** Exemplo C001 / TP01 do PRD §6 (preços atuais da tabela). */
const c001P001 = line('P001', 10, toCents(26.9), 0)
const c001P006 = line('P006', 40, toCents(3.33), 2)
const c001P010 = line('P010', 24, toCents(4.99), 0)
const c001Example: OrderLineInput[] = [c001P001, c001P006, c001P010]

const c001P001At6 = line('P001', 10, toCents(26.9), 6)

describe('lineTotals', () => {
  it('PH001/P006: 40 × 329 com 2% → desconto 263, líquido 12897', () => {
    expect(toCents(3.29)).toBe(329)
    expect(lineTotals(ph001P006)).toEqual({ gross: 13160, discount: 263, net: 12897 })
  })

  it('C001/P001: 10 × 2690 com 0% → desconto 0, líquido = bruto', () => {
    expect(lineTotals(c001P001)).toEqual({ gross: 26900, discount: 0, net: 26900 })
  })

  it('C001/P006: 40 × 333 com 2% → desconto 266, líquido 13054', () => {
    expect(toCents(3.33)).toBe(333)
    expect(lineTotals(c001P006)).toEqual({ gross: 13320, discount: 266, net: 13054 })
  })

  it('C001/P010: 24 × 499 com 0% → desconto 0', () => {
    expect(toCents(4.99)).toBe(499)
    expect(lineTotals(c001P010)).toEqual({ gross: 11976, discount: 0, net: 11976 })
  })

  it('P001 a 6% (alçada V01): 10 × 2690 → desconto 1614, líquido 25286', () => {
    expect(lineTotals(c001P001At6)).toEqual({ gross: 26900, discount: 1614, net: 25286 })
  })

  it('desconto 0% deixa o líquido igual ao bruto', () => {
    expect(lineTotals(line('P001', 10, 2690, 0))).toEqual({
      gross: 26900,
      discount: 0,
      net: 26900,
    })
  })

  it('desconto 100% zera o líquido', () => {
    expect(lineTotals(line('P006', 40, 329, 100))).toEqual({
      gross: 13160,
      discount: 13160,
      net: 0,
    })
  })

  it('arredonda half-up no limite exato de .5 centavo', () => {
    // 50 × 1% = 0,5 → 1; 150 × 1% = 1,5 → 2; 49 × 1% = 0,49 → 0
    expect(lineTotals(line('P001', 1, 50, 1))).toEqual({ gross: 50, discount: 1, net: 49 })
    expect(lineTotals(line('P001', 1, 150, 1))).toEqual({ gross: 150, discount: 2, net: 148 })
    expect(lineTotals(line('P001', 1, 49, 1))).toEqual({ gross: 49, discount: 0, net: 49 })
  })

  it('resultados são centavos inteiros', () => {
    const totals = lineTotals(ph001P006)
    expect(Number.isInteger(totals.gross)).toBe(true)
    expect(Number.isInteger(totals.discount)).toBe(true)
    expect(Number.isInteger(totals.net)).toBe(true)
  })
})

describe('orderTotals', () => {
  it('C001/TP01: P001 10×2690 0%, P006 40×333 2%, P010 24×499 0% → 52196 / 266 / 51930', () => {
    const totals = orderTotals(c001Example)
    expect(totals).toEqual({ gross: 52196, discount: 266, net: 51930 })
    expect(normalizeBRL(formatBRL(totals.net))).toBe('R$ 519,30')
  })

  it('o mesmo exemplo com P001 a 6% → desconto 1880, líquido 50316', () => {
    expect(lineTotals(c001P001At6).discount).toBe(1614)
    const totals = orderTotals([c001P001At6, c001P006, c001P010])
    expect(totals).toEqual({ gross: 52196, discount: 1880, net: 50316 })
    expect(normalizeBRL(formatBRL(totals.net))).toBe('R$ 503,16')
  })

  it('pedido vazio soma zero', () => {
    expect(orderTotals([])).toEqual({ gross: 0, discount: 0, net: 0 })
  })

  it('arredonda por linha, nunca na soma do pedido (D8)', () => {
    // Cada linha: 20 × 2% = 0,4 → 0. Soma das linhas = 0.
    // Se arredondasse no total: 40 × 2% = 0,8 → 1.
    const cheapA = line('P001', 1, 20, 2)
    const cheapB = line('P006', 1, 20, 2)
    expect(lineTotals(cheapA)).toEqual({ gross: 20, discount: 0, net: 20 })
    expect(orderTotals([cheapA, cheapB])).toEqual({ gross: 40, discount: 0, net: 40 })
  })
})
