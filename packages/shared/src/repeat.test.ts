import { describe, expect, it } from 'vitest'
import seed from '../../../apps/api/seed/seed.json' with { type: 'json' }
import { toCents } from './money.js'
import { lotsFromUnits } from './packaging.js'
import { buildRepeatDraft, type HistoryOrder } from './repeat.js'
import type { PriceItem, Product } from './types.js'

/** P001 Arroz Branco Tipo 1 5kg — UN fator 1, ativo (seed). */
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

/** P003 Açúcar Cristal 1kg — FD 10, somente múltiplo, ativo (seed). */
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

/** P004 Óleo de Soja 900ml — CX 20, venda unitária permitida (seed). */
const productP004: Product = {
  id: 'P004',
  sku: 'SKU-1003',
  ean: '7891469138105',
  description: 'Óleo de Soja 900ml',
  category: 'mercearia',
  brand: 'Soyara',
  saleUnit: 'CX',
  packFactor: 20,
  multipleOnly: false,
  active: true,
}

/** P006 Macarrão Espaguete 500g — FD 20, somente múltiplo, ativo (seed). */
const productP006: Product = {
  id: 'P006',
  sku: 'SKU-1005',
  ean: '7891399588384',
  description: 'Macarrão Espaguete 500g',
  category: 'mercearia',
  brand: 'Massa Boa',
  saleUnit: 'FD',
  packFactor: 20,
  multipleOnly: true,
  active: true,
}

/** P010 Leite UHT Integral 1L — CX 12, somente múltiplo, ativo (seed). */
const productP010: Product = {
  id: 'P010',
  sku: 'SKU-1009',
  ean: '7891216687320',
  description: 'Leite UHT Integral 1L',
  category: 'bebidas',
  brand: 'Vale Verde',
  saleUnit: 'CX',
  packFactor: 12,
  multipleOnly: true,
  active: true,
}

/** P014 Suco de Uva Integral 1L — ativo no seed; usado sem preço na fixture. */
const productP014: Product = {
  id: 'P014',
  sku: 'SKU-1013',
  ean: '7891139993157',
  description: 'Suco de Uva Integral 1L',
  category: 'bebidas',
  brand: 'Vinhedo',
  saleUnit: 'UN',
  packFactor: 1,
  multipleOnly: false,
  active: true,
}

/** P021 Refrigerante Laranja 2L (descontinuado) — inativo; ausente na TP03 (seed). */
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

/** P022 Biscoito Recheado Chocolate 140g — inativo (seed). */
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

const catalog = [
  productP001,
  productP003,
  productP004,
  productP006,
  productP010,
  productP014,
  productP021,
  productP022,
]

/** Preços reais do seed, em centavos. P014 omitido de propósito em alguns casos. */
const seedPriceItems: PriceItem[] = [
  { productId: 'P001', priceTableId: 'TP01', unitPrice: toCents(26.9) },
  { productId: 'P003', priceTableId: 'TP01', unitPrice: toCents(4.79) },
  { productId: 'P003', priceTableId: 'TP03', unitPrice: toCents(5.13) },
  { productId: 'P004', priceTableId: 'TP01', unitPrice: toCents(7.19) },
  { productId: 'P006', priceTableId: 'TP01', unitPrice: toCents(3.33) },
  { productId: 'P010', priceTableId: 'TP01', unitPrice: toCents(4.99) },
  { productId: 'P014', priceTableId: 'TP01', unitPrice: toCents(12.49) },
  { productId: 'P021', priceTableId: 'TP01', unitPrice: toCents(7.99) },
  { productId: 'P022', priceTableId: 'TP01', unitPrice: toCents(2.69) },
]

const tp01 = { tableId: 'TP01', items: seedPriceItems }
const tp03 = { tableId: 'TP03', items: seedPriceItems }

/** PH001 (C001) — preços/descontos históricos diferentes dos atuais. */
const historyPH001: HistoryOrder = {
  id: 'PH001',
  items: [
    { productId: 'P001', quantityUnits: 10 },
    { productId: 'P006', quantityUnits: 40 },
    { productId: 'P010', quantityUnits: 24 },
    { productId: 'P022', quantityUnits: 30 },
  ],
}

