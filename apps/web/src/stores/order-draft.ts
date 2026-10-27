import {
  hasLotField,
  isUnitsReadOnly,
  isValidQuantity,
  lineTotals,
  lotsFromUnits,
  orderTotals,
  unitsFromLots,
  validateOrder,
  type CustomerProduct,
  type OrderLineInput,
  type OrderLineTotals,
  type OrderTotals,
  type Product,
  type SaleUnit,
  type ValidationIssue,
} from '@yandeh/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const DRAFT_STORAGE_KEY = 'yandeh.orderDraft'

/** Mensagens iguais ao PRD §8, usadas no erro inline da T-20 (sem `validateOrder`). */
export const QUANTITY_ERROR = 'Quantidade não inteira, < 1 ou fora do múltiplo da embalagem'
export const DISCOUNT_ERROR = 'Desconto fora de 0–100%'

export interface DraftLine {
  product: CustomerProduct
  quantityUnits: number
  discountPercent: number
}

export interface PersistedOrderDraft {
  idempotencyKey: string
  lines: DraftLine[]
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

export function newIdempotencyKey(): string {
  return crypto.randomUUID()
}

export function toProduct(product: CustomerProduct): Product {
  return { ...product, active: true }
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

function readAllPersisted(): Record<string, PersistedOrderDraft> {
  const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
  if (!raw) return {}
  return JSON.parse(raw) as Record<string, PersistedOrderDraft>
}

function writeAllPersisted(drafts: Record<string, PersistedOrderDraft>): void {
  if (Object.keys(drafts).length === 0) {
    localStorage.removeItem(DRAFT_STORAGE_KEY)
    return
  }
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts))
}

function hydrateFromStorage(): {
  lines: Record<string, DraftLine[]>
  keys: Record<string, string>
} {
  const persisted = readAllPersisted()
  const lines: Record<string, DraftLine[]> = {}
  const keys: Record<string, string> = {}
  for (const [customerId, draft] of Object.entries(persisted)) {
    lines[customerId] = draft.lines
    keys[customerId] = draft.idempotencyKey
  }
  return { lines, keys }
}

/** Rascunho do pedido em unidades, por cliente (RN05, D9). Persistido em localStorage (RN13, A20, T-26). */
export const useOrderDraftStore = defineStore('orderDraft', () => {
  const hydrated = hydrateFromStorage()
  const linesByCustomer = ref<Record<string, DraftLine[]>>(hydrated.lines)
  const idempotencyKeyByCustomer = ref<Record<string, string>>(hydrated.keys)

  function linesOf(customerId: string): DraftLine[] {
    return linesByCustomer.value[customerId] ?? []
  }

  function hasProduct(customerId: string, productId: string): boolean {
    return linesOf(customerId).some((line) => line.product.id === productId)
  }

  function persistCustomer(customerId: string): void {
    const drafts = readAllPersisted()
    const lines = linesOf(customerId)
    if (lines.length === 0) {
      delete drafts[customerId]
      const remainingKeys = { ...idempotencyKeyByCustomer.value }
      delete remainingKeys[customerId]
      idempotencyKeyByCustomer.value = remainingKeys
      writeAllPersisted(drafts)
      return
    }
    const key = ensureIdempotencyKey(customerId)
    drafts[customerId] = { idempotencyKey: key, lines }
    writeAllPersisted(drafts)
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
    persistCustomer(customerId)
  }

  function setUnits(customerId: string, productId: string, raw: string): void {
    updateLine(customerId, productId, (line) => {
      if (isUnitsReadOnly(line.product)) return line
      return { ...line, quantityUnits: parseDecimalInput(raw) }
    })
    persistCustomer(customerId)
  }

  function setLots(customerId: string, productId: string, raw: string): void {
    updateLine(customerId, productId, (line) => {
      if (!hasLotField(line.product)) return line
      const lots = parseDecimalInput(raw)
      return { ...line, quantityUnits: unitsFromLots(lots, line.product.packFactor) }
    })
    persistCustomer(customerId)
  }

  function setDiscount(customerId: string, productId: string, raw: string): void {
    updateLine(customerId, productId, (line) => ({
      ...line,
      discountPercent: parseDecimalInput(raw),
    }))
    persistCustomer(customerId)
  }

  function removeLine(customerId: string, productId: string): void {
    replaceCustomerLines(
      customerId,
      linesOf(customerId).filter((line) => line.product.id !== productId),
    )
    persistCustomer(customerId)
  }

  function viewOf(line: DraftLine): DraftLineView {
    return buildLineView(line)
  }

  function pricedLinesOf(customerId: string): OrderLineInput[] {
    return linesOf(customerId)
      .map(toPricedLine)
      .filter((line): line is OrderLineInput => line !== null)
  }

  function draftTotals(customerId: string): OrderTotals {
    return orderTotals(pricedLinesOf(customerId))
  }

  function draftIssues(customerId: string, availableCredit: number): ValidationIssue[] {
    const lines = linesOf(customerId)
    return validateOrder({
      lines: lines.map((line) => ({
        productId: line.product.id,
        quantityUnits: line.quantityUnits,
        unitPrice: line.product.unitPrice,
        discountPercent: line.discountPercent,
      })),
      products: lines.map((line) => toProduct(line.product)),
      availableCredit,
    })
  }

  function hasInlineErrors(customerId: string): boolean {
    return linesOf(customerId).some((line) => {
      const view = buildLineView(line)
      return view.quantityError !== null || view.discountError !== null
    })
  }

  function ensureIdempotencyKey(customerId: string): string {
    const existing = idempotencyKeyByCustomer.value[customerId]
    if (existing) return existing
    const key = newIdempotencyKey()
    idempotencyKeyByCustomer.value = { ...idempotencyKeyByCustomer.value, [customerId]: key }
    return key
  }

  function clearDraft(customerId: string): void {
    const remainingLines = { ...linesByCustomer.value }
    const remainingKeys = { ...idempotencyKeyByCustomer.value }
    delete remainingLines[customerId]
    delete remainingKeys[customerId]
    linesByCustomer.value = remainingLines
    idempotencyKeyByCustomer.value = remainingKeys
    persistCustomer(customerId)
  }

  function hasDraft(customerId: string): boolean {
    return linesOf(customerId).length > 0
  }

  /** Substitui o rascunho com o retorno do repeat. Descarta a chave (rascunho novo). */
  function loadRepeatDraft(customerId: string, lines: DraftLine[]): void {
    replaceCustomerLines(customerId, lines)
    const remainingKeys = { ...idempotencyKeyByCustomer.value }
    delete remainingKeys[customerId]
    idempotencyKeyByCustomer.value = remainingKeys
    persistCustomer(customerId)
  }

  return {
    linesByCustomer,
    idempotencyKeyByCustomer,
    linesOf,
    hasProduct,
    hasDraft,
    loadRepeatDraft,
    addProduct,
    setUnits,
    setLots,
    setDiscount,
    removeLine,
    viewOf,
    pricedLinesOf,
    draftTotals,
    draftIssues,
    hasInlineErrors,
    ensureIdempotencyKey,
    clearDraft,
  }
})
