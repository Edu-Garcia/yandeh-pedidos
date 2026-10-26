import type { CustomerProduct, SellerCustomer } from '@yandeh/shared'
import { formatBRL } from '@yandeh/shared'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, nextTick, type App } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api'
import { PRODUCT_SEARCH_DEBOUNCE_MS } from '@/product-search'
import { routes } from '@/router'
import { useSessionStore } from '@/stores/session'
import OrderPage from './OrderPage.vue'

const fetchSellerCustomers = vi.fn()
const fetchCustomerProducts = vi.fn()

vi.mock('@/api', async () => {
  const actual = await vi.importActual<typeof import('@/api')>('@/api')
  return {
    ...actual,
    fetchSellerCustomers: (...args: unknown[]) => fetchSellerCustomers(...args),
    fetchCustomerProducts: (...args: unknown[]) => fetchCustomerProducts(...args),
  }
})

const carlos = {
  id: 'V01',
  name: 'Carlos Menezes',
  supervisorId: 'S01',
  discountAuthorityPercent: 5,
}

const c001: SellerCustomer = {
  id: 'C001',
  tradeName: 'Mercadinho São José',
  city: 'Fortaleza',
  uf: 'CE',
  priceTableId: 'TP01',
  priceTableName: 'Tabela Padrão',
  isFallback: false,
  availableCredit: 380000,
}

const c004: SellerCustomer = {
  id: 'C004',
  tradeName: 'Mercearia Dona Lúcia',
  city: 'Maracanaú',
  uf: 'CE',
  priceTableId: 'TP01',
  priceTableName: 'Tabela Padrão',
  isFallback: true,
  availableCredit: 300000,
}

const v01Wallet: SellerCustomer[] = [c001, c004]

const p009: CustomerProduct = {
  id: 'P009',
  sku: 'SKU-1008',
  ean: '7891831978575',
  description: 'Achocolatado em Pó 400g',
  category: 'mercearia',
  brand: 'Chocomix',
  saleUnit: 'UN',
  packFactor: 1,
  multipleOnly: false,
  unitPrice: 849,
}

const p023: CustomerProduct = {
  id: 'P023',
  sku: 'SKU-1022',
  ean: '7891831978575',
  description: 'Achocolatado em Pó 400g Sachê',
  category: 'mercearia',
  brand: 'Chocomix',
  saleUnit: 'UN',
  packFactor: 1,
  multipleOnly: false,
  unitPrice: 829,
}

function normalizeBRL(value: string): string {
  return value.replace(/[\u00A0\u202F]/g, ' ')
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

async function waitFor(el: HTMLElement, predicate: (text: string) => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (predicate(el.textContent ?? '')) return
    await nextTick()
    await flush()
  }
  throw new Error(`Condição não satisfeita.\nRecebido: ${el.textContent}`)
}

async function waitForText(el: HTMLElement, snippet: string): Promise<void> {
  await waitFor(el, (text) => text.includes(snippet))
}

async function typeQuery(el: HTMLElement, value: string): Promise<void> {
  const input = el.querySelector('[data-testid="product-search"]') as HTMLInputElement | null
  if (!input) throw new Error('Campo de busca não encontrado')
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
}

async function mountPage(clientId: string): Promise<{ app: App; el: HTMLElement; router: Router }> {
  const pinia = createPinia()
  setActivePinia(pinia)
  useSessionStore().signInSeller(carlos)

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(`/clientes/${clientId}/pedido`)
  await router.isReady()

  const el = document.createElement('div')
  document.body.appendChild(el)
  const app = createApp(OrderPage, { clientId })
  app.use(pinia)
  app.use(router)
  app.mount(el)
  await nextTick()
  await flush()
  return { app, el, router }
}

