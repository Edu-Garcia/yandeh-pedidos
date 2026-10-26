import type { Seller, SellerCustomer, Supervisor } from '@yandeh/shared'
import { z } from 'zod'

export const sellerSchema = z.object({
  id: z.string(),
  name: z.string(),
  supervisorId: z.string(),
  discountAuthorityPercent: z.number(),
}) satisfies z.ZodType<Seller>

export const sellersResponseSchema = z.array(sellerSchema)

export const supervisorSchema = z.object({
  id: z.string(),
  name: z.string(),
}) satisfies z.ZodType<Supervisor>

export const supervisorsResponseSchema = z.array(supervisorSchema)

export const sellerCustomerSchema = z.object({
  id: z.string(),
  tradeName: z.string(),
  city: z.string(),
  uf: z.string(),
  priceTableId: z.string(),
  isFallback: z.boolean(),
  availableCredit: z.number(),
}) satisfies z.ZodType<SellerCustomer>

export const sellerCustomersResponseSchema = z.array(sellerCustomerSchema)
