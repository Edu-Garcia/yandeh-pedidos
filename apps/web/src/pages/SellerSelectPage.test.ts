import type { Seller, Supervisor } from '@yandeh/shared'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, nextTick, type App } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/router'
import { useSessionStore } from '@/stores/session'
import SellerSelectPage from './SellerSelectPage.vue'

const fetchSellers = vi.fn()
const fetchSupervisors = vi.fn()

vi.mock('@/api', () => ({
  fetchSellers: (...args: unknown[]) => fetchSellers(...args),
  fetchSupervisors: (...args: unknown[]) => fetchSupervisors(...args),
}))

const sellers: Seller[] = [
  {
    id: 'V01',
    name: 'Carlos Menezes',
    supervisorId: 'S01',
    discountAuthorityPercent: 5,
  },
  {
    id: 'V02',
    name: 'Renata Lima',
    supervisorId: 'S01',
    discountAuthorityPercent: 7,
  },
  {
    id: 'V03',
    name: 'Paulo Andrade',
    supervisorId: 'S01',
    discountAuthorityPercent: 3,
  },
]

const supervisors: Supervisor[] = [{ id: 'S01', name: 'Marta Fernandes' }]

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

function expectNoVisiblePersonIds(text: string | null | undefined): void {
  expect(text, 'a UI não deve mostrar id de cliente (ex.: C001)').not.toMatch(/\bC0\d{2}\b/)
  expect(text, 'a UI não deve mostrar id de vendedor (ex.: V01)').not.toMatch(/\bV0\d\b/)
  expect(text, 'a UI não deve mostrar id de supervisor (ex.: S01)').not.toMatch(/\bS0\d\b/)
}

async function mountPage(): Promise<{
  app: App
  el: HTMLElement
  router: ReturnType<typeof createRouter>
}> {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/')
  await router.isReady()

  const el = document.createElement('div')
  document.body.appendChild(el)
  const app = createApp(SellerSelectPage)
  app.use(pinia)
  app.use(router)
  app.mount(el)
  await nextTick()
  await flush()
  return { app, el, router }
}

describe('SellerSelectPage', () => {
  let mounted: App | null = null
  let host: HTMLElement | null = null

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    fetchSellers.mockReset()
    fetchSupervisors.mockReset()
  })

  afterEach(() => {
    mounted?.unmount()
    mounted = null
    host?.remove()
    host = null
  })

  async function render(): Promise<{
    el: HTMLElement
    router: ReturnType<typeof createRouter>
  }> {
    const { app, el, router } = await mountPage()
    mounted = app
    host = el
    return { el, router }
  }

  it('mostra carregando enquanto a API não responde', async () => {
    fetchSellers.mockReturnValue(new Promise(() => undefined))
    fetchSupervisors.mockReturnValue(new Promise(() => undefined))
    const { el } = await render()
    expect(el.textContent).toContain('Carregando a equipe')
  })

  it('lista vendedores e supervisor só com nome, sem ids visíveis', async () => {
    fetchSellers.mockResolvedValue(sellers)
    fetchSupervisors.mockResolvedValue(supervisors)
    const { el } = await render()

    await waitForText(el, 'Carlos Menezes')
    expect(el.textContent).toContain('Quem é você?')
    expect(el.textContent).toContain('Renata Lima')
    expect(el.textContent).toContain('Paulo Andrade')
    expect(el.textContent).toContain('Marta Fernandes')
    expect(el.textContent).toContain('Desconto até 5%')
    expect(el.textContent).toContain('Desconto até 7%')
    expect(el.textContent).toContain('Desconto até 3%')
    expect(el.textContent).toContain('Aprova pedidos')
    expect(el.textContent).not.toContain('desconto até')
    expectNoVisiblePersonIds(el.textContent)

    expect(el.querySelector('[data-seller-id="V01"]')?.textContent).toContain('Carlos Menezes')
    expect(el.querySelector('[data-seller-id="V01"]')?.textContent).not.toContain('V01')
    expect(el.querySelector('[data-supervisor-id="S01"]')?.textContent).toContain('Marta Fernandes')
    expect(el.querySelector('[data-supervisor-id="S01"]')?.textContent).not.toContain('S01')
  })

  it('entrar como vendedor persiste a sessão e vai para a carteira', async () => {
    fetchSellers.mockResolvedValue(sellers)
    fetchSupervisors.mockResolvedValue(supervisors)
    const { el, router } = await render()
    await waitForText(el, 'Carlos Menezes')

    const row = el.querySelector('[data-seller-id="V01"]')
    row?.querySelector('button')?.click()
    await nextTick()
    await flush()

    expect(useSessionStore().sellerId).toBe('V01')
    expect(router.currentRoute.value.name).toBe('clients')
  })

  it('entrar como supervisor persiste a sessão e vai para aprovações', async () => {
    fetchSellers.mockResolvedValue(sellers)
    fetchSupervisors.mockResolvedValue(supervisors)
    const { el, router } = await render()
    await waitForText(el, 'Marta Fernandes')

    const row = el.querySelector('[data-supervisor-id="S01"]')
    row?.querySelector('button')?.click()
    await nextTick()
    await flush()

    expect(useSessionStore().supervisorId).toBe('S01')
    expect(router.currentRoute.value.name).toBe('approvals')
  })

  it('mostra erro com botão de retry', async () => {
    fetchSellers.mockRejectedValue(new Error('network'))
    fetchSupervisors.mockRejectedValue(new Error('network'))
    const { el } = await render()
    expect(el.textContent).toContain('Não deu para carregar a equipe')

    fetchSellers.mockResolvedValue(sellers)
    fetchSupervisors.mockResolvedValue(supervisors)
    const retry = [...el.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Tentar de novo'),
    )
    retry?.click()
    await waitForText(el, 'Carlos Menezes')
    expectNoVisiblePersonIds(el.textContent)
  })
})