describe('OrderPage', () => {
  let mounted: App | null = null
  let host: HTMLElement | null = null
  let router: Router | null = null

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    fetchSellerCustomers.mockReset()
    fetchCustomerProducts.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    mounted?.unmount()
    mounted = null
    host?.remove()
    host = null
    router = null
  })

  async function render(clientId = 'C001'): Promise<HTMLElement> {
    const mountedPage = await mountPage(clientId)
    mounted = mountedPage.app
    host = mountedPage.el
    router = mountedPage.router
    return mountedPage.el
  }

  it('mostra carregando o pedido enquanto a carteira não responde', async () => {
    fetchSellerCustomers.mockReturnValue(new Promise(() => undefined))
    const el = await render()
    expect(el.textContent).toContain('Carregando o pedido')
  })

  it('mostra o cliente, a tabela e o aviso de fallback no C004', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const el = await render('C004')
    await waitForText(el, 'Mercearia Dona Lúcia')

    expect(fetchSellerCustomers).toHaveBeenCalledWith('V01')
    expect(el.textContent).toContain('Tabela Padrão')
    expect(el.querySelector('[data-testid="fallback-warning"]')?.textContent).toContain(
      'Cliente sem tabela — usando Tabela Padrão',
    )
  })

  it('não mostra o aviso de fallback no C001', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    expect(el.querySelector('[data-testid="fallback-warning"]')).toBeNull()
    expect(el.textContent).not.toContain('Cliente sem tabela — usando Tabela Padrão')
  })

  it('debounca a busca e só dispara uma requisição depois da pausa', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    fetchCustomerProducts.mockResolvedValue([p009, p023])
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')

    vi.useFakeTimers()
    await typeQuery(el, 'acho')
    await typeQuery(el, 'achocolatado')
    expect(fetchCustomerProducts).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(PRODUCT_SEARCH_DEBOUNCE_MS - 1)
    expect(fetchCustomerProducts).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(fetchCustomerProducts).toHaveBeenCalledTimes(1)
    expect(fetchCustomerProducts).toHaveBeenCalledWith('C001', 'achocolatado')
  })

  it('renderiza P009 e P023 com descrições distintas e preço em BRL', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    fetchCustomerProducts.mockResolvedValue([p009, p023])
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')

    vi.useFakeTimers()
    await typeQuery(el, '7891831978575')
    await vi.advanceTimersByTimeAsync(PRODUCT_SEARCH_DEBOUNCE_MS)
    vi.useRealTimers()
    await waitForText(el, 'Achocolatado em Pó 400g Sachê')

    const p009Row = el.querySelector('[data-product-id="P009"]')
    const p023Row = el.querySelector('[data-product-id="P023"]')
    expect(p009Row?.textContent).toContain('Achocolatado em Pó 400g')
    expect(p009Row?.textContent).toContain('7891831978575')
    expect(p023Row?.textContent).toContain('Achocolatado em Pó 400g Sachê')
    expect(p023Row?.textContent).toContain('7891831978575')
    expect(p009Row?.textContent).not.toContain('Sachê')
    expect(p009Row?.textContent).not.toContain('P009')
    expect(p023Row?.textContent).not.toContain('P023')
    expect(el.textContent).not.toContain('P009')
    expect(el.textContent).not.toContain('P023')
    expect(el.textContent).not.toContain('P021')
    expect(el.textContent).not.toContain('P022')
    expect(normalizeBRL(p009Row?.textContent ?? '')).toContain(normalizeBRL(formatBRL(849)))
    expect(normalizeBRL(p023Row?.textContent ?? '')).toContain(normalizeBRL(formatBRL(829)))
    expect(el.textContent).not.toContain('Adicionar')
  })

  it('mostra estado vazio quando a busca não encontra produto', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    fetchCustomerProducts.mockResolvedValue([])
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')

    vi.useFakeTimers()
    await typeQuery(el, 'xyzinexistente')
    await vi.advanceTimersByTimeAsync(PRODUCT_SEARCH_DEBOUNCE_MS)
    vi.useRealTimers()
    await waitForText(el, 'Nenhum produto com esse nome ou EAN')
    expect(el.querySelector('[data-testid="search-empty"]')).not.toBeNull()
  })

  it('mostra estado de erro da busca e permite tentar de novo', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    fetchCustomerProducts.mockRejectedValue(new Error('network'))
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')

    vi.useFakeTimers()
    await typeQuery(el, 'arroz')
    await vi.advanceTimersByTimeAsync(PRODUCT_SEARCH_DEBOUNCE_MS)
    vi.useRealTimers()
    await waitForText(el, 'Não deu para buscar os produtos')
    expect(el.querySelector('[data-testid="search-error"]')).not.toBeNull()

    fetchCustomerProducts.mockResolvedValue([p009])
    const retry = [...el.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Tentar de novo'),
    )
    retry?.click()
    await waitForText(el, 'Achocolatado em Pó 400g')
  })

  it('mostra o mesmo 404 quando a API da busca responde 403, sem mudar a URL', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    fetchCustomerProducts.mockRejectedValue(new ApiError(403, 'outra carteira'))
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')

    vi.useFakeTimers()
    await typeQuery(el, 'arroz')
    await vi.advanceTimersByTimeAsync(PRODUCT_SEARCH_DEBOUNCE_MS)
    vi.useRealTimers()
    await waitForText(el, 'Página não encontrada')

    expect(el.textContent).toContain('Esse endereço não existe')
    expect(router?.currentRoute.value.path).toBe('/clientes/C001/pedido')
  })

  it('mostra o mesmo 404 quando a API da busca responde 404, sem mudar a URL', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    fetchCustomerProducts.mockRejectedValue(new ApiError(404, 'ausente'))
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')

    vi.useFakeTimers()
    await typeQuery(el, 'arroz')
    await vi.advanceTimersByTimeAsync(PRODUCT_SEARCH_DEBOUNCE_MS)
    vi.useRealTimers()
    await waitForText(el, 'Página não encontrada')
    expect(router?.currentRoute.value.path).toBe('/clientes/C001/pedido')
  })

  it('mostra o mesmo 404 para cliente de outra carteira, sem mudar a URL', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const el = await render('C005')
    await waitForText(el, 'Página não encontrada')

    expect(el.textContent).toContain('Esse endereço não existe')
    expect(el.textContent).not.toContain('Supermercado Família')
    expect(fetchCustomerProducts).not.toHaveBeenCalled()
    expect(router?.currentRoute.value.path).toBe('/clientes/C005/pedido')
  })

  it('mostra o mesmo 404 quando a carteira responde 404', async () => {
    fetchSellerCustomers.mockRejectedValue(new ApiError(404, 'ausente'))
    const el = await render('C099')
    await waitForText(el, 'Página não encontrada')
    expect(router?.currentRoute.value.path).toBe('/clientes/C099/pedido')
  })

  it('mostra erro ao carregar o cliente com botão de retry', async () => {
    fetchSellerCustomers.mockRejectedValue(new Error('network'))
    const el = await render('C001')
    await waitForText(el, 'Não deu para carregar o pedido')

    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const retry = [...el.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Tentar de novo'),
    )
    retry?.click()
    await waitForText(el, 'Mercadinho São José')
  })
})
