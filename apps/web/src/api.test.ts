import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchSellerCustomers } from './api'
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
