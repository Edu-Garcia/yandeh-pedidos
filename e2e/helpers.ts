import type { Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { expect } from './fixtures'
import { E2E_API_ORIGIN, REPO_ROOT } from './env'

export const PRODUCT = {
  rice: 'Arroz Branco Tipo 1 5kg',
  pasta: 'Macarrão Espaguete 500g',
  milk: 'Leite UHT Integral 1L',
  oil: 'Óleo de Soja 900ml',
  chocolate: 'Achocolatado em Pó 400g',
  chocolateSachet: 'Achocolatado em Pó 400g Sachê',
  inactiveBiscuit: 'Biscoito Recheado Chocolate 140g',
  inactiveSoda: 'Refrigerante Laranja 2L (descontinuado)',
} as const

export const CUSTOMER = {
  c001: 'Mercadinho São José',
  c002: 'Minibox Bom Preço',
  c003: 'Conveniência Esquina',
  c004: 'Mercearia Dona Lúcia',
  c005: 'Supermercado Família',
} as const

const PRODUCT_ID_RE = /\bP0\d{2}\b/

export async function signInSeller(page: Page, name = 'Carlos Menezes'): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: new RegExp(name) }).click()
  await expect(page.getByRole('heading', { name: 'Minha carteira' })).toBeVisible()
}

export async function signInSupervisor(page: Page, name = 'Marta Fernandes'): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: new RegExp(name) }).click()
  await expect(page.getByRole('heading', { name: 'Aprovações' })).toBeVisible()
}

export async function openCustomer(page: Page, tradeName: string): Promise<void> {
  await page.getByRole('link', { name: `Pedido de ${tradeName}` }).click()
  await expect(page.getByRole('heading', { name: tradeName })).toBeVisible()
}

export function searchResult(page: Page, description: string) {
  return page.locator('[data-testid="search-results"] li').filter({
    has: page.getByText(description, { exact: true }),
  })
}

export function cartLine(page: Page, description: string) {
  return page.getByTestId('cart-line').filter({
    has: page.getByText(description, { exact: true }),
  })
}

export async function searchProducts(page: Page, query: string): Promise<void> {
  await page.getByTestId('product-search').fill(query)
  await expect(page.getByTestId('search-results')).toBeVisible()
}

export async function addProduct(page: Page, query: string, description: string): Promise<void> {
  await searchProducts(page, query)
  await searchResult(page, description).getByTestId('add-product').click()
  await expect(cartLine(page, description)).toBeVisible()
  await page.getByTestId('product-search').fill('')
  await expect(page.getByTestId('search-results')).toHaveCount(0)
}

export async function addExampleC001(page: Page): Promise<void> {
  await addProduct(page, 'Arroz Branco', PRODUCT.rice)
  await cartLine(page, PRODUCT.rice).getByTestId('cart-units').fill('10')
  await addProduct(page, 'Macarrão Espaguete', PRODUCT.pasta)
  await cartLine(page, PRODUCT.pasta).getByTestId('cart-lots').fill('2')
  await cartLine(page, PRODUCT.pasta).getByTestId('cart-discount').fill('2')
  await addProduct(page, 'Leite UHT Integral', PRODUCT.milk)
  await cartLine(page, PRODUCT.milk).getByTestId('cart-lots').fill('2')
}

export async function expectNoVisibleProductIds(page: Page): Promise<void> {
  const text = await page.locator('body').innerText()
  expect(text, 'a UI não deve mostrar id de produto (ex.: P009)').not.toMatch(PRODUCT_ID_RE)
}

export async function snapshot(page: Page, name: string): Promise<void> {
  const dirs = ['/opt/cursor/artifacts/screenshots', path.join(REPO_ROOT, 'test-results/manual')]
  for (const dir of dirs) {
    try {
      mkdirSync(dir, { recursive: true })
      await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true })
    } catch {
      /* diretório indisponível neste ambiente */
    }
  }
}

export async function countCustomerOrders(customerId: string, sellerId = 'V01'): Promise<number> {
  const response = await fetch(`${E2E_API_ORIGIN}/customers/${customerId}/orders`, {
    headers: { 'X-Seller-Id': sellerId },
  })
  if (!response.ok) {
    throw new Error(`GET /customers/${customerId}/orders → ${response.status}`)
  }
  const rows = (await response.json()) as unknown[]
  return rows.length
}

export async function customerCredit(customerId: string, sellerId = 'V01'): Promise<number> {
  const response = await fetch(`${E2E_API_ORIGIN}/sellers/${sellerId}/customers`, {
    headers: { 'X-Seller-Id': sellerId },
  })
  if (!response.ok) {
    throw new Error(`GET /sellers/${sellerId}/customers → ${response.status}`)
  }
  const rows = (await response.json()) as Array<{ id: string; availableCredit: number }>
  const found = rows.find((row) => row.id === customerId)
  if (!found) throw new Error(`Cliente ${customerId} não está na carteira de ${sellerId}`)
  return found.availableCredit
}