/** PH004 Cancelado (C006 / TP03). */
const historyPH004: HistoryOrder = {
  id: 'PH004',
  items: [{ productId: 'P003', quantityUnits: 20 }],
}

/** PH003 (C005) — contém P021 inativo. */
const historyPH003: HistoryOrder = {
  id: 'PH003',
  items: [
    { productId: 'P013', quantityUnits: 48 },
    { productId: 'P021', quantityUnits: 12 },
    { productId: 'P012', quantityUnits: 24 },
  ],
}

describe('buildRepeatDraft', () => {
  it('PH001 (C001/TP01): remove P022 inativo; P001 a 2690; P006 com 0%', () => {
    const draft = buildRepeatDraft(historyPH001, catalog, tp01)

    expect(draft.removed).toEqual([{ productId: 'P022', reason: 'Produto inativo' }])
    expect(draft.lines.map((line) => line.productId)).toEqual(['P001', 'P006', 'P010'])

    expect(draft.lines[0]).toEqual({
      productId: 'P001',
      quantityUnits: 10,
      unitPrice: 2690,
      discountPercent: 0,
      lots: 10,
    })
    expect(draft.lines[0]?.unitPrice).not.toBe(toCents(25.9))

    expect(draft.lines[1]).toEqual({
      productId: 'P006',
      quantityUnits: 40,
      unitPrice: toCents(3.33),
      discountPercent: 0,
      lots: 2,
    })

    expect(draft.lines[2]).toEqual({
      productId: 'P010',
      quantityUnits: 24,
      unitPrice: toCents(4.99),
      discountPercent: 0,
      lots: 2,
    })

    expect(draft.notices).toEqual([])
  })

  it('PH004 Cancelado (C006/TP03) monta rascunho com preço atual e desconto 0%', () => {
    const draft = buildRepeatDraft(historyPH004, catalog, tp03)

    expect(draft.removed).toEqual([])
    expect(draft.notices).toEqual([])
    expect(draft.lines).toEqual([
      {
        productId: 'P003',
        quantityUnits: 20,
        unitPrice: toCents(5.13),
        discountPercent: 0,
        lots: 2,
      },
    ])
  })

  it('produto só-múltiplo com 30 un e fator atual 12 → 3 lotes / 36 un + PACK_FACTOR_CHANGED', () => {
    const altered = { ...productP006, packFactor: 12 }
    const history: HistoryOrder = {
      id: 'PH-FIX-MULTIPLO',
      items: [{ productId: 'P006', quantityUnits: 30 }],
    }

    const draft = buildRepeatDraft(history, [altered], tp01)

    expect(draft.removed).toEqual([])
    expect(draft.lines).toEqual([
      {
        productId: 'P006',
        quantityUnits: 36,
        unitPrice: toCents(3.33),
        discountPercent: 0,
        lots: 3,
      },
    ])
    expect(draft.notices).toEqual([
      {
        code: 'PACK_FACTOR_CHANGED',
        productId: 'P006',
        newFactor: 12,
        lots: 3,
        units: 36,
        message:
          'A quantidade de unidades por lote mudou para 12; a quantidade foi ajustada para 3 lote(s) (36 unidades)',
      },
    ])
  })

  it('P004 (não só-múltiplo) com fator alterado e 7 un → 7 un, Lote vazio + aviso', () => {
    const altered = { ...productP004, packFactor: 12 }
    const history: HistoryOrder = {
      id: 'PH-FIX-P004',
      items: [{ productId: 'P004', quantityUnits: 7 }],
    }

    const draft = buildRepeatDraft(history, [altered], tp01)

    expect(draft.lines).toEqual([
      {
        productId: 'P004',
        quantityUnits: 7,
        unitPrice: toCents(7.19),
        discountPercent: 0,
        lots: null,
      },
    ])
    expect(lotsFromUnits(7, 12)).toBeNull()
    expect(draft.notices).toEqual([
      {
        code: 'LOT_NOT_EXACT',
        productId: 'P004',
        newFactor: 12,
        lots: null,
        units: 7,
        message:
          'As unidades do histórico não fecham um lote com o fator atual (12); o campo Lote ficou vazio.',
      },
    ])
  })

  it('P004 com fator atual do seed (20) e 7 un também fica com Lote vazio + aviso', () => {
    const history: HistoryOrder = {
      id: 'PH-P004-7',
      items: [{ productId: 'P004', quantityUnits: 7 }],
    }

    const draft = buildRepeatDraft(history, catalog, tp01)

    expect(draft.lines[0]).toMatchObject({
      productId: 'P004',
      quantityUnits: 7,
      lots: null,
      discountPercent: 0,
    })
    expect(draft.notices[0]).toMatchObject({
      code: 'LOT_NOT_EXACT',
      productId: 'P004',
      newFactor: 20,
      lots: null,
      units: 7,
    })
  })

  it('P004 com 20 un fecha 1 lote e não emite aviso', () => {
    const history: HistoryOrder = {
      id: 'PH-P004-20',
      items: [{ productId: 'P004', quantityUnits: 20 }],
    }

    const draft = buildRepeatDraft(history, catalog, tp01)

    expect(draft.lines[0]).toMatchObject({ productId: 'P004', quantityUnits: 20, lots: 1 })
    expect(draft.notices).toEqual([])
  })

  it('PH003 remove P021 inativo e produtos ausentes do catálogo passado', () => {
    const draft = buildRepeatDraft(historyPH003, catalog, tp01)

    expect(draft.removed).toEqual([
      { productId: 'P013', reason: 'Produto não encontrado no catálogo' },
      { productId: 'P021', reason: 'Produto inativo' },
      { productId: 'P012', reason: 'Produto não encontrado no catálogo' },
    ])
    expect(draft.lines).toEqual([])
  })

  it('produto ativo sem preço na tabela é removido com motivo', () => {
    const history: HistoryOrder = {
      id: 'PH-NO-PRICE',
      items: [{ productId: 'P014', quantityUnits: 3 }],
    }
    const tableWithoutP014 = {
      tableId: 'TP01',
      items: seedPriceItems.filter((item) => item.productId !== 'P014'),
    }

    const draft = buildRepeatDraft(history, catalog, tableWithoutP014)

    expect(draft.removed).toEqual([{ productId: 'P014', reason: 'Produto sem preço na tabela' }])
    expect(draft.lines).toEqual([])
  })

  it('preço 0 é válido e permanece no rascunho (A27)', () => {
    const history: HistoryOrder = {
      id: 'PH-ZERO',
      items: [{ productId: 'P001', quantityUnits: 2 }],
    }
    const table = {
      tableId: 'TP01',
      items: [{ productId: 'P001', priceTableId: 'TP01', unitPrice: 0 }],
    }

    const draft = buildRepeatDraft(history, [productP001], table)

    expect(draft.removed).toEqual([])
    expect(draft.lines[0]).toMatchObject({
      productId: 'P001',
      quantityUnits: 2,
      unitPrice: 0,
      discountPercent: 0,
    })
  })

  it('pedido histórico sem itens devolve rascunho vazio', () => {
    const draft = buildRepeatDraft({ id: 'PH-EMPTY', items: [] }, catalog, tp01)
    expect(draft).toEqual({ lines: [], removed: [], notices: [] })
  })

  it('só-múltiplo cujo histórico ainda fecha o fator atual não emite aviso', () => {
    const history: HistoryOrder = {
      id: 'PH-P010',
      items: [{ productId: 'P010', quantityUnits: 24 }],
    }

    const draft = buildRepeatDraft(history, catalog, tp01)

    expect(draft.lines[0]).toMatchObject({ productId: 'P010', quantityUnits: 24, lots: 2 })
    expect(draft.notices).toEqual([])
  })
})

describe('salvaguarda do seed (RN12)', () => {
  it('o histórico do seed fecha todos os lotes com o fator atual do catálogo', () => {
    const productsById = new Map(seed.produtos.map((product) => [product.id, product]))

    for (const order of seed.pedidos_historico) {
      for (const item of order.itens) {
        const product = productsById.get(item.produto_id)
        expect(product, `${order.id}/${item.produto_id} no catálogo`).toBeDefined()
        if (product === undefined) {
          continue
        }
        expect(
          lotsFromUnits(item.quantidade, product.fator_embalagem),
          `${order.id}/${item.produto_id} ${item.quantidade} un / fator ${product.fator_embalagem}`,
        ).not.toBeNull()
      }
    }
  })
})
