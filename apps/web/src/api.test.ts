import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  apiErrorFromBody,
  approveSupervisorOrder,
  createOrder,
  fetchCustomerOrders,
  fetchCustomerProducts,
  fetchPendingSupervisorOrders,
  fetchSellerCustomers,
  isHiddenResourceError,
  rejectSupervisorOrder,
  repeatCustomerOrder,
} from './api'
import { useSessionStore } from './stores/session'

const carlos = {
  id: 'V01',
  name: 'Carlos Menezes',
  supervisorId: 'S01',
  discountAuthorityPercent: 5,
}

describe('fetchSellerCustomers', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
  })

  it('chama GET /sellers/:id/customers com X-Seller-Id da sessão', async () => {
    useSessionStore().signInSeller(carlos)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchSellerCustomers('V01')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:3333/sellers/V01/customers')
    expect(new Headers(init.headers).get('X-Seller-Id')).toBe('V01')
  })
})

describe('fetchCustomerProducts', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
  })

  it('chama GET /customers/:id/products?q= com X-Seller-Id da sessão', async () => {
    useSessionStore().signInSeller(carlos)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchCustomerProducts('C001', 'achocolatado')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:3333/customers/C001/products?q=achocolatado')
    expect(new Headers(init.headers).get('X-Seller-Id')).toBe('V01')
  })
})

describe('isHiddenResourceError', () => {
  it('reconhece 403 e 404 da API', () => {
    expect(isHiddenResourceError(new ApiError(403, 'forbidden'))).toBe(true)
    expect(isHiddenResourceError(new ApiError(404, 'missing'))).toBe(true)
    expect(isHiddenResourceError(new ApiError(500, 'boom'))).toBe(false)
    expect(isHiddenResourceError(new Error('network'))).toBe(false)
  })
})

describe('createOrder', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
  })

  it('POST /orders com X-Seller-Id e Idempotency-Key UUID', async () => {
    useSessionStore().signInSeller(carlos)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'ord-1',
        customerId: 'C001',
        sellerId: 'V01',
        status: 'Enviado',
        totals: { gross: 52196, discount: 266, net: 51930 },
        items: [],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const key = '3d8f1c2a-4b5e-4f70-9c1d-2a3b4c5d6e7f'
    await createOrder(
      {
        customerId: 'C001',
        items: [
          { productId: 'P001', quantity: 10, discountPercent: 0 },
          { productId: 'P006', quantity: 40, discountPercent: 2 },
          { productId: 'P010', quantity: 24, discountPercent: 0 },
        ],
      },
      key,
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:3333/orders')
    expect(init.method).toBe('POST')
    const headers = new Headers(init.headers)
    expect(headers.get('X-Seller-Id')).toBe('V01')
    expect(headers.get('Idempotency-Key')).toBe(key)
    expect(headers.get('Content-Type')).toBe('application/json')
  })
})

describe('fetchCustomerOrders', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
  })

  it('chama GET /customers/:id/orders com X-Seller-Id da sessão', async () => {
    useSessionStore().signInSeller(carlos)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchCustomerOrders('C001')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:3333/customers/C001/orders')
    expect(init.method ?? 'GET').toBe('GET')
    expect(new Headers(init.headers).get('X-Seller-Id')).toBe('V01')
  })
})

describe('repeatCustomerOrder', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
  })

  it('chama POST /customers/:id/orders/:orderId/repeat com X-Seller-Id', async () => {
    useSessionStore().signInSeller(carlos)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lines: [], removed: [], notices: [] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await repeatCustomerOrder('C001', 'PH001')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:3333/customers/C001/orders/PH001/repeat')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('X-Seller-Id')).toBe('V01')
  })
})

const marta = { id: 'S01', name: 'Marta Fernandes' }

describe('fetchPendingSupervisorOrders', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
  })

  it('chama GET /supervisor/orders com status pendente e X-Supervisor-Id', async () => {
    useSessionStore().signInSupervisor(marta)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchPendingSupervisorOrders()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(
      'http://localhost:3333/supervisor/orders?status=Aguardando+aprova%C3%A7%C3%A3o',
    )
    expect(new Headers(init.headers).get('X-Supervisor-Id')).toBe('S01')
    expect(new Headers(init.headers).get('X-Seller-Id')).toBeNull()
  })
})

describe('approveSupervisorOrder e rejectSupervisorOrder', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
  })

  it('POST approve e reject com X-Supervisor-Id da sessão', async () => {
    useSessionStore().signInSupervisor(marta)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'ord-1' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await approveSupervisorOrder('ord-1')
    await rejectSupervisorOrder('ord-2')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [approveUrl, approveInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    const [rejectUrl, rejectInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(approveUrl).toBe('http://localhost:3333/supervisor/orders/ord-1/approve')
    expect(approveInit.method).toBe('POST')
    expect(new Headers(approveInit.headers).get('X-Supervisor-Id')).toBe('S01')
    expect(rejectUrl).toBe('http://localhost:3333/supervisor/orders/ord-2/reject')
    expect(rejectInit.method).toBe('POST')
    expect(new Headers(rejectInit.headers).get('X-Supervisor-Id')).toBe('S01')
  })
})

describe('apiErrorFromBody', () => {
  it('lê 422 com ValidationIssue[] da API', () => {
    const error = apiErrorFromBody(
      422,
      JSON.stringify([
        {
          code: 'BELOW_MINIMUM',
          message: 'Total líquido abaixo de R$ 300,00',
          minimum: 30000,
          net: 2690,
        },
      ]),
    )
    expect(error.status).toBe(422)
    expect(error.message).toContain('Total líquido abaixo de R$ 300,00')
    expect(error.issues).toEqual([
      {
        code: 'BELOW_MINIMUM',
        message: 'Total líquido abaixo de R$ 300,00',
        minimum: 30000,
        net: 2690,
      },
    ])
  })
})
