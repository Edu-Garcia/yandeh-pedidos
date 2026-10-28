import {
  CUSTOMER,
  PRODUCT,
  addExampleC001,
  addProduct,
  cartLine,
  customerCredit,
  openCustomer,
  signInSeller,
  signInSupervisor,
  snapshot,
} from './helpers'
import { expect, test } from './fixtures'

test.describe('R5 R7 — aprovação e rejeição do supervisor', () => {
  test('aprovar pede confirmação inline e tira o pedido da lista', async ({ page }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c001)
    await addExampleC001(page)
    await cartLine(page, PRODUCT.rice).getByTestId('cart-discount').fill('6')
    await page.getByTestId('send-order').click()
    await expect(page.getByTestId('order-result')).toHaveAttribute(
      'data-order-status',
      'Aguardando aprovação',
    )

    await page.getByRole('button', { name: 'Trocar' }).click()
    await signInSupervisor(page)
    const pending = page.locator('[data-customer-id="C001"]')
    await expect(pending).toContainText(CUSTOMER.c001)
    await expect(pending).toContainText('Carlos Menezes')
    await expect(pending.getByTestId('discount-vs-authority')).toHaveText(
      'Maior desconto 6% · alçada 5%',
    )
    await snapshot(page, 'r5-lista-aprovacoes')

    await pending.getByTestId('approve-order').click()
    await expect(pending.getByTestId('decision-confirm')).toContainText(
      /Aprovar o pedido de Mercadinho São José/,
    )
    await pending.getByTestId('decision-accept').click()
    await expect(page.locator('[data-customer-id="C001"]')).toHaveCount(0)
    await expect(page.getByText('Nenhum pedido aguardando aprovação.')).toBeVisible()
    await snapshot(page, 'r5-aprovado')
  })

  test('rejeitar pede confirmação inline e libera o crédito reservado', async ({ page }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c002)
    await addProduct(page, 'Arroz Branco', PRODUCT.rice)
    await cartLine(page, PRODUCT.rice).getByTestId('cart-units').fill('13')
    await cartLine(page, PRODUCT.rice).getByTestId('cart-discount').fill('6')
    await expect(page.getByTestId('send-order')).toBeEnabled()
    await page.getByTestId('send-order').click()
    await expect(page.getByTestId('order-result')).toHaveAttribute(
      'data-order-status',
      'Aguardando aprovação',
    )

    expect(await customerCredit('C002')).toBeLessThan(35000)

    await page.getByRole('button', { name: 'Trocar' }).click()
    await signInSupervisor(page)
    const pending = page.locator('[data-customer-id="C002"]')
    await pending.getByTestId('reject-order').click()
    await expect(pending.getByTestId('decision-confirm')).toContainText(
      /Rejeitar o pedido de Minibox Bom Preço/,
    )
    await pending.getByTestId('decision-cancel').click()
    await expect(pending.getByTestId('decision-confirm')).toHaveCount(0)

    await pending.getByTestId('reject-order').click()
    await pending.getByTestId('decision-accept').click()
    await expect(page.locator('[data-customer-id="C002"]')).toHaveCount(0)
    await snapshot(page, 'r7-rejeitado')

    expect(await customerCredit('C002')).toBe(35000)
  })
})
