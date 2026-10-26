import type { Seller, Supervisor } from '@yandeh/shared'
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
