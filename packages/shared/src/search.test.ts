import { describe, expect, it } from 'vitest'
import { toCents } from './money.js'
import { matchesProductQuery, normalizeSearchText, searchCustomerProducts } from './search.js'
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

/** P003 Açúcar Cristal 1kg — ativo; acento no nome (A21). */
const productP003: Product = {
  id: 'P003',
  sku: 'SKU-1002',
  ean: '7891133568863',
  description: 'Açúcar Cristal 1kg',
  category: 'mercearia',
  brand: 'Doce Vale',
  saleUnit: 'FD',
  packFactor: 10,
  multipleOnly: true,
  active: true,
}

/** P008 Biscoito Cream Cracker 400g — ativo. */
const productP008: Product = {
  id: 'P008',
  sku: 'SKU-1007',
  ean: '7891237566697',
  description: 'Biscoito Cream Cracker 400g',
  category: 'mercearia',
  brand: 'Crocante',
  saleUnit: 'UN',
  packFactor: 1,
  multipleOnly: false,
  active: true,
}

/** P009 Achocolatado em Pó 400g — ativo; EAN compartilhado com P023. */
const productP009: Product = {
  id: 'P009',
  sku: 'SKU-1008',
  ean: '7891831978575',
  description: 'Achocolatado em Pó 400g',
  category: 'mercearia',
  brand: 'Chocomix',
  saleUnit: 'UN',
  packFactor: 1,
  multipleOnly: false,
  active: true,
}

/** P021 Refrigerante Laranja 2L (descontinuado) — inativo. */
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

/** P022 Biscoito Recheado Chocolate 140g — inativo. */
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

/** P023 Achocolatado em Pó 400g Sachê — ativo; mesmo EAN de P009. */
const productP023: Product = {
  id: 'P023',
  sku: 'SKU-1022',
  ean: '7891831978575',
  description: 'Achocolatado em Pó 400g Sachê',
  category: 'mercearia',
  brand: 'Chocomix',
  saleUnit: 'UN',
  packFactor: 1,
  multipleOnly: false,
  active: true,
}

const catalog: Product[] = [
  productP001,
  productP003,
  productP008,
  productP009,
  productP021,
  productP022,
  productP023,
]

/** Preços reais do seed (TP01), já em centavos. */
const seedPriceItemsTp01: PriceItem[] = [
  { productId: 'P001', priceTableId: 'TP01', unitPrice: toCents(26.9) },
  { productId: 'P003', priceTableId: 'TP01', unitPrice: toCents(4.79) },
  { productId: 'P008', priceTableId: 'TP01', unitPrice: toCents(4.79) },
  { productId: 'P009', priceTableId: 'TP01', unitPrice: toCents(8.49) },
  { productId: 'P021', priceTableId: 'TP01', unitPrice: toCents(7.99) },
  { productId: 'P022', priceTableId: 'TP01', unitPrice: toCents(2.69) },
  { productId: 'P023', priceTableId: 'TP01', unitPrice: toCents(8.29) },
]

function search(query: string, priceTableId = 'TP01') {
  return searchCustomerProducts({
    products: catalog,
    priceItems: seedPriceItemsTp01,
    priceTableId,
    query,
  })
}

describe('normalizeSearchText', () => {
  it('remove acentos e deixa minúsculas', () => {
    expect(normalizeSearchText('Açúcar')).toBe('acucar')
    expect(normalizeSearchText('ACHOcolatado')).toBe('achocolatado')
  })
})

describe('matchesProductQuery', () => {
  it('trecho da descrição é case/acento-insensível', () => {
    expect(matchesProductQuery(productP003, 'acucar')).toBe(true)
    expect(matchesProductQuery(productP003, 'AÇÚCAR')).toBe(true)
    expect(matchesProductQuery(productP009, 'achocolatado')).toBe(true)
  })

  it('EAN exato (A3) — P009 e P023 compartilham 7891831978575', () => {
    expect(matchesProductQuery(productP009, '7891831978575')).toBe(true)
    expect(matchesProductQuery(productP023, '7891831978575')).toBe(true)
    expect(matchesProductQuery(productP001, '7891831978575')).toBe(false)
  })

  it('trecho de EAN não é match (EAN é exato)', () => {
    expect(matchesProductQuery(productP009, '789183')).toBe(false)
  })

  it('query vazia ou só espaços não casa', () => {
    expect(matchesProductQuery(productP001, '')).toBe(false)
    expect(matchesProductQuery(productP001, '   ')).toBe(false)
  })
})

describe('searchCustomerProducts', () => {
  it('q=achocolatado retorna P009 e P023 com preços TP01', () => {
    const results = search('achocolatado')
    expect(results.map((item) => item.id)).toEqual(['P009', 'P023'])
    expect(results[0]).toMatchObject({
      id: 'P009',
      description: 'Achocolatado em Pó 400g',
      ean: '7891831978575',
      unitPrice: 849,
    })
    expect(results[1]).toMatchObject({
      id: 'P023',
      description: 'Achocolatado em Pó 400g Sachê',
      ean: '7891831978575',
      unitPrice: 829,
    })
  })

  it('q=7891831978575 retorna P009 e P023 (EAN duplicado)', () => {
    expect(search('7891831978575').map((item) => item.id)).toEqual(['P009', 'P023'])
  })

  it('P021 e P022 (inativos) nunca entram, mesmo com preço e query que casaria', () => {
    expect(search('descontinuado').map((item) => item.id)).toEqual([])
    expect(search('recheado').map((item) => item.id)).toEqual([])
    expect(search('biscoito').map((item) => item.id)).toEqual(['P008'])
    expect(search('7891853290372').map((item) => item.id)).toEqual([])
    expect(search('7891366875370').map((item) => item.id)).toEqual([])
  })

  it('C004 / TP01: q=arroz devolve P001 a 2690', () => {
    const results = search('arroz')
    expect(results).toEqual([
      {
        id: 'P001',
        sku: 'SKU-1000',
        ean: '7891958224128',
        description: 'Arroz Branco Tipo 1 5kg',
        category: 'mercearia',
        brand: 'Grão Fino',
        saleUnit: 'UN',
        packFactor: 1,
        multipleOnly: false,
        unitPrice: 2690,
      },
    ])
  })

  it('produto ativo sem preço na tabela não é vendável', () => {
    const results = searchCustomerProducts({
      products: catalog,
      priceItems: seedPriceItemsTp01.filter((item) => item.productId !== 'P001'),
      priceTableId: 'TP01',
      query: 'arroz',
    })
    expect(results).toEqual([])
  })
})
