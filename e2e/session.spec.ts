import {
  CUSTOMER,
  expectNoVisibleProductIds,
  openCustomer,
  signInSeller,
  snapshot,
} from './helpers'
import { expect, test } from './fixtures'

test.describe('R1 — sessão e carteira', () => {
  test('V01 vê só a própria carteira, com o nome da tabela', async ({ page }) => {
    await signInSeller(page)
    await expect(page).toHaveURL(/\/clientes$/)
    await expect(page.locator('[data-customer-id]')).toHaveCount(4)

    const c001 = page.locator('[data-customer-id="C001"]')
    await expect(c001).toContainText(CUSTOMER.c001)
    await expect(c001).toContainText('Fortaleza/CE')
    await expect(c001).toContainText('Tabela Padrão')
    await expect(c001).not.toContainText('TP01')
    await expect(c001).toContainText(/R\$\s*3\.800,00/)

    const c002 = page.locator('[data-customer-id="C002"]')
    await expect(c002).toContainText(CUSTOMER.c002)
    await expect(c002).toContainText('Tabela Volume')
    await expect(c002).not.toContainText('TP02')

    await expect(page.locator('[data-customer-id="C003"]')).toContainText(CUSTOMER.c003)
    await expect(page.locator('[data-customer-id="C004"]')).toContainText(CUSTOMER.c004)
    await expect(page.locator('[data-customer-id="C004"]')).toContainText('Padrão (fallback)')
    await expect(page.getByText(CUSTOMER.c005)).toHaveCount(0)

    await expectNoVisibleProductIds(page)
    await snapshot(page, 'r1-carteira-v01')
  })

  test('recarregar mantém a sessão do vendedor', async ({ page }) => {
    await signInSeller(page)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Minha carteira' })).toBeVisible()
    await expect(page.getByText('V01 Carlos Menezes')).toBeVisible()
  })

  test('cliente de outra carteira e rota inexistente mostram o mesmo 404, sem mudar a URL', async ({
    page,
  }) => {
    await signInSeller(page)

    await page.goto('/clientes/C005/pedido')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
    await expect(page.getByText('Esse endereço não existe.')).toBeVisible()
    await expect(page).toHaveURL(/\/clientes\/C005\/pedido$/)
    await snapshot(page, 'r1-404-outra-carteira')

    await page.goto('/nao-existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
    await expect(page.getByText('Esse endereço não existe.')).toBeVisible()
    await expect(page).toHaveURL(/\/nao-existe$/)
    await snapshot(page, 'r1-404-rota-inexistente')
  })

  test('rota de outro papel também cai no mesmo 404', async ({ page }) => {
    await signInSeller(page)
    await page.goto('/supervisor')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
    await expect(page).toHaveURL(/\/supervisor$/)
  })

  test('abrir o pedido de um cliente da carteira funciona', async ({ page }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c001)
    await expect(page).toHaveURL(/\/clientes\/C001\/pedido$/)
    await expect(page.getByText('Tabela Padrão')).toBeVisible()
  })
})
