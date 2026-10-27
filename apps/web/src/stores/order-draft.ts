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
  /** Envio interrompido (rede/5xx/offline) à espera de retentativa (T-27, A51). */
  submitPending: boolean
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
  pending: Record<string, boolean>
} {
  const persisted = readAllPersisted()
  const lines: Record<string, DraftLine[]> = {}
  const keys: Record<string, string> = {}
  const pending: Record<string, boolean> = {}
  for (const [customerId, draft] of Object.entries(persisted)) {
    lines[customerId] = draft.lines
    keys[customerId] = draft.idempotencyKey
    if (draft.lines.length > 0 && draft.submitPending === true) {
      pending[customerId] = true
    }
  }
  return { lines, keys, pending }
}

/** Rascunho do pedido em unidades, por cliente (RN05, D9). Persistido em localStorage (RN13, A20, T-26). */
export const useOrderDraftStore = defineStore('orderDraft', () => {
  const hydrated = hydrateFromStorage()
  const linesByCustomer = ref<Record<string, DraftLine[]>>(hydrated.lines)
  const idempotencyKeyByCustomer = ref<Record<string, string>>(hydrated.keys)
  const submitPendingByCustomer = ref<Record<string, boolean>>(hydrated.pending)

  function linesOf(customerId: string): DraftLine[] {
    return linesByCustomer.value[customerId] ?? []
  }

  function hasProduct(customerId: string, productId: string): boolean {
    return linesOf(customerId).some((line) => line.product.id === productId)
  }

  function forgetCustomerMeta(customerId: string): void {
    const remainingKeys = { ...idempotencyKeyByCustomer.value }
    const remainingPending = { ...submitPendingByCustomer.value }
    delete remainingKeys[customerId]
    delete remainingPending[customerId]
    idempotencyKeyByCustomer.value = remainingKeys
    submitPendingByCustomer.value = remainingPending
  }

  function persistCustomer(customerId: string): void {
    const drafts = readAllPersisted()
    const lines = linesOf(customerId)
    if (lines.length === 0) {
      delete drafts[customerId]
      forgetCustomerMeta(customerId)
      writeAllPersisted(drafts)
      return
    }
    const key = ensureIdempotencyKey(customerId)
    drafts[customerId] = {
      idempotencyKey: key,
      lines,
      submitPending: submitPendingByCustomer.value[customerId] === true,
    }
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
    if (isSubmitPending(customerId)) return
    if (hasProduct(customerId, product.id)) return
    replaceCustomerLines(customerId, [
      ...linesOf(customerId),
      { product, quantityUnits: defaultUnits(product), discountPercent: 0 },
    ])
    persistCustomer(customerId)
  }

  function setUnits(customerId: string, productId: string, raw: string): void {
    if (isSubmitPending(customerId)) return
    updateLine(customerId, productId, (line) => {
      if (isUnitsReadOnly(line.product)) return line
      return { ...line, quantityUnits: parseDecimalInput(raw) }
    })
    persistCustomer(customerId)
  }

  function setLots(customerId: string, productId: string, raw: string): void {
    if (isSubmitPending(customerId)) return
    updateLine(customerId, productId, (line) => {
      if (!hasLotField(line.product)) return line
      const lots = parseDecimalInput(raw)
      return { ...line, quantityUnits: unitsFromLots(lots, line.product.packFactor) }
    })
    persistCustomer(customerId)
  }

  function setDiscount(customerId: string, productId: string, raw: string): void {
    if (isSubmitPending(customerId)) return
    updateLine(customerId, productId, (line) => ({
      ...line,
      discountPercent: parseDecimalInput(raw),
    }))
    persistCustomer(customerId)
  }

  function removeLine(customerId: string, productId: string): void {
    if (isSubmitPending(customerId)) return
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

  function isSubmitPending(customerId: string): boolean {
    return submitPendingByCustomer.value[customerId] === true
  }

  function markSubmitPending(customerId: string): void {
    if (linesOf(customerId).length === 0) return
    submitPendingByCustomer.value = { ...submitPendingByCustomer.value, [customerId]: true }
    persistCustomer(customerId)
  }

  function clearSubmitPending(customerId: string): void {
    if (!isSubmitPending(customerId)) return
    const remainingPending = { ...submitPendingByCustomer.value }
    delete remainingPending[customerId]
    submitPendingByCustomer.value = remainingPending
    persistCustomer(customerId)
  }

  function clearDraft(customerId: string): void {
    const remainingLines = { ...linesByCustomer.value }
    delete remainingLines[customerId]
    linesByCustomer.value = remainingLines
    forgetCustomerMeta(customerId)
    persistCustomer(customerId)
  }

  function hasDraft(customerId: string): boolean {
    return linesOf(customerId).length > 0
  }

  /** Substitui o rascunho com o retorno do repeat. Descarta a chave (rascunho novo). */
  function loadRepeatDraft(customerId: string, lines: DraftLine[]): void {
    if (isSubmitPending(customerId)) return
    replaceCustomerLines(customerId, lines)
    forgetCustomerMeta(customerId)
    persistCustomer(customerId)
  }

  return {
    linesByCustomer,
    idempotencyKeyByCustomer,
    submitPendingByCustomer,
    linesOf,
    hasProduct,
    hasDraft,
    isSubmitPending,
    markSubmitPending,
    clearSubmitPending,
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
