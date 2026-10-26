import type { CustomerProduct } from '@yandeh/shared'
import { formatBRL, lineTotals, orderTotals } from '@yandeh/shared'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DISCOUNT_ERROR,
  QUANTITY_ERROR,
  buildLineView,
  defaultUnits,
  useOrderDraftStore,
} from './order-draft'

const p001: CustomerProduct = {
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
}

const p004: CustomerProduct = {
  id: 'P004',
  sku: 'SKU-1003',
  ean: '7891469138105',
  description: 'Óleo de Soja 900ml',
  category: 'mercearia',
  brand: 'Soyara',
  saleUnit: 'CX',
  packFactor: 20,
  multipleOnly: false,
  unitPrice: 719,
}

const p006: CustomerProduct = {
  id: 'P006',
  sku: 'SKU-1005',
  ean: '7891399588384',
  description: 'Macarrão Espaguete 500g',
  category: 'mercearia',
  brand: 'Massa Boa',
  saleUnit: 'FD',
  packFactor: 20,
  multipleOnly: true,
  unitPrice: 333,
}

const p010: CustomerProduct = {
  id: 'P010',
  sku: 'SKU-1009',
  ean: '7891216687320',
  description: 'Leite UHT Integral 1L',
  category: 'bebidas',
  brand: 'Vale Verde',
  saleUnit: 'CX',
  packFactor: 12,
  multipleOnly: true,
  unitPrice: 499,
}

