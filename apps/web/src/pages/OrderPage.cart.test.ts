import type { CustomerProduct, SellerCustomer } from '@yandeh/shared'
import { formatBRL } from '@yandeh/shared'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { DRAFT_LOCKED_MESSAGE } from '@/submit-retry'
import { routes } from '@/router'
import {
  DRAFT_STORAGE_KEY,
  useOrderDraftStore,
  type PersistedOrderDraft,
} from '@/stores/order-draft'
import { useSessionStore } from '@/stores/session'
import OrderPage from './OrderPage.vue'

const fetchSellerCustomers = vi.fn()
const fetchCustomerProducts = vi.fn()
const fetchCustomerOrders = vi.fn()
const repeatCustomerOrder = vi.fn()

vi.mock('@/api', async () => {
  const actual = await vi.importActual<typeof import('@/api')>('@/api')
  return {
    ...actual,
    fetchSellerCustomers: (...args: unknown[]) => fetchSellerCustomers(...args),
    fetchCustomerProducts: (...args: unknown[]) => fetchCustomerProducts(...args),
    fetchCustomerOrders: (...args: unknown[]) => fetchCustomerOrders(...args),
    repeatCustomerOrder: (...args: unknown[]) => repeatCustomerOrder(...args),
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

const v01Wallet: SellerCustomer[] = [c001, c002]

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

function persistedDraft(customerId: string): PersistedOrderDraft | undefined {
  const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
  if (!raw) return undefined
  return (JSON.parse(raw) as Record<string, PersistedOrderDraft>)[customerId]
}

function seedExampleC001(): void {
  const draft = useOrderDraftStore()
  draft.addProduct('C001', p001)
  draft.setUnits('C001', 'P001', '10')
  draft.addProduct('C001', p006)
  draft.setLots('C001', 'P006', '2')
  draft.setDiscount('C001', 'P006', '2')
  draft.addProduct('C001', p010)
  draft.setLots('C001', 'P010', '2')
}

describe('OrderPage — carrinho', () => {
  let pinia: Pinia
  let wrapper: VueWrapper | null

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    fetchSellerCustomers.mockReset()
    fetchCustomerProducts.mockReset()
    fetchCustomerOrders.mockReset()
    repeatCustomerOrder.mockReset()
    fetchCustomerOrders.mockResolvedValue([])
    fetchSellerCustomers.mockResolvedValue(v01Wallet)
    pinia = createPinia()
    setActivePinia(pinia)
    wrapper = null
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    })
  })

  async function render(clientId: string, seed?: () => void): Promise<VueWrapper> {
    useSessionStore().signInSeller(carlos)
    seed?.()

    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push(`/clientes/${clientId}/pedido`)
    await router.isReady()

    wrapper = mount(OrderPage, {
      props: { clientId },
      global: { plugins: [pinia, router] },
    })
    await flushPromises()
    return wrapper
  }

  it('exibe bruto, desconto e líquido do exemplo C001 (R$ 521,96 / R$ 2,66 / R$ 519,30)', async () => {
    const page = await render('C001', seedExampleC001)

    expect(page.text()).toContain('Mercadinho São José')
    expect(normalizeBRL(page.get('[data-testid="order-gross"]').text())).toContain(
      normalizeBRL(formatBRL(52196)),
    )
    expect(normalizeBRL(page.get('[data-testid="order-discount"]').text())).toContain(
      normalizeBRL(formatBRL(266)),
    )
    expect(normalizeBRL(page.get('[data-testid="order-net"]').text())).toContain(
      normalizeBRL(formatBRL(51930)),
    )
    expect(page.find('[data-testid="order-blocks"]').exists()).toBe(false)
    expect(page.find('[data-testid="approval-warning"]').exists()).toBe(false)
    expect((page.get('[data-testid="send-order"]').element as HTMLButtonElement).disabled).toBe(
      false,
    )
    expect(page.text()).not.toContain('P001')
    expect(page.text()).not.toContain('P006')
    expect(page.text()).not.toContain('P010')
    expect(page.text()).not.toContain('P009')
  })

  it('bloqueia Enviar abaixo do mínimo e mostra a mensagem', async () => {
    const page = await render('C001', () => {
      useOrderDraftStore().addProduct('C001', p001)
    })

    expect(page.get('[data-issue-code="BELOW_MINIMUM"]').text()).toBe(
      'Total líquido abaixo de R$ 300,00',
    )
    expect((page.get('[data-testid="send-order"]').element as HTMLButtonElement).disabled).toBe(
      true,
    )
    expect(page.text()).not.toContain('P001')
  })

  it('bloqueia Enviar por crédito insuficiente e mostra a mensagem', async () => {
    const page = await render('C002', () => {
      const draft = useOrderDraftStore()
      draft.addProduct('C002', p001Tp02)
      draft.setUnits('C002', 'P001', '16')
    })

    expect(page.get('[data-issue-code="INSUFFICIENT_CREDIT"]').text()).toBe(
      'Total líquido acima do crédito disponível',
    )
    expect((page.get('[data-testid="send-order"]').element as HTMLButtonElement).disabled).toBe(
      true,
    )
    expect(page.text()).not.toContain('P001')
  })

  it('mostra aviso de aprovação quando o desconto passa da alçada', async () => {
    const page = await render('C001', () => {
      seedExampleC001()
      useOrderDraftStore().setDiscount('C001', 'P001', '6')
    })

    expect(page.get('[data-testid="approval-warning"]').text()).toContain(
      'Este pedido precisará de aprovação.',
    )
    expect(page.find('[data-testid="order-blocks"]').exists()).toBe(false)
    expect((page.get('[data-testid="send-order"]').element as HTMLButtonElement).disabled).toBe(
      false,
    )
  })

  it('remover o último item esvazia o carrinho e limpa o rascunho', async () => {
    const page = await render('C001', () => {
      useOrderDraftStore().addProduct('C001', p001)
    })

    expect(page.find('[data-testid="cart-empty"]').exists()).toBe(false)
    expect(page.get('[data-testid="draft-saved"]').text()).toContain('Rascunho salvo')
    expect(persistedDraft('C001')?.lines).toHaveLength(1)

    await page.get('[data-testid="remove-line"]').trigger('click')

    expect(page.get('[data-testid="cart-empty"]').text()).toContain('Nenhum item no pedido.')
    expect(page.find('[data-testid="cart-line"]').exists()).toBe(false)
    expect(page.find('[data-testid="draft-saved"]').exists()).toBe(false)
    expect(persistedDraft('C001')).toBeUndefined()
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
    expect(useOrderDraftStore().hasDraft('C001')).toBe(false)
  })

  it('com envio pendente, trava a edição e mostra a mensagem de rascunho travado', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    })

    const page = await render('C001', () => {
      seedExampleC001()
      useOrderDraftStore().markSubmitPending('C001')
    })

    expect(page.get('[data-testid="draft-locked"]').text()).toContain(DRAFT_LOCKED_MESSAGE)
    expect(page.get('[data-testid="submit-pending"]').text()).toContain(DRAFT_LOCKED_MESSAGE)
    expect(page.text()).toContain('Este pedido está aguardando envio e não pode ser editado.')

    const rice = page.get('[data-testid="cart-line"][data-product-id="P001"]')
    const pasta = page.get('[data-testid="cart-line"][data-product-id="P006"]')
    expect((rice.get('[data-testid="cart-units"]').element as HTMLInputElement).disabled).toBe(true)
    expect((pasta.get('[data-testid="cart-lots"]').element as HTMLInputElement).disabled).toBe(true)
    expect((rice.get('[data-testid="cart-discount"]').element as HTMLInputElement).disabled).toBe(
      true,
    )
    expect((rice.get('[data-testid="remove-line"]').element as HTMLButtonElement).disabled).toBe(
      true,
    )

    await rice.get('[data-testid="cart-units"]').setValue('99')
    await pasta.get('[data-testid="cart-lots"]').setValue('9')
    await rice.get('[data-testid="remove-line"]').trigger('click')

    expect(useOrderDraftStore().linesOf('C001')).toHaveLength(3)
    expect(useOrderDraftStore().linesOf('C001')[0]?.quantityUnits).toBe(10)
    expect(useOrderDraftStore().linesOf('C001')[1]?.quantityUnits).toBe(40)
    expect(page.text()).not.toContain('P001')
    expect(page.text()).not.toContain('P006')
    expect(page.text()).not.toContain('P010')
  })
})
