import type { Cents, OrderLineInput, Product, ValidationIssue } from './types'

// STUBS — regras de negócio ainda NÃO implementadas (ver PRD.md §6).
// Cada função deve ser pura, operar em centavos e ser coberta por testes antes da implementação.

export const MINIMUM_ORDER_CENTS: Cents = 30000
export const FALLBACK_PRICE_TABLE_ID = 'TP01'

const notImplemented = (name: string): never => {
  throw new Error(`${name}: não implementado`)
}

/** Lista de bloqueios para envio (vazia = pode enviar). */
export function validateOrder(_input: {
  lines: OrderLineInput[]
  products: Product[]
  availableCredit: Cents
}): ValidationIssue[] {
  return notImplemented('validateOrder')
}
