import type {
  CustomerProduct,
  OrderTotals,
  Seller,
  SellerCustomer,
  Supervisor,
  ValidationIssue,
} from '@yandeh/shared'
import { useSessionStore } from '@/stores/session'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

export type CreatedOrderStatus = 'Enviado' | 'Aguardando aprovação'

export interface CreateOrderItem {
  productId: string
  quantity: number
  discountPercent: number
}

export interface CreatedOrder {
  id: string
  customerId: string
  sellerId: string
  status: CreatedOrderStatus
  totals: OrderTotals
  items: CreateOrderItem[]
}

export class ApiError extends Error {
  readonly status: number
  readonly issues: ValidationIssue[] | null

  constructor(status: number, message: string, issues: ValidationIssue[] | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.issues = issues
  }
}

export function apiErrorFromBody(status: number, detail: string): ApiError {
  let message = detail || `HTTP ${status}`
  let issues: ValidationIssue[] | null = null
  try {
    const parsed: unknown = JSON.parse(detail)
    if (Array.isArray(parsed)) {
      issues = parsed as ValidationIssue[]
      const fromIssues = issues
        .map((issue) => issue.message)
        .filter((text) => typeof text === 'string' && text.length > 0)
        .join(' ')
      if (fromIssues) message = fromIssues
    } else if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'message' in parsed &&
      typeof parsed.message === 'string' &&
      parsed.message.length > 0
    ) {
      message = parsed.message
    }
  } catch {
    /* corpo em texto puro */
  }
  return new ApiError(status, message, issues)
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const session = useSessionStore()
  if (session.sellerId) {
    headers.set('X-Seller-Id', session.sellerId)
  }
  if (session.supervisorId) {
    headers.set('X-Supervisor-Id', session.supervisorId)
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!response.ok) {
    throw apiErrorFromBody(response.status, (await response.text()) || `HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

export function fetchSellers(): Promise<Seller[]> {
  return apiRequest<Seller[]>('/sellers')
}

export function fetchSupervisors(): Promise<Supervisor[]> {
  return apiRequest<Supervisor[]>('/supervisors')
}

export function fetchSellerCustomers(sellerId: string): Promise<SellerCustomer[]> {
  return apiRequest<SellerCustomer[]>(`/sellers/${sellerId}/customers`)
}

export function fetchCustomerProducts(
  customerId: string,
  query: string,
  init: RequestInit = {},
): Promise<CustomerProduct[]> {
  const params = new URLSearchParams({ q: query })
  return apiRequest<CustomerProduct[]>(`/customers/${customerId}/products?${params}`, init)
}

export function createOrder(
  body: { customerId: string; items: CreateOrderItem[] },
  idempotencyKey: string,
): Promise<CreatedOrder> {
  return apiRequest<CreatedOrder>('/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  })
}

/** Status persistidos: novos (T-14) + histórico do seed (Faturado/Cancelado). */
export type CustomerOrderStatus =
  'Enviado' | 'Aguardando aprovação' | 'Aprovado' | 'Rejeitado' | 'Faturado' | 'Cancelado'

export interface CustomerOrderSummary {
  id: string
  /** Data civil `YYYY-MM-DD` (sem fuso). */
  date: string
  status: CustomerOrderStatus
  /** Líquido em centavos, com preço e desconto congelados. */
  total: number
}

export interface RepeatDraftLine {
  productId: string
  product: CustomerProduct
  quantityUnits: number
  discountPercent: number
  lots: number | null
}

export interface RepeatRemovedItem {
  productId: string
  description: string | null
  ean: string | null
  reason: string
}

export type RepeatNotice =
  | {
      code: 'PACK_FACTOR_CHANGED'
      productId: string
      description: string | null
      newFactor: number
      lots: number
      units: number
      message: string
    }
  | {
      code: 'LOT_NOT_EXACT'
      productId: string
      description: string | null
      newFactor: number
      lots: null
      units: number
      message: string
    }

export interface RepeatDraftResponse {
  lines: RepeatDraftLine[]
  removed: RepeatRemovedItem[]
  notices: RepeatNotice[]
}

export function fetchCustomerOrders(customerId: string): Promise<CustomerOrderSummary[]> {
  return apiRequest<CustomerOrderSummary[]>(`/customers/${customerId}/orders`)
}

/** Monta o rascunho para revisão. Não cria pedido (RN12). */
export function repeatCustomerOrder(
  customerId: string,
  orderId: string,
): Promise<RepeatDraftResponse> {
  return apiRequest<RepeatDraftResponse>(`/customers/${customerId}/orders/${orderId}/repeat`, {
    method: 'POST',
  })
}

/** 403/404 da API: não revelar se o recurso existe (T-17). */
export function isHiddenResourceError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 403 || error.status === 404)
}

/** Pedido pendente do supervisor (T-24 / A43). */
export type SupervisorOrderStatus = 'Aguardando aprovação' | 'Aprovado' | 'Rejeitado'

export interface SupervisorOrder {
  id: string
  /** Data civil `YYYY-MM-DD` (sem fuso). */
  date: string
  status: SupervisorOrderStatus
  /** Líquido em centavos, com preço e desconto congelados. */
  total: number
  maxDiscount: number
  customer: {
    id: string
    tradeName: string
  }
  seller: {
    id: string
    name: string
    discountAuthorityPercent: number
  }
}

export const SUPERVISOR_PENDING_STATUS = 'Aguardando aprovação' as const

export function fetchPendingSupervisorOrders(): Promise<SupervisorOrder[]> {
  const params = new URLSearchParams({ status: SUPERVISOR_PENDING_STATUS })
  return apiRequest<SupervisorOrder[]>(`/supervisor/orders?${params}`)
}

export function approveSupervisorOrder(orderId: string): Promise<SupervisorOrder> {
  return apiRequest<SupervisorOrder>(`/supervisor/orders/${orderId}/approve`, {
    method: 'POST',
  })
}

export function rejectSupervisorOrder(orderId: string): Promise<SupervisorOrder> {
  return apiRequest<SupervisorOrder>(`/supervisor/orders/${orderId}/reject`, {
    method: 'POST',
  })
}
