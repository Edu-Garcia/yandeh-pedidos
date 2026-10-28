import type { CustomerProduct } from '@yandeh/shared'
import { formatBRL, lineTotals } from '@yandeh/shared'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import CartLine from '@/components/CartLine.vue'
import { DRAFT_STORAGE_KEY, useOrderDraftStore } from '@/stores/order-draft'

const CUSTOMER_ID = 'C001'

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

const CartLineHost = defineComponent({
  props: {
    productId: { type: String, required: true },
    locked: { type: Boolean, default: false },
    notice: { type: String, default: undefined },
  },
  setup(props) {
    const draft = useOrderDraftStore()
    return () => {
      const line = draft.linesOf(CUSTOMER_ID).find((item) => item.product.id === props.productId)
      if (!line) return null
      return h(CartLine, {
        customerId: CUSTOMER_ID,
        line,
        locked: props.locked,
        notice: props.notice ?? null,
      })
    }
  },
})

function normalizeBRL(value: string): string {
  return value.replace(/[\u00A0\u202F]/g, ' ')
}

function inputEl(wrapper: VueWrapper, testId: string): HTMLInputElement {
  return wrapper.get(`[data-testid="${testId}"]`).element as HTMLInputElement
}

describe('CartLine', () => {
  let pinia: Pinia
  let wrapper: VueWrapper | null

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    pinia = createPinia()
    setActivePinia(pinia)
    wrapper = null
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  function mountLine(
    product: CustomerProduct,
    options: { locked?: boolean; notice?: string } = {},
  ): { wrapper: VueWrapper; draft: ReturnType<typeof useOrderDraftStore> } {
    const draft = useOrderDraftStore()
    draft.addProduct(CUSTOMER_ID, product)
    if (options.locked) draft.markSubmitPending(CUSTOMER_ID)
    wrapper = mount(CartLineHost, {
      props: {
        productId: product.id,
        locked: Boolean(options.locked),
        notice: options.notice,
      },
      global: { plugins: [pinia] },
    })
    return { wrapper, draft }
  }

  it('P006: Unidades somente leitura, rótulo Lote FD e Lote 2 preenche 40 un', async () => {
    const { wrapper, draft } = mountLine(p006)

    expect(wrapper.text()).toContain('Macarrão Espaguete 500g')
    expect(wrapper.text()).toContain('Lote FD')
    expect(inputEl(wrapper, 'cart-units').readOnly).toBe(true)
    expect(wrapper.find('[data-testid="cart-lots"]').exists()).toBe(true)

    await wrapper.get('[data-testid="cart-lots"]').setValue('2')

    expect(inputEl(wrapper, 'cart-units').value).toBe('40')
    expect(inputEl(wrapper, 'cart-lots').value).toBe('2')
    expect(inputEl(wrapper, 'cart-units').readOnly).toBe(true)
    expect(wrapper.find('[data-testid="cart-quantity-error"]').exists()).toBe(false)
    expect(draft.linesOf(CUSTOMER_ID)[0]?.quantityUnits).toBe(40)
    expect(wrapper.text()).not.toContain('P006')
  })

  it('P004: 7 un deixa Lote vazio; 20 un preenche 1 CX; Lote 2 preenche 40 un', async () => {
    const { wrapper } = mountLine(p004)

    expect(inputEl(wrapper, 'cart-units').readOnly).toBe(false)
    expect(wrapper.text()).toContain('Lote CX')

    await wrapper.get('[data-testid="cart-units"]').setValue('7')
    expect(inputEl(wrapper, 'cart-lots').value).toBe('')

    await wrapper.get('[data-testid="cart-units"]').setValue('20')
    expect(inputEl(wrapper, 'cart-lots').value).toBe('1')

    await wrapper.get('[data-testid="cart-lots"]').setValue('2')
    expect(inputEl(wrapper, 'cart-units').value).toBe('40')
    expect(inputEl(wrapper, 'cart-lots').value).toBe('2')
    expect(wrapper.text()).not.toContain('P004')
  })

  it('P010: Lote 2 preenche 24 un e Unidades somente leitura', async () => {
    const { wrapper } = mountLine(p010)

    expect(inputEl(wrapper, 'cart-units').readOnly).toBe(true)
    expect(wrapper.text()).toContain('Lote CX')

    await wrapper.get('[data-testid="cart-lots"]').setValue('2')
    expect(inputEl(wrapper, 'cart-units').value).toBe('24')
    expect(inputEl(wrapper, 'cart-lots').value).toBe('2')
  })

  it('P001 (UN fator 1) mostra só Unidades', () => {
    const { wrapper } = mountLine(p001)

    expect(wrapper.find('[data-testid="cart-units"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cart-lots"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Lote')
    expect(wrapper.text()).not.toContain('P001')
  })

  it('exibe o líquido da linha com arredondamento half-up (P006 40 un a 2%)', async () => {
    const { wrapper } = mountLine(p006)
    await wrapper.get('[data-testid="cart-lots"]').setValue('2')
    await wrapper.get('[data-testid="cart-discount"]').setValue('2')

    const totals = lineTotals({
      productId: p006.id,
      quantityUnits: 40,
      unitPrice: 333,
      discountPercent: 2,
    })
    expect(totals).toEqual({ gross: 13320, discount: 266, net: 13054 })
    expect(normalizeBRL(wrapper.get('[data-testid="cart-line-total"]').text())).toBe(
      normalizeBRL(formatBRL(13054)),
    )
    expect(inputEl(wrapper, 'cart-discount').value).toBe('2')
    expect(wrapper.text()).not.toContain('P006')
  })

  it('não mostra o id do produto no texto renderizado', () => {
    const { wrapper } = mountLine(p006)

    expect(wrapper.text()).toContain('Macarrão Espaguete 500g')
    expect(wrapper.text()).toContain('7891399588384')
    expect(wrapper.text()).not.toContain('P006')
    expect(wrapper.text()).not.toContain('P009')
    expect(wrapper.get('[data-testid="cart-line"]').attributes('data-product-id')).toBe('P006')
  })

  it('com envio pendente, campos e Remover ficam desabilitados', async () => {
    const { wrapper, draft } = mountLine(p006, { locked: true })
    await wrapper.get('[data-testid="cart-lots"]').setValue('3')
    await wrapper.get('[data-testid="remove-line"]').trigger('click')

    expect(inputEl(wrapper, 'cart-units').disabled).toBe(true)
    expect(inputEl(wrapper, 'cart-lots').disabled).toBe(true)
    expect(inputEl(wrapper, 'cart-discount').disabled).toBe(true)
    expect((wrapper.get('[data-testid="remove-line"]').element as HTMLButtonElement).disabled).toBe(
      true,
    )
    expect(draft.linesOf(CUSTOMER_ID)).toHaveLength(1)
    expect(draft.linesOf(CUSTOMER_ID)[0]?.quantityUnits).toBe(20)
  })

  it('Remover tira a linha e limpa o rascunho quando o carrinho esvazia', async () => {
    const { wrapper, draft } = mountLine(p004)

    expect(draft.hasDraft(CUSTOMER_ID)).toBe(true)
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull()

    await wrapper.get('[data-testid="remove-line"]').trigger('click')

    expect(draft.linesOf(CUSTOMER_ID)).toEqual([])
    expect(draft.hasDraft(CUSTOMER_ID)).toBe(false)
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
    expect(wrapper.find('[data-testid="cart-line"]').exists()).toBe(false)
  })
})
