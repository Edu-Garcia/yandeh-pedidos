import { describe, expect, it } from 'vitest'
import {
  hasLotField,
  isUnitsReadOnly,
  isValidQuantity,
  lotsFromUnits,
  unitsFromLots,
} from './packaging'
import type { Product } from './types'

/** P001 Arroz Branco Tipo 1 5kg — UN fator 1, venda unitária (seed). */
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

/** P006 Macarrão Espaguete 500g — FD 20, somente múltiplo (seed). */
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

/** P010 Leite UHT Integral 1L — CX 12, somente múltiplo (seed). */
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

describe('unitsFromLots', () => {
  it('P006 (FD 20): 2 lotes = 40 unidades', () => {
    expect(unitsFromLots(2, productP006.packFactor)).toBe(40)
  })

  it('P010 (CX 12): 2 lotes = 24 unidades', () => {
    expect(unitsFromLots(2, productP010.packFactor)).toBe(24)
  })

  it('P001 (UN fator 1): 5 lotes = 5 unidades', () => {
    expect(unitsFromLots(5, productP001.packFactor)).toBe(5)
  })
})

describe('lotsFromUnits', () => {
  it('P006: 40 un fecha 2 lotes', () => {
    expect(lotsFromUnits(40, productP006.packFactor)).toBe(2)
  })

  it('P004 (CX 20, não só múltiplo): 7 un não fecha lote', () => {
    expect(lotsFromUnits(7, productP004.packFactor)).toBeNull()
  })

  it('P004: 20 un fecha 1 lote', () => {
    expect(lotsFromUnits(20, productP004.packFactor)).toBe(1)
  })

  it('P010: 24 un fecha 2 lotes; 6 un não fecha', () => {
    expect(lotsFromUnits(24, productP010.packFactor)).toBe(2)
    expect(lotsFromUnits(6, productP010.packFactor)).toBeNull()
  })

  it('P001 (fator 1): qualquer inteiro fecha lote 1:1', () => {
    expect(lotsFromUnits(1, productP001.packFactor)).toBe(1)
    expect(lotsFromUnits(7, productP001.packFactor)).toBe(7)
  })

  it('unidades não inteiras não fecham lote', () => {
    expect(lotsFromUnits(20.5, productP004.packFactor)).toBeNull()
    expect(lotsFromUnits(1.5, productP001.packFactor)).toBeNull()
  })
})

describe('hasLotField', () => {
  it('P001 (UN fator 1) não mostra campo Lote', () => {
    expect(hasLotField(productP001)).toBe(false)
  })

  it('P004 (CX 20) e P006 (FD 20) mostram campo Lote', () => {
    expect(hasLotField(productP004)).toBe(true)
    expect(hasLotField(productP006)).toBe(true)
  })

  it('P010 (CX 12) mostra campo Lote', () => {
    expect(hasLotField(productP010)).toBe(true)
  })
})

describe('isUnitsReadOnly', () => {
  it('P006 (venda_somente_multiplo) deixa Unidades somente leitura', () => {
    expect(isUnitsReadOnly(productP006)).toBe(true)
  })

  it('P010 (venda_somente_multiplo) deixa Unidades somente leitura', () => {
    expect(isUnitsReadOnly(productP010)).toBe(true)
  })

  it('P004 e P001 (venda unitária) deixam Unidades editável', () => {
    expect(isUnitsReadOnly(productP004)).toBe(false)
    expect(isUnitsReadOnly(productP001)).toBe(false)
  })
})

describe('isValidQuantity', () => {
  it('P006 (FD 20, somente múltiplo) aceita 40 e rejeita 30', () => {
    expect(isValidQuantity(productP006, 40)).toBe(true)
    expect(isValidQuantity(productP006, 30)).toBe(false)
  })

  it('P004 (CX 20, venda unitária permitida) aceita 7', () => {
    expect(isValidQuantity(productP004, 7)).toBe(true)
  })

  it('P004 aceita 20 (fecha lote) e 1 (unitária)', () => {
    expect(isValidQuantity(productP004, 20)).toBe(true)
    expect(isValidQuantity(productP004, 1)).toBe(true)
  })

  it('P010 (CX 12, somente múltiplo) aceita 24 e rejeita 6', () => {
    expect(isValidQuantity(productP010, 24)).toBe(true)
    expect(isValidQuantity(productP010, 12)).toBe(true)
    expect(isValidQuantity(productP010, 6)).toBe(false)
  })

  it('P001 (UN fator 1) aceita qualquer inteiro ≥ 1', () => {
    expect(isValidQuantity(productP001, 1)).toBe(true)
    expect(isValidQuantity(productP001, 7)).toBe(true)
  })

  it('rejeita 0, negativos e não inteiros', () => {
    expect(isValidQuantity(productP001, 0)).toBe(false)
    expect(isValidQuantity(productP006, 0)).toBe(false)
    expect(isValidQuantity(productP004, -1)).toBe(false)
    expect(isValidQuantity(productP010, 1.5)).toBe(false)
    expect(isValidQuantity(productP001, 1.5)).toBe(false)
    expect(isValidQuantity(productP006, Number.NaN)).toBe(false)
    expect(isValidQuantity(productP006, Number.POSITIVE_INFINITY)).toBe(false)
  })
})
