import { isValidQuantity } from './packaging.js'
import { MINIMUM_ORDER_CENTS } from './rules.js'
import { isSellable } from './sellable.js'
import { orderTotals } from './totals.js'
import type { Cents, OrderLineInput, Product, ValidationIssue } from './types.js'

/** Mensagens pt-BR dos bloqueios (PRD §8, coluna "Quando"). */
const ISSUE_MESSAGES = {
  EMPTY_ORDER: 'Pedido sem itens',
  INVALID_QUANTITY: 'Quantidade não inteira, < 1 ou fora do múltiplo da embalagem',
  INVALID_DISCOUNT: 'Desconto fora de 0–100%',
  PRODUCT_NOT_SELLABLE: 'Produto inativo ou sem preço na tabela efetiva',
  BELOW_MINIMUM: 'Total líquido abaixo de R$ 300,00',
  INSUFFICIENT_CREDIT: 'Total líquido acima do crédito disponível',
} as const

/**
 * Linha aceita `unitPrice: null` para compor `isSellable` (sem preço na tabela).
 * `OrderLineInput` (preço já em centavos) continua atribuível.
 */
export type ValidateOrderLine = Omit<OrderLineInput, 'unitPrice'> & {
  unitPrice: Cents | null
}

export interface ValidateOrderInput {
  lines: readonly ValidateOrderLine[]
  products: readonly Product[]
  availableCredit: Cents
}

/** RN06: desconto percentual por item em 0–100 (fora → INVALID_DISCOUNT). */
function isDiscountInRange(discountPercent: number): boolean {
  return discountPercent >= 0 && discountPercent <= 100
}

function toPricedLine(line: ValidateOrderLine): OrderLineInput {
  return {
    productId: line.productId,
    quantityUnits: line.quantityUnits,
    unitPrice: line.unitPrice ?? 0,
    discountPercent: line.discountPercent,
  }
}

/**
 * Bloqueios de envio (RN05, RN06, RN08, RN09 / A10, A11, A24 / R4, R7).
 * Alçada não é bloqueio (RN10 / A24): só aviso em outro agregado.
 */
export function validateOrder(input: ValidateOrderInput): ValidationIssue[] {
  const { lines, products, availableCredit } = input

  if (lines.length === 0) {
    return [{ code: 'EMPTY_ORDER', message: ISSUE_MESSAGES.EMPTY_ORDER }]
  }

  const productsById = new Map(products.map((product) => [product.id, product]))
  const issues: ValidationIssue[] = []

  for (const line of lines) {
    const product = productsById.get(line.productId)

    if (product !== undefined && !isValidQuantity(product, line.quantityUnits)) {
      issues.push({
        code: 'INVALID_QUANTITY',
        message: ISSUE_MESSAGES.INVALID_QUANTITY,
        productId: line.productId,
      })
    }

    if (!isDiscountInRange(line.discountPercent)) {
      issues.push({
        code: 'INVALID_DISCOUNT',
        message: ISSUE_MESSAGES.INVALID_DISCOUNT,
        productId: line.productId,
      })
    }

    if (product === undefined || !isSellable(product, line.unitPrice)) {
      issues.push({
        code: 'PRODUCT_NOT_SELLABLE',
        message: ISSUE_MESSAGES.PRODUCT_NOT_SELLABLE,
        productId: line.productId,
      })
    }
  }

  const { net } = orderTotals(lines.map(toPricedLine))

  if (net < MINIMUM_ORDER_CENTS) {
    issues.push({
      code: 'BELOW_MINIMUM',
      message: ISSUE_MESSAGES.BELOW_MINIMUM,
      minimum: MINIMUM_ORDER_CENTS,
      net,
    })
  }

  if (net > availableCredit) {
    issues.push({
      code: 'INSUFFICIENT_CREDIT',
      message: ISSUE_MESSAGES.INSUFFICIENT_CREDIT,
      available: availableCredit,
      net,
    })
  }

  return issues
}
