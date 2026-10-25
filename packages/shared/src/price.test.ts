import { describe, expect, it } from 'vitest'
import { toCents } from './money'
import { unitPriceFor, resolvePriceTableId } from './price'
import { FALLBACK_PRICE_TABLE_ID } from './rules'
import type { Customer, PriceItem } from './types'

const customerC004: Customer = {
  id: 'C004',
  tradeName: 'Mercearia Dona Lúcia',
  priceTableId: null,
  creditLimit: 300000,
  creditUsed: 0,
}

const customerC001: Customer = {
  id: 'C001',
  tradeName: 'Mercadinho São José',
  priceTableId: 'TP01',
  creditLimit: 500000,
  creditUsed: 120000,
}

/** Itens reais do seed (`tabelas_preco`), já em centavos. P021 não existe na TP03. */
const seedPriceItems: PriceItem[] = [
  { productId: 'P001', priceTableId: 'TP01', unitPrice: toCents(26.9) },
  { productId: 'P001', priceTableId: 'TP02', unitPrice: toCents(25.29) },
  { productId: 'P001', priceTableId: 'TP03', unitPrice: toCents(28.78) },
  { productId: 'P021', priceTableId: 'TP01', unitPrice: toCents(7.99) },
  { productId: 'P021', priceTableId: 'TP02', unitPrice: toCents(7.51) },
]

describe('resolvePriceTableId', () => {
  it('C004 (Mercearia Dona Lúcia, tabela nula) usa TP01 com fallback', () => {
    const resolved = resolvePriceTableId(customerC004)
    expect(resolved).toEqual({ tableId: FALLBACK_PRICE_TABLE_ID, isFallback: true })
    expect(resolved.tableId).toBe('TP01')
  })

  it('C001 (Mercadinho São José, TP01 explícita) não é fallback', () => {
    expect(resolvePriceTableId(customerC001)).toEqual({ tableId: 'TP01', isFallback: false })
  })

  it('C002 (Minibox Bom Preço, TP02) mantém a tabela do cliente', () => {
    expect(resolvePriceTableId({ priceTableId: 'TP02' })).toEqual({
      tableId: 'TP02',
      isFallback: false,
    })
  })

  it('C006 (Mercadinho Central, TP03) mantém a tabela do cliente', () => {
    expect(resolvePriceTableId({ priceTableId: 'TP03' })).toEqual({
      tableId: 'TP03',
      isFallback: false,
    })
  })

  it.each([null, '', '   '] as const)(
    '%j (nulo, vazio ou só espaços) usa TP01 com fallback',
    (priceTableId) => {
      expect(resolvePriceTableId({ priceTableId })).toEqual({
        tableId: FALLBACK_PRICE_TABLE_ID,
        isFallback: true,
      })
    },
  )
})

describe('unitPriceFor', () => {
  it('P001 na TP01 custa 2690 (seed 26,9)', () => {
    expect(unitPriceFor({ id: 'P001' }, 'TP01', seedPriceItems)).toBe(2690)
  })

  it('P001 na TP02 e TP03 usa o preço da tabela pedida', () => {
    expect(unitPriceFor({ id: 'P001' }, 'TP02', seedPriceItems)).toBe(toCents(25.29))
    expect(unitPriceFor({ id: 'P001' }, 'TP03', seedPriceItems)).toBe(toCents(28.78))
  })

  it('P021 na TP03 (ausente no seed) retorna null', () => {
    expect(unitPriceFor({ id: 'P021' }, 'TP03', seedPriceItems)).toBeNull()
  })

  it('produto sem nenhum item na lista retorna null', () => {
    expect(unitPriceFor({ id: 'P999' }, 'TP01', seedPriceItems)).toBeNull()
  })

  it('lista vazia retorna null', () => {
    expect(unitPriceFor({ id: 'P001' }, 'TP01', [])).toBeNull()
  })

  it('preço zero é preço válido, não ausência', () => {
    const items: PriceItem[] = [{ productId: 'P001', priceTableId: 'TP01', unitPrice: 0 }]
    expect(unitPriceFor({ id: 'P001' }, 'TP01', items)).toBe(0)
  })
})
