import { z } from 'zod'

/** Espelha `Seller` de `@yandeh/shared` (alçada como número percentual, não fração). */
export const sellerSchema = z.object({
  id: z.string(),
  name: z.string(),
  supervisorId: z.string(),
  discountAuthorityPercent: z.number(),
})

export const sellersResponseSchema = z.array(sellerSchema)

/** Espelha `Supervisor` de `@yandeh/shared`. */
export const supervisorSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export const supervisorsResponseSchema = z.array(supervisorSchema)
