/** Valores monetários são SEMPRE inteiros em centavos (ex.: R$ 26,90 => 2690). */
export type Cents = number

export type SaleUnit = 'UN' | 'CX' | 'FD'

export interface Product {
  id: string
  sku: string
  ean: string
  description: string
  category: string
  brand: string
  saleUnit: SaleUnit
  /** Unidades por embalagem de venda. */
  packFactor: number
  /** Quando true, a quantidade em unidades deve ser múltipla de packFactor. */
  multipleOnly: boolean
  active: boolean
}

export interface Seller {
  id: string
  name: string
  supervisorId: string
  discountAuthorityPercent: number
}

export interface Customer {
  id: string
  tradeName: string
  priceTableId: string | null
  creditLimit: Cents
  creditUsed: Cents
}

/** Item de preço já em centavos (espelha `tabelas_preco_itens`). */
export interface PriceItem {
  productId: string
  priceTableId: string
  unitPrice: Cents
}

/** Resultado de RN02: tabela do cliente ou TP01 com flag de fallback. */
export interface EffectivePriceTable {
  tableId: string
  isFallback: boolean
}

export interface OrderLineInput {
  productId: string
  /** Quantidade SEMPRE em unidades. */
  quantityUnits: number
  unitPrice: Cents
  /** Desconto percentual do item (0..100). */
  discountPercent: number
}

export interface OrderLineTotals {
  gross: Cents
  discount: Cents
  net: Cents
}

export interface OrderTotals {
  gross: Cents
  discount: Cents
  net: Cents
}

export type OrderStatus = 'Enviado' | 'Aguardando aprovação' | 'Aprovado' | 'Rejeitado'

export type ValidationIssue =
  | { code: 'BELOW_MINIMUM_ORDER'; minimum: Cents; net: Cents }
  | { code: 'INSUFFICIENT_CREDIT'; available: Cents; net: Cents }
  | { code: 'INVALID_QUANTITY'; productId: string }
  | { code: 'PRODUCT_NOT_SELLABLE'; productId: string }
  | { code: 'EMPTY_ORDER' }