describe('order draft store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('guarda o rascunho em unidades e isolado por cliente', () => {
    const draft = useOrderDraftStore()
    draft.addProduct('C001', p006)
    draft.addProduct('C002', p004)

    expect(draft.linesOf('C001')).toHaveLength(1)
    expect(draft.linesOf('C001')[0]?.product.id).toBe('P006')
    expect(draft.linesOf('C001')[0]?.quantityUnits).toBe(20)
    expect(draft.linesOf('C002')[0]?.product.id).toBe('P004')
    expect(draft.linesOf('C003')).toEqual([])
  })

  it('não duplica o mesmo produto no cliente', () => {
    const draft = useOrderDraftStore()
    draft.addProduct('C001', p006)
    draft.setLots('C001', 'P006', '2')
    draft.addProduct('C001', p006)

    expect(draft.linesOf('C001')).toHaveLength(1)
    expect(draft.linesOf('C001')[0]?.quantityUnits).toBe(40)
  })

  it('não persiste o rascunho (T-26)', () => {
    const draft = useOrderDraftStore()
    draft.addProduct('C001', p006)
    expect(localStorage.length).toBe(0)
  })

  it('P006 (FD 20, só múltiplo): Lote 2 FD → 40 un e Unidades somente leitura', () => {
    const draft = useOrderDraftStore()
    draft.addProduct('C001', p006)
    expect(defaultUnits(p006)).toBe(20)

    draft.setLots('C001', 'P006', '2')
    const line = draft.linesOf('C001')[0]
    if (!line) throw new Error('linha P006 ausente')
    const view = draft.viewOf(line)

    expect(line.quantityUnits).toBe(40)
    expect(view.unitsText).toBe('40')
    expect(view.lotsText).toBe('2')
    expect(view.lotLabel).toBe('FD')
    expect(view.hasLot).toBe(true)
    expect(view.unitsReadOnly).toBe(true)
    expect(view.quantityError).toBeNull()

    draft.setUnits('C001', 'P006', '30')
    expect(draft.linesOf('C001')[0]?.quantityUnits).toBe(40)
  })

  it('P004 (CX 20, não só múltiplo): 7 un → Lote vazio; 20 un → 1 CX; Lote 2 → 40 un', () => {
    const draft = useOrderDraftStore()
    draft.addProduct('C001', p004)
    expect(draft.linesOf('C001')[0]?.quantityUnits).toBe(1)
    expect(draft.viewOf(draft.linesOf('C001')[0]!).lotsText).toBe('')
    expect(draft.viewOf(draft.linesOf('C001')[0]!).unitsReadOnly).toBe(false)
    expect(draft.viewOf(draft.linesOf('C001')[0]!).lotLabel).toBe('CX')

    draft.setUnits('C001', 'P004', '7')
    expect(draft.linesOf('C001')[0]?.quantityUnits).toBe(7)
    expect(draft.viewOf(draft.linesOf('C001')[0]!).lotsText).toBe('')

    draft.setUnits('C001', 'P004', '20')
    expect(draft.linesOf('C001')[0]?.quantityUnits).toBe(20)
    expect(draft.viewOf(draft.linesOf('C001')[0]!).lotsText).toBe('1')

    draft.setLots('C001', 'P004', '2')
    expect(draft.linesOf('C001')[0]?.quantityUnits).toBe(40)
    expect(draft.viewOf(draft.linesOf('C001')[0]!).lotsText).toBe('2')
    expect(draft.viewOf(draft.linesOf('C001')[0]!).unitsText).toBe('40')
  })

  it('P010 (CX 12, só múltiplo): Lote 2 → 24 un e Unidades somente leitura', () => {
    const draft = useOrderDraftStore()
    draft.addProduct('C001', p010)
    draft.setLots('C001', 'P010', '2')

    const line = draft.linesOf('C001')[0]
    if (!line) throw new Error('linha P010 ausente')
    const view = draft.viewOf(line)

    expect(line.quantityUnits).toBe(24)
    expect(view.unitsText).toBe('24')
    expect(view.lotsText).toBe('2')
    expect(view.lotLabel).toBe('CX')
    expect(view.unitsReadOnly).toBe(true)
    expect(view.quantityError).toBeNull()
  })

  it('P001 (UN fator 1) só tem Unidades; setLots é ignorado', () => {
    const draft = useOrderDraftStore()
    draft.addProduct('C001', p001)
    const view = draft.viewOf(draft.linesOf('C001')[0]!)

    expect(view.hasLot).toBe(false)
    expect(view.unitsReadOnly).toBe(false)
    expect(draft.linesOf('C001')[0]?.quantityUnits).toBe(1)

    draft.setLots('C001', 'P001', '5')
    expect(draft.linesOf('C001')[0]?.quantityUnits).toBe(1)

    draft.setUnits('C001', 'P001', '10')
    expect(draft.linesOf('C001')[0]?.quantityUnits).toBe(10)
    expect(draft.viewOf(draft.linesOf('C001')[0]!).hasLot).toBe(false)
  })

  it('aceita desconto de 0 a 100 e marca erro fora da faixa', () => {
    const draft = useOrderDraftStore()
    draft.addProduct('C001', p001)

    draft.setDiscount('C001', 'P001', '0')
    expect(draft.viewOf(draft.linesOf('C001')[0]!).discountError).toBeNull()

    draft.setDiscount('C001', 'P001', '100')
    expect(draft.linesOf('C001')[0]?.discountPercent).toBe(100)
    expect(draft.viewOf(draft.linesOf('C001')[0]!).discountError).toBeNull()

    draft.setDiscount('C001', 'P001', '2,5')
    expect(draft.linesOf('C001')[0]?.discountPercent).toBe(2.5)
    expect(draft.viewOf(draft.linesOf('C001')[0]!).discountError).toBeNull()

    draft.setDiscount('C001', 'P001', '-1')
    expect(draft.viewOf(draft.linesOf('C001')[0]!).discountError).toBe(DISCOUNT_ERROR)

    draft.setDiscount('C001', 'P001', '101')
    expect(draft.viewOf(draft.linesOf('C001')[0]!).discountError).toBe(DISCOUNT_ERROR)
  })

  it('mostra erro inline de quantidade inválida', () => {
    const draft = useOrderDraftStore()
    draft.addProduct('C001', p004)
    draft.setUnits('C001', 'P004', '')
    expect(draft.viewOf(draft.linesOf('C001')[0]!).quantityError).toBe(QUANTITY_ERROR)

    draft.setUnits('C001', 'P004', '1.5')
    expect(draft.viewOf(draft.linesOf('C001')[0]!).quantityError).toBe(QUANTITY_ERROR)

    draft.setUnits('C001', 'P004', '7')
    expect(draft.viewOf(draft.linesOf('C001')[0]!).quantityError).toBeNull()

    draft.addProduct('C001', p006)
    draft.setLots('C001', 'P006', '0')
    expect(draft.viewOf(draft.linesOf('C001')[1]!).quantityError).toBe(QUANTITY_ERROR)
  })

  it('remover item atualiza os totais via orderTotals', () => {
    const draft = useOrderDraftStore()
    draft.addProduct('C001', p006)
    draft.setLots('C001', 'P006', '2')
    draft.addProduct('C001', p004)
    draft.setUnits('C001', 'P004', '7')

    const p006Totals = lineTotals({
      productId: 'P006',
      quantityUnits: 40,
      unitPrice: 333,
      discountPercent: 0,
    })
    const p004Totals = lineTotals({
      productId: 'P004',
      quantityUnits: 7,
      unitPrice: 719,
      discountPercent: 0,
    })
    const both = orderTotals([
      { productId: 'P006', quantityUnits: 40, unitPrice: 333, discountPercent: 0 },
      { productId: 'P004', quantityUnits: 7, unitPrice: 719, discountPercent: 0 },
    ])

    expect(draft.viewOf(draft.linesOf('C001')[0]!).totals).toEqual(p006Totals)
    expect(draft.draftTotals('C001')).toEqual(both)
    expect(draft.draftTotals('C001').net).toBe(p006Totals.net + p004Totals.net)

    draft.removeLine('C001', 'P004')
    expect(draft.linesOf('C001')).toHaveLength(1)
    expect(draft.draftTotals('C001')).toEqual(
      orderTotals([{ productId: 'P006', quantityUnits: 40, unitPrice: 333, discountPercent: 0 }]),
    )
    expect(formatBRL(draft.draftTotals('C001').net)).toBe(formatBRL(p006Totals.net))
  })

  it('buildLineView não inclui id do produto nos textos de campo', () => {
    const view = buildLineView({ product: p006, quantityUnits: 40, discountPercent: 2 })
    expect(view.unitsText).toBe('40')
    expect(view.lotsText).toBe('2')
    expect(JSON.stringify(view)).not.toContain('P006')
  })
})
