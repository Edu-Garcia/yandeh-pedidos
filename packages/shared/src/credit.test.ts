import { describe, expect, it } from 'vitest'
import { availableCredit, reservedCredit } from './credit'
import { toCents } from './money'
import type { Cents, Customer } from './types'

function order(status: string, net: Cents): { status: string; net: Cents } {
  return { status, net }
}

/** C001 Mercadinho São José — seed limite 5000 / utilizado 1200. */
const customerC001: Customer = {
  id: 'C001',
  tradeName: 'Mercadinho São José',
  priceTableId: 'TP01',
  creditLimit: toCents(5000),
  creditUsed: toCents(1200),
}

/** C002 Minibox Bom Preço — seed limite 12000 / utilizado 11650. */
const customerC002: Customer = {
  id: 'C002',
  tradeName: 'Minibox Bom Preço',
  priceTableId: 'TP02',
  creditLimit: toCents(12000),
  creditUsed: toCents(11650),
}

/** C006 Mercadinho Central — seed limite 4000 / utilizado 3900. */
const customerC006: Customer = {
  id: 'C006',
  tradeName: 'Mercadinho Central',
  priceTableId: 'TP03',
  creditLimit: toCents(4000),
  creditUsed: toCents(3900),
}

/** C010 Conveniência 24h Posto Sol — seed limite 4500 / utilizado 4500. */
const customerC010: Customer = {
  id: 'C010',
  tradeName: 'Conveniência 24h Posto Sol',
  priceTableId: 'TP01',
  creditLimit: toCents(4500),
  creditUsed: toCents(4500),
}

describe('reservedCredit', () => {
  it('sem pedidos pendentes → 0', () => {
    expect(reservedCredit([])).toBe(0)
  })

  it('um pendente de 32000 (C002 / T-07) → 32000', () => {
    expect(reservedCredit([order('Aguardando aprovação', 32000)])).toBe(32000)
  })

  it('vários pendentes somam o líquido', () => {
    expect(
      reservedCredit([order('Aguardando aprovação', 10000), order('Aguardando aprovação', 22000)]),
    ).toBe(32000)
  })

  it('só "Aguardando aprovação" reserva; demais status não entram (RN09 / D10 / A12)', () => {
    expect(
      reservedCredit([
        order('Aguardando aprovação', 15000),
        order('Enviado', 40000),
        order('Aprovado', 8000),
        order('Rejeitado', 12000),
        order('Faturado', 50000),
        order('Cancelado', 7000),
      ]),
    ).toBe(15000)
  })

  it('histórico do seed (Faturado/Cancelado) não reserva (A12)', () => {
    expect(reservedCredit([order('Faturado', 51930), order('Cancelado', 30000)])).toBe(0)
  })

  it('resultado é centavo inteiro', () => {
    const reserved = reservedCredit([order('Aguardando aprovação', toCents(320))])
    expect(reserved).toBe(32000)
    expect(Number.isInteger(reserved)).toBe(true)
  })
})

describe('availableCredit', () => {
  it('C001: 500000 − 120000 − 0 → 380000', () => {
    expect(customerC001.creditLimit).toBe(500000)
    expect(customerC001.creditUsed).toBe(120000)
    expect(availableCredit(customerC001, 0)).toBe(380000)
    expect(availableCredit(customerC001, reservedCredit([]))).toBe(380000)
  })

  it('C002: 1200000 − 1165000 → 35000', () => {
    expect(customerC002.creditLimit).toBe(1200000)
    expect(customerC002.creditUsed).toBe(1165000)
    expect(availableCredit(customerC002, 0)).toBe(35000)
  })

  it('C006: 400000 − 390000 → 10000', () => {
    expect(customerC006.creditLimit).toBe(400000)
    expect(customerC006.creditUsed).toBe(390000)
    expect(availableCredit(customerC006, 0)).toBe(10000)
  })

  it('C010: 450000 − 450000 → 0', () => {
    expect(customerC010.creditLimit).toBe(450000)
    expect(customerC010.creditUsed).toBe(450000)
    expect(availableCredit(customerC010, 0)).toBe(0)
  })

  it('C002 com pendente de 32000 → 3000', () => {
    const reserved = reservedCredit([order('Aguardando aprovação', 32000)])
    expect(reserved).toBe(32000)
    expect(availableCredit(customerC002, reserved)).toBe(3000)
  })

  it('resultado negativo não é clampado (C002 com reserva 50000 → −15000)', () => {
    expect(availableCredit(customerC002, 50000)).toBe(-15000)
    expect(availableCredit(customerC010, 1)).toBe(-1)
  })

  it('vários pendentes no C002 (10000 + 22000) → disponível 3000', () => {
    const reserved = reservedCredit([
      order('Aguardando aprovação', 10000),
      order('Aguardando aprovação', 22000),
    ])
    expect(availableCredit(customerC002, reserved)).toBe(3000)
  })

  it('resultados são centavos inteiros', () => {
    const available = availableCredit(customerC001, reservedCredit([]))
    expect(Number.isInteger(available)).toBe(true)
    expect(Number.isInteger(availableCredit(customerC002, 32000))).toBe(true)
  })
})
