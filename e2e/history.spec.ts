import {
  CUSTOMER,
  PRODUCT,
  expectNoVisiblePersonIds,
  expectNoVisibleProductIds,
  openCustomer,
  signInSeller,
  snapshot,
} from './helpers'
import { expect, test } from './fixtures'

test.describe('Histórico — visualizar pedido', () => {
  test('abre o painel do PH001 com itens congelados e fecha com Esc', async ({ page }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c001)

    const history = page.getByTestId('history-row').filter({ hasText: '15/09/2026' })
    await expect(history.getByTestId('history-status')).toHaveText('Faturado')
    await expect(history.getByTestId('view-order')).toHaveText('Visualizar pedido')
    await expectNoVisibleProductIds(page)
    await expectNoVisiblePersonIds(page)
    await expect(page.locator('body')).not.toContainText(/PH00\d/)
    await snapshot(page, 'historico-visualizar-botao', false)

    await history.getByTestId('view-order').click()
    const panel = page.getByTestId('order-history-panel')
    await expect(panel).toBeVisible()
    await expect(panel).toHaveAttribute('role', 'dialog')
    await expect(panel).toHaveAttribute('aria-modal', 'true')
    await expect(page.getByTestId('order-history-title')).toHaveText('15/09/2026')
    await expect(page.getByTestId('order-history-status')).toHaveText('Faturado')

    await expect(panel.getByText(PRODUCT.rice, { exact: true })).toBeVisible()
    await expect(panel.getByText(PRODUCT.pasta, { exact: true })).toBeVisible()
    await expect(panel.getByText(PRODUCT.milk, { exact: true })).toBeVisible()
    await expect(panel.getByText(PRODUCT.inactiveBiscuit, { exact: true })).toBeVisible()
    await expect(panel.getByText('7891958224128')).toBeVisible()
    await expect(panel.getByTestId('order-history-item-price').first()).toContainText(/25,90/)
    await expect(page.getByTestId('order-history-net')).toContainText(/583,03/)

    await expectNoVisibleProductIds(page)
    await expectNoVisiblePersonIds(page)
    await expect(page.locator('body')).not.toContainText(/PH00\d/)
    await expect(page.getByTestId('cart-empty')).toBeVisible()
    await snapshot(page, 'historico-painel-ph001', false)

    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
    await expect(history.getByTestId('view-order')).toBeFocused()
  })
})
