import type { CustomerProduct, SellerCustomer } from '@yandeh/shared'
import { formatBRL } from '@yandeh/shared'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, nextTick, type App } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api'
import { PRODUCT_SEARCH_DEBOUNCE_MS } from '@/product-search'
import { routes } from '@/router'
import { DISCOUNT_ERROR, QUANTITY_ERROR } from '@/stores/order-draft'
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

const c002: SellerCustomer = {
  id: 'C002',
  tradeName: 'Minibox Bom Preço',
  city: 'Fortaleza',
  uf: 'CE',
  priceTableId: 'TP02',
  priceTableName: 'Tabela Volume',
  isFallback: false,
  availableCredit: 35000,
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

const v01Wallet: SellerCustomer[] = [c001, c002, c004]

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

const p001: CustomerProduct = {
  id: 'P001',
  sku: 'SKU-1000',
  ean: '7891958224128',
  description: 'Arroz Branco Tipo 1 5kg',
  category: 'mercearia',
  brand: 'Grão Fino',
  saleUnit: 'UN',
  packFactor: 1,
  multipleOnly: false,
  unitPrice: 2690,
}

const p001Tp02: CustomerProduct = { ...p001, unitPrice: 2529 }

const p004: CustomerProduct = {
  id: 'P004',
  sku: 'SKU-1003',
  ean: '7891469138105',
  description: 'Óleo de Soja 900ml',
  category: 'mercearia',
  brand: 'Soyara',
  saleUnit: 'CX',
  packFactor: 20,
  multipleOnly: false,
  unitPrice: 719,
}

const p006: CustomerProduct = {
  id: 'P006',
  sku: 'SKU-1005',
  ean: '7891399588384',
  description: 'Macarrão Espaguete 500g',
  category: 'mercearia',
  brand: 'Massa Boa',
  saleUnit: 'FD',
  packFactor: 20,
  multipleOnly: true,
  unitPrice: 333,
}

const p010: CustomerProduct = {
  id: 'P010',
  sku: 'SKU-1009',
  ean: '7891216687320',
  description: 'Leite UHT Integral 1L',
  category: 'bebidas',
  brand: 'Vale Verde',
  saleUnit: 'CX',
  packFactor: 12,
  multipleOnly: true,
  unitPrice: 499,
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

async function searchFor(el: HTMLElement, value: string): Promise<void> {
  vi.useFakeTimers()
  await typeQuery(el, value)
  await vi.advanceTimersByTimeAsync(PRODUCT_SEARCH_DEBOUNCE_MS)
  vi.useRealTimers()
}

function cartLine(el: HTMLElement, productId: string): HTMLElement {
  const row = el.querySelector(`[data-testid="cart-line"][data-product-id="${productId}"]`)
  if (!row) throw new Error(`Linha ${productId} não encontrada no carrinho`)
  return row as HTMLElement
}

function setField(root: HTMLElement, testId: string, value: string): void {
  const input = root.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement | null
  if (!input) throw new Error(`Campo ${testId} não encontrado`)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

function sendButton(el: HTMLElement): HTMLButtonElement {
  const button = el.querySelector('[data-testid="send-order"]') as HTMLButtonElement | null
  if (!button) throw new Error('Botão Enviar não encontrado')
  return button
}

function createdOrder(
  status: 'Enviado' | 'Aguardando aprovação',
  totals = { gross: 52196, discount: 266, net: 51930 },
) {
  return {
    id: 'ord-1',
    customerId: 'C001',
    sellerId: 'V01',
    status,
    totals,
    items: [],
  }
}

async function addExampleC001(el: HTMLElement): Promise<void> {
  await addFromSearch(el, p001)
  setField(cartLine(el, 'P001'), 'cart-units', '10')
  await addFromSearch(el, p006)
  setField(cartLine(el, 'P006'), 'cart-lots', '2')
  setField(cartLine(el, 'P006'), 'cart-discount', '2')
  await addFromSearch(el, p010)
  setField(cartLine(el, 'P010'), 'cart-lots', '2')
  await nextTick()
}

async function addFromSearch(el: HTMLElement, product: CustomerProduct): Promise<void> {
  fetchCustomerProducts.mockResolvedValueOnce([product])
  await searchFor(el, product.description)
  await waitForText(el, product.description)
  const row = el.querySelector(`[data-product-id="${product.id}"]`)
  const add = row?.querySelector('[data-testid="add-product"]') as HTMLButtonElement | null
  if (!add) throw new Error(`Botão adicionar de ${product.id} não encontrado`)
  add.click()
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
    vi.unstubAllGlobals()
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
    expect(p009Row?.textContent).toContain('Adicionar')
    expect(p023Row?.textContent).toContain('Adicionar')
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

  it('adiciona da busca sem mostrar o id do produto', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    await addFromSearch(el, p006)

    const line = cartLine(el, 'P006')
    expect(line.textContent).toContain('Macarrão Espaguete 500g')
    expect(line.textContent).toContain('7891399588384')
    expect(el.textContent).not.toContain('P006')
    expect(el.querySelector('[data-testid="add-product"]')?.textContent).toContain('No carrinho')
  })

  it('P006: Lote 2 FD preenche 40 un e Unidades fica somente leitura', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    await addFromSearch(el, p006)

    const line = cartLine(el, 'P006')
    const units = line.querySelector('[data-testid="cart-units"]') as HTMLInputElement
    expect(units.readOnly).toBe(true)
    expect(line.textContent).toContain('Lote FD')
    expect(line.querySelector('[data-testid="cart-lots"]')).not.toBeNull()

    setField(line, 'cart-lots', '2')
    await nextTick()
    expect((line.querySelector('[data-testid="cart-units"]') as HTMLInputElement).value).toBe('40')
    expect((line.querySelector('[data-testid="cart-lots"]') as HTMLInputElement).value).toBe('2')
    expect(units.readOnly).toBe(true)
    expect(line.querySelector('[data-testid="cart-quantity-error"]')).toBeNull()
    expect(normalizeBRL(line.textContent ?? '')).toContain(normalizeBRL(formatBRL(40 * 333)))
  })

  it('P004: 7 un → Lote vazio; 20 un → 1 CX; Lote 2 → 40 un', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    await addFromSearch(el, p004)

    const line = cartLine(el, 'P004')
    const units = line.querySelector('[data-testid="cart-units"]') as HTMLInputElement
    expect(units.readOnly).toBe(false)
    expect(line.textContent).toContain('Lote CX')

    setField(line, 'cart-units', '7')
    await nextTick()
    expect((line.querySelector('[data-testid="cart-lots"]') as HTMLInputElement).value).toBe('')

    setField(line, 'cart-units', '20')
    await nextTick()
    expect((line.querySelector('[data-testid="cart-lots"]') as HTMLInputElement).value).toBe('1')

    setField(line, 'cart-lots', '2')
    await nextTick()
    expect((line.querySelector('[data-testid="cart-units"]') as HTMLInputElement).value).toBe('40')
    expect((line.querySelector('[data-testid="cart-lots"]') as HTMLInputElement).value).toBe('2')
  })

  it('P010: Lote 2 → 24 un e Unidades somente leitura', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    await addFromSearch(el, p010)

    const line = cartLine(el, 'P010')
    expect((line.querySelector('[data-testid="cart-units"]') as HTMLInputElement).readOnly).toBe(
      true,
    )
    expect(line.textContent).toContain('Lote CX')

    setField(line, 'cart-lots', '2')
    await nextTick()
    expect((line.querySelector('[data-testid="cart-units"]') as HTMLInputElement).value).toBe('24')
    expect((line.querySelector('[data-testid="cart-lots"]') as HTMLInputElement).value).toBe('2')
  })

  it('P001 (UN fator 1) mostra só Unidades', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    await addFromSearch(el, p001)

    const line = cartLine(el, 'P001')
    expect(line.querySelector('[data-testid="cart-units"]')).not.toBeNull()
    expect(line.querySelector('[data-testid="cart-lots"]')).toBeNull()
    expect(line.textContent).not.toContain('Lote')
    expect(el.textContent).not.toContain('P001')
  })

  it('mostra erro inline em quantidade e desconto inválidos', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    await addFromSearch(el, p004)

    const line = cartLine(el, 'P004')
    setField(line, 'cart-units', '')
    await nextTick()
    expect(line.querySelector('[data-testid="cart-quantity-error"]')?.textContent).toBe(
      QUANTITY_ERROR,
    )

    setField(line, 'cart-units', '7')
    setField(line, 'cart-discount', '101')
    await nextTick()
    expect(line.querySelector('[data-testid="cart-discount-error"]')?.textContent).toBe(
      DISCOUNT_ERROR,
    )
  })

  it('remover item atualiza o subtotal', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    await addFromSearch(el, p006)
    await addFromSearch(el, p004)

    const p006Line = cartLine(el, 'P006')
    setField(p006Line, 'cart-lots', '2')
    const p004Line = cartLine(el, 'P004')
    setField(p004Line, 'cart-units', '7')
    await nextTick()

    const both = 40 * 333 + 7 * 719
    expect(
      normalizeBRL(el.querySelector('[data-testid="order-net"]')?.textContent ?? ''),
    ).toContain(normalizeBRL(formatBRL(both)))

    const remove = p004Line.querySelector('[data-testid="remove-line"]') as HTMLButtonElement | null
    remove?.click()
    await nextTick()

    expect(el.querySelector('[data-product-id="P004"][data-testid="cart-line"]')).toBeNull()
    expect(
      normalizeBRL(el.querySelector('[data-testid="order-net"]')?.textContent ?? ''),
    ).toContain(normalizeBRL(formatBRL(40 * 333)))
    expect(sendButton(el).disabled).toBe(true)
    expect(el.textContent).toContain('Total líquido abaixo de R$ 300,00')
    expect(el.textContent).not.toContain('precisará de aprovação')
  })

  it('painel de totais do exemplo C001: R$ 521,96 / R$ 2,66 / R$ 519,30 sem bloqueios', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    await addExampleC001(el)

    expect(
      normalizeBRL(el.querySelector('[data-testid="order-gross"]')?.textContent ?? ''),
    ).toContain(normalizeBRL(formatBRL(52196)))
    expect(
      normalizeBRL(el.querySelector('[data-testid="order-discount"]')?.textContent ?? ''),
    ).toContain(normalizeBRL(formatBRL(266)))
    expect(
      normalizeBRL(el.querySelector('[data-testid="order-net"]')?.textContent ?? ''),
    ).toContain(normalizeBRL(formatBRL(51930)))
    expect(el.querySelector('[data-testid="order-blocks"]')).toBeNull()
    expect(el.querySelector('[data-testid="approval-warning"]')).toBeNull()
    expect(sendButton(el).disabled).toBe(false)
    expect(el.textContent).not.toContain('P001')
    expect(el.textContent).not.toContain('P006')
    expect(el.textContent).not.toContain('P010')
  })

  it('lista bloqueio de crédito em C002 (~R$ 400) e desabilita Enviar', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const el = await render('C002')
    await waitForText(el, 'Minibox Bom Preço')
    await addFromSearch(el, p001Tp02)
    setField(cartLine(el, 'P001'), 'cart-units', '16')
    await nextTick()

    expect(el.querySelector('[data-issue-code="INSUFFICIENT_CREDIT"]')?.textContent).toBe(
      'Total líquido acima do crédito disponível',
    )
    expect(sendButton(el).disabled).toBe(true)
    expect(el.textContent).not.toContain('P001')
  })

  it('lista bloqueio de mínimo e desabilita Enviar', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    await addFromSearch(el, p001)
    await nextTick()

    expect(el.querySelector('[data-issue-code="BELOW_MINIMUM"]')?.textContent).toBe(
      'Total líquido abaixo de R$ 300,00',
    )
    expect(sendButton(el).disabled).toBe(true)
  })

  it('desabilita Enviar quando há erro inline de quantidade', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    await addExampleC001(el)
    expect(sendButton(el).disabled).toBe(false)

    setField(cartLine(el, 'P001'), 'cart-units', '')
    await nextTick()
    expect(el.querySelector('[data-testid="cart-quantity-error"]')).not.toBeNull()
    expect(sendButton(el).disabled).toBe(true)
  })

  it('mostra aviso de alçada com arroz a 6%', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    await addExampleC001(el)
    setField(cartLine(el, 'P001'), 'cart-discount', '6')
    await nextTick()

    expect(el.querySelector('[data-testid="approval-warning"]')?.textContent).toContain(
      'precisará de aprovação',
    )
    expect(sendButton(el).disabled).toBe(false)
    expect(el.querySelector('[data-testid="order-blocks"]')).toBeNull()
  })

  it('envia com Idempotency-Key UUID e reaproveita a chave no retry', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(500, { message: 'falha temporária' }))
      .mockResolvedValueOnce(jsonResponse(201, createdOrder('Enviado')))
    vi.stubGlobal('fetch', fetchMock)

    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    await addExampleC001(el)

    sendButton(el).click()
    await waitForText(el, 'falha temporária')
    expect(el.querySelector('[data-testid="submit-error"]')?.textContent).toContain(
      'falha temporária',
    )
    expect(el.querySelector('[data-testid="order-result"]')).toBeNull()

    sendButton(el).click()
    await waitForText(el, 'Enviado')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const firstHeaders = new Headers((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers)
    const secondHeaders = new Headers((fetchMock.mock.calls[1] as [string, RequestInit])[1].headers)
    const firstKey = firstHeaders.get('Idempotency-Key')
    expect(firstKey).toMatch(UUID_RE)
    expect(secondHeaders.get('Idempotency-Key')).toBe(firstKey)
    expect(firstHeaders.get('X-Seller-Id')).toBe('V01')
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as {
      customerId: string
      items: { productId: string; quantity: number }[]
    }
    expect(body.customerId).toBe('C001')
    expect(body.items).toEqual([
      { productId: 'P001', quantity: 10, discountPercent: 0 },
      { productId: 'P006', quantity: 40, discountPercent: 2 },
      { productId: 'P010', quantity: 24, discountPercent: 0 },
    ])
  })

  it('impede o duplo clique enquanto o envio está em andamento', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    let resolveFetch: ((value: unknown) => void) | undefined
    const fetchMock = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    await addExampleC001(el)

    sendButton(el).click()
    await nextTick()
    sendButton(el).click()
    sendButton(el).click()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sendButton(el).disabled).toBe(true)
    expect(sendButton(el).textContent).toContain('Enviando')

    resolveFetch?.(jsonResponse(201, createdOrder('Enviado')))
    await waitForText(el, 'Enviado')
  })

  it('exibe o 422 da API com a mensagem do PRD', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(422, [
        {
          code: 'BELOW_MINIMUM',
          message: 'Total líquido abaixo de R$ 300,00',
          minimum: 30000,
          net: 51930,
        },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    await addExampleC001(el)

    sendButton(el).click()
    await waitForText(el, 'Total líquido abaixo de R$ 300,00')
    expect(el.querySelector('[data-testid="submit-error"]')?.textContent).toContain(
      'Total líquido abaixo de R$ 300,00',
    )
    expect(el.querySelector('[data-testid="order-result"]')).toBeNull()
    expect(el.querySelector('[data-testid="cart"]')).not.toBeNull()
  })

  it('mostra o resultado Enviado e limpa o rascunho', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(201, createdOrder('Enviado'))))

    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    await addExampleC001(el)
    sendButton(el).click()
    await waitForText(el, 'Enviado')

    const result = el.querySelector('[data-testid="order-result"]')
    expect(result?.getAttribute('data-order-status')).toBe('Enviado')
    expect(result?.textContent).toContain('O pedido foi enviado.')
    expect(el.querySelector('[data-testid="cart"]')).toBeNull()
    expect(el.querySelector('[data-testid="order-totals"]')).toBeNull()
    expect(el.textContent).not.toContain('P001')
    expect(normalizeBRL(result?.textContent ?? '')).toContain(normalizeBRL(formatBRL(51930)))

    const newOrder = el.querySelector('[data-testid="new-order"]') as HTMLButtonElement
    newOrder.click()
    await nextTick()
    expect(el.querySelector('[data-testid="order-result"]')).toBeNull()
    expect(el.querySelector('[data-testid="cart-empty"]')).not.toBeNull()
  })

  it('mostra o resultado Aguardando aprovação com o aviso de alçada', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            201,
            createdOrder('Aguardando aprovação', { gross: 52196, discount: 1880, net: 50316 }),
          ),
        ),
    )

    const el = await render('C001')
    await waitForText(el, 'Mercadinho São José')
    await addExampleC001(el)
    setField(cartLine(el, 'P001'), 'cart-discount', '6')
    await nextTick()
    expect(el.querySelector('[data-testid="approval-warning"]')?.textContent).toContain(
      'precisará de aprovação',
    )

    sendButton(el).click()
    await waitForText(el, 'Aguardando aprovação')

    const result = el.querySelector('[data-testid="order-result"]')
    expect(result?.getAttribute('data-order-status')).toBe('Aguardando aprovação')
    expect(result?.textContent).toContain('precisará de aprovação')
    expect(el.querySelector('[data-testid="cart"]')).toBeNull()
    expect(el.textContent).not.toContain('P001')
  })
})
