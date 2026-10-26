import { describe, expect, it } from 'vitest'
import { toCents } from './money.js'
import { unitPriceFor } from './price.js'
import { MINIMUM_ORDER_CENTS } from './rules.js'
import { isSellable } from './sellable.js'
import type { PriceItem, Product, ValidationIssue } from './types.js'
import { validateOrder, type ValidateOrderLine } from './validate.js'

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

const catalog = [productP001, productP006, productP010, productP021, productP022]

/** Preços reais do seed, em centavos. P021 não existe na TP03. */
const seedPriceItems: PriceItem[] = [
  { productId: 'P001', priceTableId: 'TP01', unitPrice: toCents(26.9) },
  { productId: 'P001', priceTableId: 'TP02', unitPrice: toCents(25.29) },
  { productId: 'P006', priceTableId: 'TP01', unitPrice: toCents(3.33) },
  { productId: 'P010', priceTableId: 'TP01', unitPrice: toCents(4.99) },
  { productId: 'P021', priceTableId: 'TP01', unitPrice: toCents(7.99) },
  { productId: 'P022', priceTableId: 'TP01', unitPrice: toCents(2.69) },
]

function line(
  productId: string,
  quantityUnits: number,
  unitPrice: number | null,
  discountPercent: number,
): ValidateOrderLine {
  return { productId, quantityUnits, unitPrice, discountPercent }
}

/** Exemplo C001 / TP01 do PRD §6 (preços atuais da tabela). */
const c001Example = [
  line('P001', 10, toCents(26.9), 0),
  line('P006', 40, toCents(3.33), 2),
  line('P010', 24, toCents(4.99), 0),
]

const C001_CREDIT = 380000
const C002_CREDIT = 35000

function codes(issues: ValidationIssue[]): ValidationIssue['code'][] {
  return issues.map((issue) => issue.code)
}

