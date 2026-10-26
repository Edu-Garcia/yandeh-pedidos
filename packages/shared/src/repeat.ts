import { lotsFromUnits, unitsFromLots } from './packaging.js'
import { unitPriceFor } from './price.js'
import { isSellable } from './sellable.js'
import type { Cents, OrderLineInput, PriceItem, Product } from './types.js'

/** Item do histórico: o banco guarda só unidades (A26 / D13). */
export interface HistoryOrderItem {
  productId: string
  quantityUnits: number
}

/**
 * Pedido histórico a repetir (RN12 / A17).
 * Status não entra na montagem: cancelado também é repetível.
 */
export interface HistoryOrder {
  id: string
  items: readonly HistoryOrderItem[]
}

/** Tabela usada para o preço atual (não o histórico). */
export interface RepeatPriceTable {
  tableId: string
  items: readonly PriceItem[]
}

export interface RepeatRemovedItem {
  productId: string
  reason: string
}

/**
 * Aviso de embalagem no rascunho (RN12 / D13).
 * `PACK_FACTOR_CHANGED`: só-múltiplo ajustado para cima.
 * `LOT_NOT_EXACT`: não só-múltiplo que não fecha lote (Lote vazio).
 */
export type RepeatNotice =
  | {
      code: 'PACK_FACTOR_CHANGED'
      productId: string
      newFactor: number
      lots: number
      units: number
      message: string
    }
  | {
      code: 'LOT_NOT_EXACT'
      productId: string
      newFactor: number
      lots: null
      units: number
      message: string
    }

/** Linha do rascunho: preço atual, desconto 0%, lote derivado do fator atual. */
export interface RepeatDraftLine extends OrderLineInput {
  /** `null` ⇔ Lote vazio (unidades não fecham o fator atual). */
  lots: number | null
}

export interface RepeatDraft {
  lines: RepeatDraftLine[]
  removed: RepeatRemovedItem[]
  notices: RepeatNotice[]
}

const REMOVAL_REASON = {
  NOT_IN_CATALOG: 'Produto não encontrado no catálogo',
  INACTIVE: 'Produto inativo',
  NO_PRICE: 'Produto sem preço na tabela',
} as const

function packFactorChangedMessage(newFactor: number, lots: number, units: number): string {
  return `A quantidade de unidades por lote mudou para ${newFactor}; a quantidade foi ajustada para ${lots} lote(s) (${units} unidades)`
}

function lotNotExactMessage(newFactor: number): string {
  return `As unidades do histórico não fecham um lote com o fator atual (${newFactor}); o campo Lote ficou vazio.`
}

function removalReason(product: Product | undefined, price: Cents | null): string {
  if (product === undefined) {
    return REMOVAL_REASON.NOT_IN_CATALOG
  }
  if (!product.active) {
    return REMOVAL_REASON.INACTIVE
  }
  if (price === null) {
    return REMOVAL_REASON.NO_PRICE
  }
  return REMOVAL_REASON.NO_PRICE
}

/**
 * Monta o rascunho de "repetir pedido" para revisão (RN12 / D12 / D13 / A15–A18).
 * Preço atual da tabela, quantidade do histórico (revalidada no fator atual), desconto 0%.
 * Inativos / sem preço / ausentes saem em `removed`. Não envia o pedido.
 */
export function buildRepeatDraft(
  historyOrder: HistoryOrder,
  catalog: readonly Product[],
  priceTable: RepeatPriceTable,
): RepeatDraft {
  const productsById = new Map(catalog.map((product) => [product.id, product]))
  const lines: RepeatDraftLine[] = []
  const removed: RepeatRemovedItem[] = []
  const notices: RepeatNotice[] = []

  for (const item of historyOrder.items) {
    const product = productsById.get(item.productId)
    const price =
      product === undefined ? null : unitPriceFor(product, priceTable.tableId, priceTable.items)

    if (product === undefined || price === null || !isSellable(product, price)) {
      removed.push({
        productId: item.productId,
        reason: removalReason(product, price),
      })
      continue
    }

    const historyUnits = item.quantityUnits
    const factor = product.packFactor
    const exactLots = lotsFromUnits(historyUnits, factor)

    if (product.multipleOnly && exactLots === null) {
      const lots = Math.ceil(historyUnits / factor)
      const units = unitsFromLots(lots, factor)
      lines.push({
        productId: product.id,
        quantityUnits: units,
        unitPrice: price,
        discountPercent: 0,
        lots,
      })
      notices.push({
        code: 'PACK_FACTOR_CHANGED',
        productId: product.id,
        newFactor: factor,
        lots,
        units,
        message: packFactorChangedMessage(factor, lots, units),
      })
      continue
    }

    lines.push({
      productId: product.id,
      quantityUnits: historyUnits,
      unitPrice: price,
      discountPercent: 0,
      lots: exactLots,
    })

    if (!product.multipleOnly && exactLots === null) {
      notices.push({
        code: 'LOT_NOT_EXACT',
        productId: product.id,
        newFactor: factor,
        lots: null,
        units: historyUnits,
        message: lotNotExactMessage(factor),
      })
    }
  }

  return { lines, removed, notices }
}
