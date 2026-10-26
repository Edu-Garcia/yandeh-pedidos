import type {
  CustomerProduct,
  Product,
  Seller,
  SellerCustomer,
  Supervisor,
  ValidationIssue,
} from '@yandeh/shared'
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
  priceTableName: z.string(),
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

export const idempotencyKeyHeaderSchema = z.uuid()

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

export const createOrderItemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number(),
  discountPercent: z.number(),
})

export const createOrderBodySchema = z.object({
  customerId: z.string().trim().min(1),
  items: z.array(createOrderItemSchema),
})

export const validationIssueSchema = z.discriminatedUnion('code', [
  z.object({
    code: z.literal('EMPTY_ORDER'),
    message: z.string(),
  }),
  z.object({
    code: z.literal('INVALID_QUANTITY'),
    message: z.string(),
    productId: z.string(),
  }),
  z.object({
    code: z.literal('INVALID_DISCOUNT'),
    message: z.string(),
    productId: z.string(),
  }),
  z.object({
    code: z.literal('PRODUCT_NOT_SELLABLE'),
    message: z.string(),
    productId: z.string(),
  }),
  z.object({
    code: z.literal('BELOW_MINIMUM'),
    message: z.string(),
    minimum: z.number(),
    net: z.number(),
  }),
  z.object({
    code: z.literal('INSUFFICIENT_CREDIT'),
    message: z.string(),
    available: z.number(),
    net: z.number(),
  }),
]) satisfies z.ZodType<ValidationIssue>

export const validationIssuesSchema = z.array(validationIssueSchema)

export const createdOrderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  discountPercent: z.number(),
})

export const createdOrderSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  sellerId: z.string(),
  status: z.enum(['Enviado', 'Aguardando aprovação']),
  totals: z.object({
    gross: z.number(),
    discount: z.number(),
    net: z.number(),
  }),
  items: z.array(createdOrderItemSchema),
})
