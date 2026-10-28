import { eq } from 'drizzle-orm'
import type { Db } from '../db/client.js'
import { clientes } from '../db/schema.js'

export type SellerWalletCustomer = {
  id: string
  sellerId: string
  priceTableId: string | null
  creditLimit: number
  creditUsed: number
}

export type SellerWalletResult =
  { ok: true; customer: SellerWalletCustomer } | { ok: false; statusCode: 404; message: string }

/** Mesmo 404 para cliente inexistente e para cliente de outra carteira (D14). */
export const CUSTOMER_NOT_FOUND = { message: 'Cliente não encontrado' } as const

/**
 * RN01 / D14: cliente existe e pertence à carteira do vendedor do header.
 * Fora da carteira é indistinguível de inexistente — mesmo 404 e mesmo corpo.
 */
export async function findCustomerInSellerWallet(
  database: Db,
  sellerId: string,
  customerId: string,
): Promise<SellerWalletResult> {
  const [customer] = await database
    .select({
      id: clientes.id,
      sellerId: clientes.vendedorId,
      priceTableId: clientes.tabelaPrecoId,
      creditLimit: clientes.limiteCreditoCentavos,
      creditUsed: clientes.creditoUtilizadoCentavos,
    })
    .from(clientes)
    .where(eq(clientes.id, customerId))
    .limit(1)

  if (!customer || customer.sellerId !== sellerId) {
    return { ok: false, statusCode: 404, message: CUSTOMER_NOT_FOUND.message }
  }

  return { ok: true, customer }
}
