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

export interface Supervisor {
  id: string
  name: string
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

/** Cliente da carteira do vendedor (RN01, RN02, RN09): tabela efetiva + crédito disponível. */
export interface SellerCustomer {
  id: string
  tradeName: string
  city: string
  uf: string
  /** Tabela efetiva (`resolvePriceTableId`), não o id cru do cadastro. */
  priceTableId: string
  isFallback: boolean
  availableCredit: Cents
}

/** Produto vendável da busca do cliente (RN03, RN04): preço da tabela efetiva. */
export interface CustomerProduct {
  id: string
  sku: string
  ean: string
  description: string
  category: string
  brand: string
  saleUnit: SaleUnit
  packFactor: number
  multipleOnly: boolean
  unitPrice: Cents
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

/** Códigos estáveis de bloqueio de envio (PRD §8 / A24). Alçada não é erro. */
export type ValidationIssueCode =
  | 'EMPTY_ORDER'
  | 'INVALID_QUANTITY'
  | 'INVALID_DISCOUNT'
  | 'PRODUCT_NOT_SELLABLE'
  | 'BELOW_MINIMUM'
  | 'INSUFFICIENT_CREDIT'

export type ValidationIssue =
  | { code: 'EMPTY_ORDER'; message: string }
  | { code: 'INVALID_QUANTITY'; message: string; productId: string }
  | { code: 'INVALID_DISCOUNT'; message: string; productId: string }
  | { code: 'PRODUCT_NOT_SELLABLE'; message: string; productId: string }
  | { code: 'BELOW_MINIMUM'; message: string; minimum: Cents; net: Cents }
  | { code: 'INSUFFICIENT_CREDIT'; message: string; available: Cents; net: Cents }
