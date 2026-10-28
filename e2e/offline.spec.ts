import {
  CUSTOMER,
  PRODUCT,
  addExampleC001,
  addProduct,
  cartLine,
  countCustomerOrders,
  expectNoVisibleProductIds,
  openCustomer,
  signInSeller,
  snapshot,
} from './helpers'
import { expect, test } from './fixtures'

test.describe('R9 — rascunho local e offline', () => {
  test('rascunho sobrevive ao reload com a mesma chave', async ({ page }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c001)
    await addProduct(page, 'Arroz Branco', PRODUCT.rice)
    await cartLine(page, PRODUCT.rice).getByTestId('cart-units').fill('10')
    await expect(page.getByTestId('draft-saved')).toHaveText('Rascunho salvo')

    const keyBefore = await page.evaluate(() => {
      const raw = localStorage.getItem('yandeh.orderDraft')
      if (!raw) return null
      return (JSON.parse(raw) as Record<string, { idempotencyKey: string }>).C001?.idempotencyKey
    })
    expect(keyBefore).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )

    await page.reload()
    await expect(page.getByRole('heading', { name: CUSTOMER.c001 })).toBeVisible()
    await expect(cartLine(page, PRODUCT.rice).getByTestId('cart-units')).toHaveValue('10')
    await expect(page.getByTestId('draft-saved')).toHaveText('Rascunho salvo')

    const keyAfter = await page.evaluate(() => {
      const raw = localStorage.getItem('yandeh.orderDraft')
      if (!raw) return null
      return (JSON.parse(raw) as Record<string, { idempotencyKey: string }>).C001?.idempotencyKey
    })
    expect(keyAfter).toBe(keyBefore)
    await expectNoVisibleProductIds(page)
    await snapshot(page, 'r9-rascunho-reload')
  })

  test('offline mostra Aguardando conexão e envia uma vez ao voltar a rede', async ({
    page,
    context,
  }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c001)
    await addExampleC001(page)
    const before = await countCustomerOrders('C001')

    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.getByTestId('connection-status')).toHaveText('Sem conexão')
    await page.getByTestId('send-order').click()
    await expect(page.getByTestId('submit-pending')).toContainText('Aguardando conexão')
    await expect(page.getByTestId('draft-locked')).toBeVisible()
    await snapshot(page, 'r9-aguardando-conexao')

    expect(await countCustomerOrders('C001')).toBe(before)

    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(page.getByTestId('order-result')).toHaveAttribute('data-order-status', 'Enviado')
    await expect(page.getByRole('heading', { name: 'Enviado' })).toBeVisible()
    expect(await countCustomerOrders('C001')).toBe(before + 1)
    await snapshot(page, 'r9-enviado-ao-voltar')
  })
})
