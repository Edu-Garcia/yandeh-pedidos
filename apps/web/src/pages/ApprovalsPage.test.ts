import { formatBRL } from '@yandeh/shared'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, nextTick, type App } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, type SupervisorOrder } from '@/api'
import { formatDiscountVsAuthority } from '@/approvals'
import AppShell from '@/App.vue'
import { formatCivilDate } from '@/order-history'
import { NOT_FOUND_NAME, registerSessionGuard, routes } from '@/router'
import { useSessionStore } from '@/stores/session'
import ApprovalsPage from './ApprovalsPage.vue'

const fetchPendingSupervisorOrders = vi.fn()
const approveSupervisorOrder = vi.fn()
const rejectSupervisorOrder = vi.fn()

vi.mock('@/api', async () => {
  const actual = await vi.importActual<typeof import('@/api')>('@/api')
  return {
    ...actual,
    fetchPendingSupervisorOrders: (...args: unknown[]) => fetchPendingSupervisorOrders(...args),
    approveSupervisorOrder: (...args: unknown[]) => approveSupervisorOrder(...args),
    rejectSupervisorOrder: (...args: unknown[]) => rejectSupervisorOrder(...args),
  }
})

const carlos = {
  id: 'V01',
  name: 'Carlos Menezes',
  supervisorId: 'S01',
  discountAuthorityPercent: 5,
}

const marta = { id: 'S01', name: 'Marta Fernandes' }

const pendingC002: SupervisorOrder = {
  id: 'ord-c002',
  date: '2026-10-27',
  status: 'Aguardando aprovação',
  total: 32000,
  maxDiscount: 6,
  customer: { id: 'C002', tradeName: 'Minibox Bom Preço' },
  seller: { id: 'V01', name: 'Carlos Menezes', discountAuthorityPercent: 5 },
}

const pendingC001: SupervisorOrder = {
  id: 'ord-c001',
  date: '2026-10-26',
  status: 'Aguardando aprovação',
  total: 50316,
  maxDiscount: 6,
  customer: { id: 'C001', tradeName: 'Mercadinho São José' },
  seller: { id: 'V01', name: 'Carlos Menezes', discountAuthorityPercent: 5 },
}

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

async function waitUntil(predicate: () => boolean, label: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (predicate()) return
    await nextTick()
    await flush()
  }
  throw new Error(label)
}

async function mountApprovals(): Promise<{ app: App; el: HTMLElement }> {
  const pinia = createPinia()
  setActivePinia(pinia)
  useSessionStore().signInSupervisor(marta)

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/supervisor')
  await router.isReady()

  const el = document.createElement('div')
  document.body.appendChild(el)
  const app = createApp(ApprovalsPage)
  app.use(pinia)
  app.use(router)
  app.mount(el)
  await nextTick()
  await flush()
  return { app, el }
}

