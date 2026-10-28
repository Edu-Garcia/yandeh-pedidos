import {
  CUSTOMER,
  PRODUCT,
  addExampleC001,
  addProduct,
  cartLine,
  expectNoVisibleProductIds,
  openCustomer,
  signInSeller,
  snapshot,
} from './helpers'
import { expect, test } from './fixtures'

test.describe('R4 R5 R7 — totais, bloqueios e envio', () => {
  test('exemplo C001 envia como Enviado com líquido R$ 519,30', async ({ page }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c001)
    await addExampleC001(page)

    await expect(page.getByTestId('order-gross')).toContainText(/521,96/)
    await expect(page.getByTestId('order-discount')).toContainText(/2,66/)
    await expect(page.getByTestId('order-net')).toContainText(/519,30/)
    await expect(page.getByTestId('order-blocks')).toHaveCount(0)
    await expect(page.getByTestId('send-order')).toBeEnabled()
    await expectNoVisibleProductIds(page)
    await snapshot(page, 'r4-totais-c001')

    await page.getByTestId('send-order').click()
    await expect(page.getByTestId('order-result')).toBeVisible()
    await expect(page.getByTestId('order-result')).toHaveAttribute('data-order-status', 'Enviado')
    await expect(page.getByRole('heading', { name: 'Enviado' })).toBeVisible()
    await expect(page.getByTestId('order-result')).toContainText(/519,30/)
    await snapshot(page, 'r5-enviado')
  })

  test('líquido abaixo do mínimo bloqueia Enviar', async ({ page }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c001)
    await addProduct(page, 'Arroz Branco', PRODUCT.rice)
    await cartLine(page, PRODUCT.rice).getByTestId('cart-units').fill('10')

    await expect(page.getByTestId('order-block')).toContainText('Total líquido abaixo de R$ 300,00')
    await expect(page.locator('[data-issue-code="BELOW_MINIMUM"]')).toBeVisible()
    await expect(page.getByTestId('send-order')).toBeDisabled()
    await snapshot(page, 'r4-bloqueio-minimo')
  })

  test('C002 com pedido de ~R$ 400 bloqueia por crédito', async ({ page }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c002)
    await addProduct(page, 'Arroz Branco', PRODUCT.rice)
    await cartLine(page, PRODUCT.rice).getByTestId('cart-units').fill('16')

    await expect(page.getByTestId('order-block')).toContainText(
      'Total líquido acima do crédito disponível',
    )
    await expect(page.locator('[data-issue-code="INSUFFICIENT_CREDIT"]')).toBeVisible()
    await expect(page.getByTestId('send-order')).toBeDisabled()
    await snapshot(page, 'r7-bloqueio-credito')
  })

  test('desconto acima da alçada avisa e envia como Aguardando aprovação', async ({ page }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c001)
    await addExampleC001(page)
    await cartLine(page, PRODUCT.rice).getByTestId('cart-discount').fill('6')

    await expect(page.getByTestId('approval-warning')).toHaveText(
      'Este pedido precisará de aprovação.',
    )
    await expect(page.getByTestId('send-order')).toBeEnabled()
    await page.getByTestId('send-order').click()
    await expect(page.getByTestId('order-result')).toHaveAttribute(
      'data-order-status',
      'Aguardando aprovação',
    )
    await expect(page.getByRole('heading', { name: 'Aguardando aprovação' })).toBeVisible()
    await snapshot(page, 'r5-aguardando-aprovacao')
  })
})
