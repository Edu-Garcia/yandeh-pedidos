import type {
  Cents,
  Customer,
  OrderLineInput,
  OrderLineTotals,
  OrderStatus,
  OrderTotals,
  Product,
  ValidationIssue,
} from './types'

// STUBS — regras de negócio ainda NÃO implementadas (ver PRD.md §6).
// Cada função deve ser pura, operar em centavos e ser coberta por testes antes da implementação.

export const MINIMUM_ORDER_CENTS: Cents = 30000
export const FALLBACK_PRICE_TABLE_ID = 'TP01'

const notImplemented = (name: string): never => {
  throw new Error(`${name}: não implementado`)
}

/** Quantidade em unidades é válida para o produto (múltiplo da embalagem quando exigido)? */
export function isValidQuantity(_product: Product, _quantityUnits: number): boolean {
  return notImplemented('isValidQuantity')
}

/** Totais de uma linha, arredondados por linha em centavos. */
export function lineTotals(_line: OrderLineInput): OrderLineTotals {
  return notImplemented('lineTotals')
}

/** Soma dos totais das linhas. */
export function orderTotals(_lines: OrderLineInput[]): OrderTotals {
  return notImplemented('orderTotals')
}

/** Crédito disponível = limite - utilizado - reservado (pedidos aguardando aprovação). */
export function availableCredit(_customer: Customer, _reserved: Cents): Cents {
  return notImplemented('availableCredit')
}

/** Status do pedido pela alçada: maior desconto de item vs alçada do vendedor. */
export function statusForDiscount(
  _lines: OrderLineInput[],
  _authorityPercent: number,
): OrderStatus {
  return notImplemented('statusForDiscount')
}

/** Lista de bloqueios para envio (vazia = pode enviar). */
export function validateOrder(_input: {
  lines: OrderLineInput[]
  products: Product[]
  availableCredit: Cents
}): ValidationIssue[] {
  return notImplemented('validateOrder')
}
