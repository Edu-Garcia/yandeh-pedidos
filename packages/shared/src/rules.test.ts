import { describe, expect, it } from 'vitest'
import { FALLBACK_PRICE_TABLE_ID, MINIMUM_ORDER_CENTS } from './rules'

describe('constantes', () => {
  it('pedido mínimo é R$ 300,00 em centavos', () => {
    expect(MINIMUM_ORDER_CENTS).toBe(30000)
  })
  it('tabela de fallback é TP01', () => {
    expect(FALLBACK_PRICE_TABLE_ID).toBe('TP01')
  })
})

describe('lineTotals', () => {
  it.todo('arredonda por linha em centavos (PH001/P006: 40 x R$3,29 com 2% => líquido 12897)')
})

describe('isValidQuantity', () => {
  it.todo('P006 (FD 20, somente múltiplo) aceita 40 e rejeita 30')
  it.todo('P004 (CX 20, venda unitária permitida) aceita 7')
})

describe('statusForDiscount', () => {
  it.todo('V01 (alçada 5%) com item a 6% => Aguardando aprovação')
  it.todo('V01 com todos os itens <= 5% => Enviado')
})

describe('validateOrder', () => {
  it.todo('bloqueia pedido com líquido abaixo de R$ 300,00')
  it.todo('bloqueia C002 (R$ 350 disponíveis) com pedido de R$ 400')
  it.todo('bloqueia C010 (crédito totalmente utilizado)')
})
