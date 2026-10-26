import { describe, expect, it } from 'vitest'
import { FALLBACK_PRICE_TABLE_ID, MINIMUM_ORDER_CENTS } from './rules.js'

describe('constantes', () => {
  it('pedido mínimo é R$ 300,00 em centavos', () => {
    expect(MINIMUM_ORDER_CENTS).toBe(30000)
  })
  it('tabela de fallback é TP01', () => {
    expect(FALLBACK_PRICE_TABLE_ID).toBe('TP01')
  })
})
