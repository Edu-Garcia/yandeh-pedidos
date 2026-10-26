import {
  hasLotField,
  isUnitsReadOnly,
  isValidQuantity,
  lineTotals,
  lotsFromUnits,
  orderTotals,
  unitsFromLots,
  type CustomerProduct,
  type OrderLineInput,
  type OrderLineTotals,
  type OrderTotals,
  type SaleUnit,
} from '@yandeh/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Mensagens iguais ao PRD §8, usadas no erro inline da T-20 (sem `validateOrder`). */
export const QUANTITY_ERROR = 'Quantidade não inteira, < 1 ou fora do múltiplo da embalagem'
export const DISCOUNT_ERROR = 'Desconto fora de 0–100%'

export interface DraftLine {
  product: CustomerProduct
  quantityUnits: number
  discountPercent: number
}

export interface DraftLineView {
  unitsText: string
  lotsText: string
  discountText: string
  hasLot: boolean
  unitsReadOnly: boolean
  lotLabel: SaleUnit
  quantityError: string | null
  discountError: string | null
  totals: OrderLineTotals | null
}

function parseDecimalInput(raw: string): number {
  const trimmed = raw.trim().replace(',', '.')
  if (trimmed === '') return 0
  return Number(trimmed)
}

export function quantityFieldText(value: number): string {
  if (!Number.isFinite(value) || value === 0) return ''
  return String(value)
}

export function discountFieldText(value: number): string {
  if (!Number.isFinite(value)) return ''
  return String(value)
}

export function isDiscountInRange(discountPercent: number): boolean {
  return Number.isFinite(discountPercent) && discountPercent >= 0 && discountPercent <= 100
}

export function defaultUnits(
  product: Pick<CustomerProduct, 'multipleOnly' | 'packFactor'>,
): number {
  return product.multipleOnly ? product.packFactor : 1
}

export function toPricedLine(line: DraftLine): OrderLineInput | null {
  if (
    !isValidQuantity(line.product, line.quantityUnits) ||
    !isDiscountInRange(line.discountPercent)
  ) {
    return null
  }
  return {
    productId: line.product.id,
    quantityUnits: line.quantityUnits,
    unitPrice: line.product.unitPrice,
    discountPercent: line.discountPercent,
  }
}

export function buildLineView(line: DraftLine): DraftLineView {
  const quantityOk = isValidQuantity(line.product, line.quantityUnits)
  const discountOk = isDiscountInRange(line.discountPercent)
  const priced = toPricedLine(line)
  const lots = lotsFromUnits(line.quantityUnits, line.product.packFactor)

  return {
    unitsText: quantityFieldText(line.quantityUnits),
    lotsText: lots === null || lots === 0 ? '' : String(lots),
    discountText: discountFieldText(line.discountPercent),
    hasLot: hasLotField(line.product),
    unitsReadOnly: isUnitsReadOnly(line.product),
    lotLabel: line.product.saleUnit,
    quantityError: quantityOk ? null : QUANTITY_ERROR,
    discountError: discountOk ? null : DISCOUNT_ERROR,
    totals: priced ? lineTotals(priced) : null,
  }
}

/** Rascunho do pedido em unidades, por cliente (RN05, D9). Sem persistência — isso é T-26. */
export const useOrderDraftStore = defineStore('orderDraft', () => {
  const linesByCustomer = ref<Record<string, DraftLine[]>>({})

  function linesOf(customerId: string): DraftLine[] {
    return linesByCustomer.value[customerId] ?? []
  }

  function hasProduct(customerId: string, productId: string): boolean {
    return linesOf(customerId).some((line) => line.product.id === productId)
  }

  function replaceCustomerLines(customerId: string, lines: DraftLine[]): void {
    linesByCustomer.value = { ...linesByCustomer.value, [customerId]: lines }
  }

  function updateLine(
    customerId: string,
    productId: string,
    patch: (line: DraftLine) => DraftLine,
  ): void {
    replaceCustomerLines(
      customerId,
      linesOf(customerId).map((line) => (line.product.id === productId ? patch(line) : line)),
    )
  }

  function addProduct(customerId: string, product: CustomerProduct): void {
    if (hasProduct(customerId, product.id)) return
    replaceCustomerLines(customerId, [
      ...linesOf(customerId),
      { product, quantityUnits: defaultUnits(product), discountPercent: 0 },
    ])
  }

  function setUnits(customerId: string, productId: string, raw: string): void {
    updateLine(customerId, productId, (line) => {
      if (isUnitsReadOnly(line.product)) return line
      return { ...line, quantityUnits: parseDecimalInput(raw) }
    })
  }

  function setLots(customerId: string, productId: string, raw: string): void {
    updateLine(customerId, productId, (line) => {
      if (!hasLotField(line.product)) return line
      const lots = parseDecimalInput(raw)
      return { ...line, quantityUnits: unitsFromLots(lots, line.product.packFactor) }
    })
  }

  function setDiscount(customerId: string, productId: string, raw: string): void {
    updateLine(customerId, productId, (line) => ({
      ...line,
      discountPercent: parseDecimalInput(raw),
    }))
  }

  function removeLine(customerId: string, productId: string): void {
    replaceCustomerLines(
      customerId,
      linesOf(customerId).filter((line) => line.product.id !== productId),
    )
  }

  function viewOf(line: DraftLine): DraftLineView {
    return buildLineView(line)
  }

  function draftTotals(customerId: string): OrderTotals {
    const priced = linesOf(customerId)
      .map(toPricedLine)
      .filter((line): line is OrderLineInput => line !== null)
    return orderTotals(priced)
  }

  return {
    linesByCustomer,
    linesOf,
    hasProduct,
    addProduct,
    setUnits,
    setLots,
    setDiscount,
    removeLine,
    viewOf,
    draftTotals,
  }
})
