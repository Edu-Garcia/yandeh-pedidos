import type { CustomerProduct, Seller, SellerCustomer, Supervisor } from '@yandeh/shared'
import { useSessionStore } from '@/stores/session'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const sellerId = useSessionStore().sellerId
  if (sellerId) {
    headers.set('X-Seller-Id', sellerId)
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!response.ok) {
    const detail = await response.text()
    throw new ApiError(response.status, detail || `HTTP ${response.status}`)
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

/** 403/404 da API: não revelar se o recurso existe (T-17). */
export function isHiddenResourceError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 403 || error.status === 404)
}