describe('ApprovalsPage', () => {
  let mounted: App | null = null
  let host: HTMLElement | null = null

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    fetchPendingSupervisorOrders.mockReset()
    approveSupervisorOrder.mockReset()
    rejectSupervisorOrder.mockReset()
  })

  afterEach(() => {
    mounted?.unmount()
    mounted = null
    host?.remove()
    host = null
  })

  async function render(): Promise<HTMLElement> {
    const { app, el } = await mountApprovals()
    mounted = app
    host = el
    return el
  }

  it('lista pendentes com vendedor, cliente, maior desconto vs alçada e total', async () => {
    fetchPendingSupervisorOrders.mockResolvedValue([pendingC002, pendingC001])
    const el = await render()

    expect(el.textContent).toContain('Aprovações')
    expect(el.textContent).toContain('Minibox Bom Preço')
    expect(el.textContent).toContain('Mercadinho São José')
    expect(el.textContent).toContain('Carlos Menezes')
    expect(el.textContent).toContain(formatCivilDate('2026-10-27'))
    expect(el.textContent).toContain(formatDiscountVsAuthority(6, 5))
    expect(normalizeBRL(el.textContent ?? '')).toContain(normalizeBRL(formatBRL(32000)))
    expect(normalizeBRL(el.textContent ?? '')).toContain(normalizeBRL(formatBRL(50316)))
    expect(el.textContent).not.toContain('P001')
    expect(el.textContent).not.toContain('P008')

    const row = el.querySelector('[data-order-id="ord-c002"]')
    expect(row?.querySelector('[data-testid="discount-vs-authority"]')?.textContent).toContain(
      'Maior desconto 6% · alçada 5%',
    )
  })

  it('tocar em Aprovar ou Rejeitar não chama a API e mostra a confirmação', async () => {
    fetchPendingSupervisorOrders.mockResolvedValue([pendingC002, pendingC001])
    const el = await render()

    const row = el.querySelector('[data-order-id="ord-c002"]')
    row?.querySelector<HTMLButtonElement>('[data-testid="approve-order"]')?.click()
    await nextTick()

    const confirm = row?.querySelector('[data-testid="decision-confirm"]')
    expect(confirm?.textContent).toContain('Aprovar o pedido de Minibox Bom Preço')
    expect(normalizeBRL(confirm?.textContent ?? '')).toContain(normalizeBRL(formatBRL(32000)))
    expect(approveSupervisorOrder).not.toHaveBeenCalled()
    expect(rejectSupervisorOrder).not.toHaveBeenCalled()
    expect(
      el.querySelector('[data-order-id="ord-c001"] [data-testid="decision-confirm"]'),
    ).toBeNull()

    el.querySelector('[data-order-id="ord-c001"]')
      ?.querySelector<HTMLButtonElement>('[data-testid="reject-order"]')
      ?.click()
    await nextTick()

    const rejectConfirm = el.querySelector(
      '[data-order-id="ord-c001"] [data-testid="decision-confirm"]',
    )
    expect(rejectConfirm?.textContent).toContain('Rejeitar o pedido de Mercadinho São José')
    expect(normalizeBRL(rejectConfirm?.textContent ?? '')).toContain(normalizeBRL(formatBRL(50316)))
    expect(
      el.querySelector('[data-order-id="ord-c002"] [data-testid="decision-confirm"]'),
    ).toBeNull()
    expect(approveSupervisorOrder).not.toHaveBeenCalled()
    expect(rejectSupervisorOrder).not.toHaveBeenCalled()
  })

  it('cancelar a confirmação não chama a API e volta ao estado normal', async () => {
    fetchPendingSupervisorOrders.mockResolvedValue([pendingC002])
    const el = await render()

    el.querySelector<HTMLButtonElement>('[data-testid="approve-order"]')?.click()
    await nextTick()
    expect(el.querySelector('[data-testid="decision-confirm"]')).not.toBeNull()

    el.querySelector<HTMLButtonElement>('[data-testid="decision-cancel"]')?.click()
    await nextTick()

    expect(el.querySelector('[data-testid="decision-confirm"]')).toBeNull()
    expect(el.querySelector('[data-order-id="ord-c002"]')).not.toBeNull()
    expect(el.querySelector('[data-testid="approve-order"]')).not.toBeNull()
    expect(approveSupervisorOrder).not.toHaveBeenCalled()
    expect(rejectSupervisorOrder).not.toHaveBeenCalled()
  })

  it('confirmar Aprovar chama a API e remove o item da lista', async () => {
    fetchPendingSupervisorOrders.mockResolvedValue([pendingC002, pendingC001])
    approveSupervisorOrder.mockResolvedValue({ ...pendingC002, status: 'Aprovado' })
    const el = await render()

    const row = el.querySelector('[data-order-id="ord-c002"]')
    row?.querySelector<HTMLButtonElement>('[data-testid="approve-order"]')?.click()
    await nextTick()
    expect(approveSupervisorOrder).not.toHaveBeenCalled()

    row?.querySelector<HTMLButtonElement>('[data-testid="decision-accept"]')?.click()
    await waitUntil(() => el.querySelector('[data-order-id="ord-c002"]') === null, 'item aprovado')

    expect(approveSupervisorOrder).toHaveBeenCalledTimes(1)
    expect(approveSupervisorOrder).toHaveBeenCalledWith('ord-c002')
    expect(rejectSupervisorOrder).not.toHaveBeenCalled()
    expect(el.querySelector('[data-order-id="ord-c001"]')).not.toBeNull()
    expect(el.textContent).toContain('Mercadinho São José')
    expect(el.textContent).not.toContain('Minibox Bom Preço')
  })

  it('confirmar Rejeitar chama a API e remove o item da lista', async () => {
    fetchPendingSupervisorOrders.mockResolvedValue([pendingC002, pendingC001])
    rejectSupervisorOrder.mockResolvedValue({ ...pendingC001, status: 'Rejeitado' })
    const el = await render()

    const row = el.querySelector('[data-order-id="ord-c001"]')
    row?.querySelector<HTMLButtonElement>('[data-testid="reject-order"]')?.click()
    await nextTick()
    expect(rejectSupervisorOrder).not.toHaveBeenCalled()

    row?.querySelector<HTMLButtonElement>('[data-testid="decision-accept"]')?.click()
    await waitUntil(() => el.querySelector('[data-order-id="ord-c001"]') === null, 'item rejeitado')

    expect(rejectSupervisorOrder).toHaveBeenCalledTimes(1)
    expect(rejectSupervisorOrder).toHaveBeenCalledWith('ord-c001')
    expect(approveSupervisorOrder).not.toHaveBeenCalled()
    expect(el.querySelector('[data-order-id="ord-c002"]')).not.toBeNull()
    expect(el.textContent).not.toContain('Mercadinho São José')
  })

  it('mostra o erro de crédito do 422 após confirmar e mantém o item', async () => {
    fetchPendingSupervisorOrders.mockResolvedValue([pendingC002])
    approveSupervisorOrder.mockRejectedValue(
      new ApiError(422, 'Total líquido acima do crédito disponível', [
        {
          code: 'INSUFFICIENT_CREDIT',
          message: 'Total líquido acima do crédito disponível',
          available: 31000,
          net: 32000,
        },
      ]),
    )
    const el = await render()

    el.querySelector<HTMLButtonElement>('[data-testid="approve-order"]')?.click()
    await nextTick()
    expect(approveSupervisorOrder).not.toHaveBeenCalled()

    el.querySelector<HTMLButtonElement>('[data-testid="decision-accept"]')?.click()
    await waitForText(el, 'Total líquido acima do crédito disponível')

    expect(approveSupervisorOrder).toHaveBeenCalledTimes(1)
    expect(el.querySelector('[data-order-id="ord-c002"]')).not.toBeNull()
    expect(el.querySelector('[data-testid="decision-confirm"]')).toBeNull()
    expect(el.querySelector('[data-testid="decision-error"]')?.textContent).toContain(
      'Total líquido acima do crédito disponível',
    )
    expect(el.textContent).toContain('Minibox Bom Preço')
  })
})

describe('rota /supervisor com vendedor', () => {
  let mounted: App | null = null
  let host: HTMLElement | null = null

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    fetchPendingSupervisorOrders.mockReset()
  })

  afterEach(() => {
    mounted?.unmount()
    mounted = null
    host?.remove()
    host = null
  })

  it('mostra o mesmo NotFound e mantém a URL', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useSessionStore().signInSeller(carlos)

    const router = createRouter({ history: createMemoryHistory(), routes })
    registerSessionGuard(router)
    await router.push('/supervisor')
    await router.isReady()

    const el = document.createElement('div')
    document.body.appendChild(el)
    const app = createApp(AppShell)
    app.use(pinia)
    app.use(router)
    app.mount(el)
    mounted = app
    host = el
    await nextTick()
    await flush()

    expect(router.currentRoute.value.name).toBe(NOT_FOUND_NAME)
    expect(router.currentRoute.value.path).toBe('/supervisor')
    expect(el.textContent).toContain('Página não encontrada')
    expect(el.textContent).toContain('Esse endereço não existe.')
    expect(el.textContent).not.toContain('Aprovações')
    expect(fetchPendingSupervisorOrders).not.toHaveBeenCalled()
  })
})
