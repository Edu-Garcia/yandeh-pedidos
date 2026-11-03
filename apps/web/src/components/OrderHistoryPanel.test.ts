import { formatBRL, lineTotals, orderTotals } from '@yandeh/shared'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import type { CustomerOrderDetail } from '@/api'
import OrderHistoryPanel from './OrderHistoryPanel.vue'

function normalizeBRL(value: string): string {
  return value.replace(/[\u00A0\u202F]/g, ' ')
}

const ph001: CustomerOrderDetail = {
  id: 'PH001',
  date: '2026-09-15',
  status: 'Faturado',
  totals: orderTotals([
    { productId: 'P001', quantityUnits: 10, unitPrice: 2590, discountPercent: 0 },
    { productId: 'P006', quantityUnits: 40, unitPrice: 329, discountPercent: 2 },
    { productId: 'P010', quantityUnits: 24, unitPrice: 489, discountPercent: 0 },
    { productId: 'P022', quantityUnits: 30, unitPrice: 259, discountPercent: 0 },
  ]),
  items: [
    {
      productId: 'P001',
      description: 'Arroz Branco Tipo 1 5kg',
      ean: '7891958224128',
      quantity: 10,
      unitPrice: 2590,
      discountPercent: 0,
      totals: lineTotals({
        productId: 'P001',
        quantityUnits: 10,
        unitPrice: 2590,
        discountPercent: 0,
      }),
    },
    {
      productId: 'P006',
      description: 'Macarrão Espaguete 500g',
      ean: '7891399588384',
      quantity: 40,
      unitPrice: 329,
      discountPercent: 2,
      totals: lineTotals({
        productId: 'P006',
        quantityUnits: 40,
        unitPrice: 329,
        discountPercent: 2,
      }),
    },
    {
      productId: 'P010',
      description: 'Leite UHT Integral 1L',
      ean: '7891216687320',
      quantity: 24,
      unitPrice: 489,
      discountPercent: 0,
      totals: lineTotals({
        productId: 'P010',
        quantityUnits: 24,
        unitPrice: 489,
        discountPercent: 0,
      }),
    },
    {
      productId: 'P022',
      description: 'Biscoito Recheado Chocolate 140g',
      ean: '7891366875370',
      quantity: 30,
      unitPrice: 259,
      discountPercent: 0,
      totals: lineTotals({
        productId: 'P022',
        quantityUnits: 30,
        unitPrice: 259,
        discountPercent: 0,
      }),
    },
  ],
}

describe('OrderHistoryPanel', () => {
  let wrapper: VueWrapper | null = null

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  function render(
    props: Partial<{
      open: boolean
      date: string
      status: string
      order: CustomerOrderDetail | null
      loading: boolean
      error: string | null
      canRepeat: boolean
    }> = {},
  ): VueWrapper {
    wrapper = mount(OrderHistoryPanel, {
      props: {
        open: true,
        date: '2026-09-15',
        status: 'Faturado',
        order: ph001,
        loading: false,
        error: null,
        canRepeat: true,
        ...props,
      },
      attachTo: document.body,
    })
    return wrapper
  }

  it('abre o painel com itens e totais congelados do PH001, sem id visível', async () => {
    const page = render()
    await flushPromises()

    const dialog = page.get('[data-testid="order-history-panel"]')
    expect(dialog.attributes('role')).toBe('dialog')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.attributes('aria-labelledby')).toBe('order-history-title')
    expect(page.get('[data-testid="order-history-title"]').text()).toBe('15/09/2026')
    expect(page.get('[data-testid="order-history-status"]').text()).toBe('Faturado')

    const items = page.findAll('[data-testid="order-history-item"]')
    expect(items).toHaveLength(4)
    expect(items[0]?.text()).toContain('Arroz Branco Tipo 1 5kg')
    expect(items[0]?.text()).toContain('7891958224128')
    expect(items[0]?.get('[data-testid="order-history-item-qty"]').text()).toBe('10 un')
    expect(normalizeBRL(items[0]?.text() ?? '')).toContain(normalizeBRL(formatBRL(2590)))
    expect(items[1]?.text()).toContain('Macarrão Espaguete 500g')
    expect(items[1]?.get('[data-testid="order-history-item-discount"]').text()).toBe('2%')
    expect(normalizeBRL(items[1]?.text() ?? '')).toContain(normalizeBRL(formatBRL(12897)))
    expect(items[3]?.text()).toContain('Biscoito Recheado Chocolate 140g')

    expect(normalizeBRL(page.get('[data-testid="order-history-gross"]').text())).toContain(
      normalizeBRL(formatBRL(58566)),
    )
    expect(normalizeBRL(page.get('[data-testid="order-history-discount"]').text())).toContain(
      normalizeBRL(formatBRL(263)),
    )
    expect(normalizeBRL(page.get('[data-testid="order-history-net"]').text())).toContain(
      normalizeBRL(formatBRL(58303)),
    )

    expect(page.text()).not.toContain('PH001')
    expect(page.text()).not.toContain('P001')
    expect(page.text()).not.toContain('P006')
    expect(page.text()).not.toContain('P010')
    expect(page.text()).not.toContain('P022')
    expect(page.text()).not.toMatch(/\bC0\d{2}\b/)
    expect(page.text()).not.toMatch(/\bV0\d\b/)
  })

  it('fecha com Esc', async () => {
    const page = render()
    await flushPromises()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(page.emitted('close')).toHaveLength(1)
  })

  it('mostra erro e permite tentar de novo', async () => {
    const page = render({
      order: null,
      error: 'Não deu para carregar o pedido. Confira a API e tente de novo.',
    })
    await flushPromises()

    expect(page.get('[data-testid="order-history-error"]').text()).toContain(
      'Não deu para carregar o pedido',
    )
    expect(page.find('[data-testid="order-history-item"]').exists()).toBe(false)
    await page.get('[data-testid="order-history-retry"]').trigger('click')
    expect(page.emitted('retry')).toHaveLength(1)
    expect(page.text()).not.toContain('PH001')
  })
})
