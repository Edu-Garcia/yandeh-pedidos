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
  | { ok: true; customer: SellerWalletCustomer }
  | { ok: false; statusCode: 403 | 404; message: string }

/**
 * RN01 / T-13: cliente existe e pertence à carteira do vendedor do header.
 * 404 se o cliente não existe; 403 se é de outra carteira.
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

  if (!customer) {
    return { ok: false, statusCode: 404, message: 'Cliente não encontrado' }
  }

  if (customer.sellerId !== sellerId) {
    return { ok: false, statusCode: 403, message: 'Cliente não pertence à carteira do vendedor' }
  }

  return { ok: true, customer }
}
