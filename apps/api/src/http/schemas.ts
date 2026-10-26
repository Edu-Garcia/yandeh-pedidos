import type { CustomerProduct, Product, Seller, SellerCustomer, Supervisor } from '@yandeh/shared'
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

export const productSchema = z.object({
  id: z.string(),
  sku: z.string(),
  ean: z.string(),
  description: z.string(),
  category: z.string(),
  brand: z.string(),
  saleUnit: z.enum(['UN', 'CX', 'FD']),
  packFactor: z.number(),
  multipleOnly: z.boolean(),
  active: z.boolean(),
}) satisfies z.ZodType<Product>

export const productsCatalogSchema = z.array(productSchema)

export const sellerIdHeaderSchema = z.string().trim().min(1)

export const customerProductsQuerySchema = z.object({
  q: z.string().trim().min(1),
})

export const customerProductSchema = z.object({
  id: z.string(),
  sku: z.string(),
  ean: z.string(),
  description: z.string(),
  category: z.string(),
  brand: z.string(),
  saleUnit: z.enum(['UN', 'CX', 'FD']),
  packFactor: z.number(),
  multipleOnly: z.boolean(),
  unitPrice: z.number(),
}) satisfies z.ZodType<CustomerProduct>

export const customerProductsResponseSchema = z.array(customerProductSchema)
