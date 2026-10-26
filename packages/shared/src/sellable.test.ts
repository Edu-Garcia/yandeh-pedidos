import { describe, expect, it } from 'vitest'
import { toCents } from './money.js'
import { unitPriceFor } from './price.js'
import { isSellable } from './sellable.js'
import type { PriceItem, Product } from './types.js'

/** P001 Arroz Branco Tipo 1 5kg — ativo no seed. */
const productP001: Product = {
  id: 'P001',
  sku: 'SKU-1000',
  ean: '7891958224128',
  description: 'Arroz Branco Tipo 1 5kg',
  category: 'mercearia',
  brand: 'Grão Fino',
  saleUnit: 'UN',
  packFactor: 1,
  multipleOnly: false,
  active: true,
}

/** P021 Refrigerante Laranja 2L (descontinuado) — inativo no seed. */
const productP021: Product = {
  id: 'P021',
  sku: 'SKU-1020',
  ean: '7891853290372',
  description: 'Refrigerante Laranja 2L (descontinuado)',
  category: 'bebidas',
  brand: 'Gela',
  saleUnit: 'FD',
  packFactor: 6,
  multipleOnly: true,
  active: false,
}

/** P022 Biscoito Recheado Chocolate 140g — inativo no seed. */
const productP022: Product = {
  id: 'P022',
  sku: 'SKU-1021',
  ean: '7891366875370',
  description: 'Biscoito Recheado Chocolate 140g',
  category: 'mercearia',
  brand: 'Crocante',
  saleUnit: 'UN',
  packFactor: 1,
  multipleOnly: false,
  active: false,
}

/** Itens reais do seed (`tabelas_preco`), já em centavos. P021 não existe na TP03. */
const seedPriceItems: PriceItem[] = [
  { productId: 'P001', priceTableId: 'TP01', unitPrice: toCents(26.9) },
  { productId: 'P021', priceTableId: 'TP01', unitPrice: toCents(7.99) },
  { productId: 'P021', priceTableId: 'TP02', unitPrice: toCents(7.51) },
  { productId: 'P022', priceTableId: 'TP01', unitPrice: toCents(2.69) },
  { productId: 'P022', priceTableId: 'TP03', unitPrice: toCents(2.88) },
]

describe('isSellable', () => {
  it('P021 (inativo) não é vendável mesmo com preço na TP01', () => {
    const price = unitPriceFor(productP021, 'TP01', seedPriceItems)
    expect(price).toBe(toCents(7.99))
    expect(isSellable(productP021, price)).toBe(false)
  })

  it('P022 (inativo) não é vendável mesmo com preço na TP01', () => {
    const price = unitPriceFor(productP022, 'TP01', seedPriceItems)
    expect(price).toBe(toCents(2.69))
    expect(isSellable(productP022, price)).toBe(false)
  })

  it('P021 e P022 (inativos) não são vendáveis com qualquer preço', () => {
    expect(isSellable(productP021, 0)).toBe(false)
    expect(isSellable(productP021, 799)).toBe(false)
    expect(isSellable(productP022, 269)).toBe(false)
    expect(isSellable(productP022, 9999)).toBe(false)
  })

  it('P021 na TP03 (sem preço no seed) não é vendável', () => {
    const price = unitPriceFor(productP021, 'TP03', seedPriceItems)
    expect(price).toBeNull()
    expect(isSellable(productP021, price)).toBe(false)
  })

  it('P001 ativo com preço TP01 2690 é vendável', () => {
    const price = unitPriceFor(productP001, 'TP01', seedPriceItems)
    expect(price).toBe(2690)
    expect(isSellable(productP001, price)).toBe(true)
  })

  it('produto ativo sem preço (null) não é vendável', () => {
    expect(isSellable(productP001, null)).toBe(false)
  })

  it('produto ativo com preço 0 é vendável (0 não é ausência)', () => {
    expect(isSellable(productP001, 0)).toBe(true)
  })
})
