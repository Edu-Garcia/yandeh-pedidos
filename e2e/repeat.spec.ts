import {
  CUSTOMER,
  PRODUCT,
  addProduct,
  cartLine,
  expectNoVisibleProductIds,
  openCustomer,
  signInSeller,
  snapshot,
} from './helpers'
import { expect, test } from './fixtures'

test.describe('R8 — repetir pedido', () => {
  test('repetir PH001 remove o biscoito inativo, usa preço atual e zera descontos', async ({
    page,
  }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c001)

    const history = page.getByTestId('history-row').filter({ hasText: '15/09/2026' })
    await expect(history.getByTestId('history-status')).toHaveText('Faturado')
    await history.getByTestId('repeat-order').click()

    await expect(page.getByTestId('repeat-review-notice')).toHaveText(
      'Pedido carregado para revisão. Nada foi enviado.',
    )
    await expect(page.getByTestId('repeat-removed-item')).toContainText(
      `${PRODUCT.inactiveBiscuit} removido (inativo)`,
    )
    await expect(page.getByText(PRODUCT.inactiveBiscuit, { exact: true })).toHaveCount(0)

    const rice = cartLine(page, PRODUCT.rice)
    await expect(rice.getByTestId('cart-units')).toHaveValue('10')
    await expect(rice).toContainText(/26,90/)
    await expect(rice.getByTestId('cart-discount')).toHaveValue('0')

    const pasta = cartLine(page, PRODUCT.pasta)
    await expect(pasta.getByTestId('cart-units')).toHaveValue('40')
    await expect(pasta.getByTestId('cart-discount')).toHaveValue('0')

    await expect(page.getByTestId('order-result')).toHaveCount(0)
    await expect(page.getByTestId('send-order')).toBeVisible()
    await expectNoVisibleProductIds(page)
    await snapshot(page, 'r8-repetir-ph001')
  })

  test('repetir com rascunho existente pede confirmação antes de substituir', async ({ page }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c001)
    await addProduct(page, 'Óleo de Soja', PRODUCT.oil)

    const history = page.getByTestId('history-row').filter({ hasText: '15/09/2026' })
    await history.getByTestId('repeat-order').click()
    await expect(page.getByTestId('overwrite-confirm')).toContainText(
      'Este pedido já tem itens. Repetir substitui o rascunho atual.',
    )
    await page.getByTestId('overwrite-cancel').click()
    await expect(cartLine(page, PRODUCT.oil)).toBeVisible()
    await expect(cartLine(page, PRODUCT.rice)).toHaveCount(0)

    await history.getByTestId('repeat-order').click()
    await page.getByTestId('overwrite-accept').click()
    await expect(page.getByTestId('repeat-review-notice')).toBeVisible()
    await expect(cartLine(page, PRODUCT.rice)).toBeVisible()
    await expect(cartLine(page, PRODUCT.oil)).toHaveCount(0)
  })
})
