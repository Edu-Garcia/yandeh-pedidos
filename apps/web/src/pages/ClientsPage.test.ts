import type { SellerCustomer } from '@yandeh/shared'
import { formatBRL } from '@yandeh/shared'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, nextTick, type App } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/router'
import { useSessionStore } from '@/stores/session'
import ClientsPage from './ClientsPage.vue'

const fetchSellerCustomers = vi.fn()

vi.mock('@/api', () => ({
  fetchSellerCustomers: (...args: unknown[]) => fetchSellerCustomers(...args),
}))

const carlos = {
  id: 'V01',
  name: 'Carlos Menezes',
  supervisorId: 'S01',
  discountAuthorityPercent: 5,
}

const v01Wallet: SellerCustomer[] = [
  {
    id: 'C001',
    tradeName: 'Mercadinho São José',
    city: 'Fortaleza',
    uf: 'CE',
    priceTableId: 'TP01',
    priceTableName: 'Tabela Padrão',
    isFallback: false,
    availableCredit: 380000,
  },
  {
    id: 'C002',
    tradeName: 'Minibox Bom Preço',
    city: 'Fortaleza',
    uf: 'CE',
    priceTableId: 'TP02',
    priceTableName: 'Tabela Volume',
    isFallback: false,
    availableCredit: 35000,
  },
  {
    id: 'C003',
    tradeName: 'Conveniência Esquina',
    city: 'Caucaia',
    uf: 'CE',
    priceTableId: 'TP01',
    priceTableName: 'Tabela Padrão',
    isFallback: false,
    availableCredit: 250000,
  },
  {
    id: 'C004',
    tradeName: 'Mercearia Dona Lúcia',
    city: 'Maracanaú',
    uf: 'CE',
    priceTableId: 'TP01',
    priceTableName: 'Tabela Padrão',
    isFallback: true,
    availableCredit: 300000,
  },
]

const v02Wallet: SellerCustomer[] = [
  {
    id: 'C006',
    tradeName: 'Mercadinho Central',
    city: 'Mossoró',
    uf: 'RN',
    priceTableId: 'TP03',
    priceTableName: 'Tabela Interior',
    isFallback: false,
    availableCredit: 10000,
  },
]

function normalizeBRL(value: string): string {
  return value.replace(/[\u00A0\u202F]/g, ' ')
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

async function waitForText(el: HTMLElement, snippet: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (el.textContent?.includes(snippet)) return
    await nextTick()
    await flush()
  }
  throw new Error(`Texto não apareceu: ${snippet}\nRecebido: ${el.textContent}`)
}

async function mountPage(): Promise<{ app: App; el: HTMLElement }> {
  const pinia = createPinia()
  setActivePinia(pinia)
  useSessionStore().signInSeller(carlos)

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/clientes')
  await router.isReady()

  const el = document.createElement('div')
  document.body.appendChild(el)
  const app = createApp(ClientsPage)
  app.use(pinia)
  app.use(router)
  app.mount(el)
  await nextTick()
  await flush()
  return { app, el }
}

describe('ClientsPage', () => {
  let mounted: App | null = null
  let host: HTMLElement | null = null

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    fetchSellerCustomers.mockReset()
  })

  afterEach(() => {
    mounted?.unmount()
    mounted = null
    host?.remove()
    host = null
  })

  async function render(): Promise<HTMLElement> {
    const { app, el } = await mountPage()
    mounted = app
    host = el
    return el
  }

  it('mostra carregando enquanto a API não responde', async () => {
    fetchSellerCustomers.mockReturnValue(new Promise(() => undefined))
    const el = await render()
    expect(el.textContent).toContain('Carregando a carteira')
  })

  it('lista a carteira de V01 com cidade/UF, tabela, badge e crédito em BRL', async () => {
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const el = await render()

    expect(fetchSellerCustomers).toHaveBeenCalledWith('V01')
    expect(el.textContent).toContain('Minha carteira')
    expect(el.textContent).toContain('Mercadinho São José')
    expect(el.textContent).toContain('Fortaleza/CE')
    expect(el.textContent).toContain('Conveniência Esquina')
    expect(el.textContent).toContain('Caucaia/CE')
    expect(el.textContent).toContain('Mercearia Dona Lúcia')
    expect(el.textContent).toContain('Maracanaú/CE')
    expect(el.textContent).toContain('Tabela Padrão')
    expect(el.textContent).toContain('Tabela Volume')
    expect(el.textContent).not.toContain('Tabela TP01')
    expect(el.textContent).not.toContain('Tabela TP02')
    expect(el.textContent).toContain('Padrão (fallback)')
    expect(normalizeBRL(el.textContent ?? '')).toContain(normalizeBRL(formatBRL(380000)))
    expect(normalizeBRL(el.textContent ?? '')).toContain(normalizeBRL(formatBRL(35000)))

    const fallbackRow = el.querySelector('[data-customer-id="C004"]')
    expect(fallbackRow?.textContent).toContain('Padrão (fallback)')
    expect(el.querySelector('[data-customer-id="C001"]')?.textContent).not.toContain(
      'Padrão (fallback)',
    )
  })

  it('destaca cliente com crédito abaixo do mínimo e navega para o pedido', async () => {
    fetchSellerCustomers.mockResolvedValue(v02Wallet)
    const el = await render()

    const row = el.querySelector('[data-customer-id="C006"]')
    expect(row?.getAttribute('data-below-minimum')).toBe('true')
    expect(row?.textContent).toContain('Mercadinho Central')
    expect(row?.textContent).toContain('Mossoró/RN')
    expect(row?.textContent).toContain('Tabela Interior')
    expect(row?.textContent).toContain('Crédito abaixo do mínimo')
    expect(normalizeBRL(row?.textContent ?? '')).toContain(normalizeBRL(formatBRL(10000)))

    const link = row?.querySelector('a')
    expect(link?.getAttribute('href')).toBe('/clientes/C006/pedido')
  })

  it('mostra erro com botão de retry', async () => {
    fetchSellerCustomers.mockRejectedValue(new Error('network'))
    const el = await render()
    expect(el.textContent).toContain('Não deu para carregar a carteira')

    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    const retry = [...el.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Tentar de novo'),
    )
    retry?.click()
    await waitForText(el, 'Mercadinho São José')
  })

  it('mostra estado vazio quando a carteira não tem clientes', async () => {
    fetchSellerCustomers.mockResolvedValue([])
    const el = await render()
    expect(el.textContent).toContain('Nenhum cliente nesta carteira')
  })
})
