import type { Cents, Customer } from './types.js'

/**
 * Soma o líquido dos pedidos que reservam crédito (RN09 / D10 / A11 / A12).
 * Só `"Aguardando aprovação"` reserva o `net` (total_líquido) já em centavos.
 * Enviado/Aprovado entram em `creditUsed`; Rejeitado/Cancelado/Faturado não reservam.
 */
export function reservedCredit(
  pendingOrders: ReadonlyArray<{ status: string; net: Cents }>,
): Cents {
  let reserved = 0
  for (const order of pendingOrders) {
    if (order.status === 'Aguardando aprovação') {
      reserved += order.net
    }
  }
  return reserved
}

/**
 * Crédito disponível = limite − utilizado − reservado (RN09 / D10 / A11 / A19).
 * Pode ser ≤ 0; não clampa (o bloqueio de envio é T-08).
 */
export function availableCredit(
  customer: Pick<Customer, 'creditLimit' | 'creditUsed'>,
  reserved: Cents,
): Cents {
  return customer.creditLimit - customer.creditUsed - reserved
}