describe('validateOrder', () => {
  it('líquido 29999 → BELOW_MINIMUM', () => {
    const issues = validateOrder({
      lines: [line('P001', 1, 29999, 0)],
      products: catalog,
      availableCredit: C001_CREDIT,
    })
    expect(codes(issues)).toEqual(['BELOW_MINIMUM'])
    expect(issues[0]).toMatchObject({
      code: 'BELOW_MINIMUM',
      message: 'Total líquido abaixo de R$ 300,00',
      minimum: MINIMUM_ORDER_CENTS,
      net: 29999,
    })
  })

  it('líquido 30000 → sem bloqueios', () => {
    expect(
      validateOrder({
        lines: [line('P001', 1, 30000, 0)],
        products: catalog,
        availableCredit: C001_CREDIT,
      }),
    ).toEqual([])
  })

  it('C002 (crédito 35000) com pedido de R$ 400 → INSUFFICIENT_CREDIT', () => {
    const issues = validateOrder({
      lines: [line('P001', 1, 40000, 0)],
      products: catalog,
      availableCredit: C002_CREDIT,
    })
    expect(codes(issues)).toEqual(['INSUFFICIENT_CREDIT'])
    expect(issues[0]).toMatchObject({
      code: 'INSUFFICIENT_CREDIT',
      message: 'Total líquido acima do crédito disponível',
      available: C002_CREDIT,
      net: 40000,
    })
  })

  it('C010 (crédito 0) com pedido de R$ 300 → INSUFFICIENT_CREDIT', () => {
    const issues = validateOrder({
      lines: [line('P001', 1, 30000, 0)],
      products: catalog,
      availableCredit: 0,
    })
    expect(codes(issues)).toEqual(['INSUFFICIENT_CREDIT'])
    expect(issues[0]).toMatchObject({
      code: 'INSUFFICIENT_CREDIT',
      available: 0,
      net: 30000,
    })
  })

  it('P006 com 30 un (FD 20, somente múltiplo) → INVALID_QUANTITY', () => {
    const issues = validateOrder({
      lines: [line('P001', 1, 30000, 0), line('P006', 30, toCents(3.33), 0)],
      products: catalog,
      availableCredit: C001_CREDIT,
    })
    expect(codes(issues)).toEqual(['INVALID_QUANTITY'])
    expect(issues[0]).toMatchObject({
      code: 'INVALID_QUANTITY',
      message: 'Quantidade não inteira, < 1 ou fora do múltiplo da embalagem',
      productId: 'P006',
    })
  })

  it('exemplo C001 (P001/P006/P010 10/40/24, líquido 51930, crédito 380000) → []', () => {
    expect(
      validateOrder({
        lines: c001Example,
        products: catalog,
        availableCredit: C001_CREDIT,
      }),
    ).toEqual([])
  })

  it('bruto 30500 com desconto que deixa líquido < 30000 → BELOW_MINIMUM', () => {
    // 30500 × 2% = 610; líquido 29890
    const issues = validateOrder({
      lines: [line('P001', 1, 30500, 2)],
      products: catalog,
      availableCredit: C001_CREDIT,
    })
    expect(codes(issues)).toEqual(['BELOW_MINIMUM'])
    expect(issues[0]).toMatchObject({ code: 'BELOW_MINIMUM', minimum: 30000, net: 29890 })
  })

  it('pedido sem itens → só EMPTY_ORDER (não empilha mínimo/crédito)', () => {
    const issues = validateOrder({
      lines: [],
      products: catalog,
      availableCredit: C001_CREDIT,
    })
    expect(issues).toEqual([{ code: 'EMPTY_ORDER', message: 'Pedido sem itens' }])
  })

  it('desconto −1 → INVALID_DISCOUNT', () => {
    const issues = validateOrder({
      lines: [line('P001', 1, 30000, -1)],
      products: catalog,
      availableCredit: C001_CREDIT,
    })
    expect(codes(issues)).toEqual(['INVALID_DISCOUNT'])
    expect(issues[0]).toMatchObject({
      code: 'INVALID_DISCOUNT',
      message: 'Desconto fora de 0–100%',
      productId: 'P001',
    })
  })

  it('desconto 101 → INVALID_DISCOUNT', () => {
    const issues = validateOrder({
      lines: [line('P001', 1, 30000, 101)],
      products: catalog,
      availableCredit: C001_CREDIT,
    })
    expect(codes(issues)).toContain('INVALID_DISCOUNT')
    expect(issues.find((issue) => issue.code === 'INVALID_DISCOUNT')).toMatchObject({
      productId: 'P001',
    })
  })

  it('P021 inativo (seed) → PRODUCT_NOT_SELLABLE', () => {
    const price = unitPriceFor(productP021, 'TP01', seedPriceItems)
    expect(price).toBe(toCents(7.99))
    expect(isSellable(productP021, price)).toBe(false)

    const issues = validateOrder({
      lines: [line('P001', 1, 30000, 0), line('P021', 6, price, 0)],
      products: catalog,
      availableCredit: C001_CREDIT,
    })
    expect(codes(issues)).toEqual(['PRODUCT_NOT_SELLABLE'])
    expect(issues[0]).toMatchObject({
      code: 'PRODUCT_NOT_SELLABLE',
      message: 'Produto inativo ou sem preço na tabela efetiva',
      productId: 'P021',
    })
  })

  it('P022 inativo (seed) → PRODUCT_NOT_SELLABLE', () => {
    const price = unitPriceFor(productP022, 'TP01', seedPriceItems)
    expect(isSellable(productP022, price)).toBe(false)

    const issues = validateOrder({
      lines: [line('P001', 1, 30000, 0), line('P022', 1, price, 0)],
      products: catalog,
      availableCredit: C001_CREDIT,
    })
    expect(codes(issues)).toEqual(['PRODUCT_NOT_SELLABLE'])
    expect(issues[0]).toMatchObject({ code: 'PRODUCT_NOT_SELLABLE', productId: 'P022' })
  })

  it('P021 sem preço na TP03 (seed) → PRODUCT_NOT_SELLABLE', () => {
    const price = unitPriceFor(productP021, 'TP03', seedPriceItems)
    expect(price).toBeNull()
    expect(isSellable(productP021, price)).toBe(false)

    const issues = validateOrder({
      lines: [line('P001', 1, 30000, 0), line('P021', 6, price, 0)],
      products: catalog,
      availableCredit: C001_CREDIT,
    })
    expect(codes(issues)).toEqual(['PRODUCT_NOT_SELLABLE'])
    expect(issues[0]).toMatchObject({ code: 'PRODUCT_NOT_SELLABLE', productId: 'P021' })
  })

  it('alçada (P001 a 6% no exemplo C001) não é bloqueio', () => {
    const lines = [
      line('P001', 10, toCents(26.9), 6),
      line('P006', 40, toCents(3.33), 2),
      line('P010', 24, toCents(4.99), 0),
    ]
    expect(
      validateOrder({
        lines,
        products: catalog,
        availableCredit: C001_CREDIT,
      }),
    ).toEqual([])
  })

  it('crédito disponível negativo bloqueia quando o líquido é maior', () => {
    const issues = validateOrder({
      lines: [line('P001', 1, 30000, 0)],
      products: catalog,
      availableCredit: -100,
    })
    expect(codes(issues)).toEqual(['INSUFFICIENT_CREDIT'])
    expect(issues[0]).toMatchObject({ available: -100, net: 30000 })
  })

  it('líquido igual ao crédito disponível não bloqueia (RN09: > estrito)', () => {
    expect(
      validateOrder({
        lines: [line('P001', 1, 30000, 0)],
        products: catalog,
        availableCredit: 30000,
      }),
    ).toEqual([])
  })
})
