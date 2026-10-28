import {
  CUSTOMER,
  PRODUCT,
  expectNoVisibleProductIds,
  openCustomer,
  searchProducts,
  searchResult,
  signInSeller,
  snapshot,
} from './helpers'
import { expect, test } from './fixtures'

test.describe('R2 — busca de produtos', () => {
  test('busca por descrição e por EAN mostra os dois achocolatados, sem id de produto', async ({
    page,
  }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c001)

    await searchProducts(page, 'achocolatado')
    await expect(searchResult(page, PRODUCT.chocolate)).toBeVisible()
    await expect(searchResult(page, PRODUCT.chocolateSachet)).toBeVisible()
    await expect(page.getByText(PRODUCT.inactiveBiscuit)).toHaveCount(0)
    await expect(page.getByText(PRODUCT.inactiveSoda)).toHaveCount(0)
    await expectNoVisibleProductIds(page)
    await snapshot(page, 'r2-busca-achocolatado')

    await searchProducts(page, '7891831978575')
    await expect(searchResult(page, PRODUCT.chocolate)).toBeVisible()
    await expect(searchResult(page, PRODUCT.chocolateSachet)).toBeVisible()
    await expectNoVisibleProductIds(page)
    await snapshot(page, 'r2-busca-ean')
  })

  test('produtos inativos não aparecem na busca', async ({ page }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c001)

    await page.getByTestId('product-search').fill('descontinuado')
    await expect(page.getByTestId('search-empty')).toBeVisible()

    await page.getByTestId('product-search').fill('Biscoito Recheado Chocolate')
    await expect(page.getByTestId('search-empty')).toBeVisible()
  })

  test('C004 avisa fallback e usa preços da Tabela Padrão', async ({ page }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c004)

    await expect(page.getByTestId('fallback-warning')).toHaveText(
      'Cliente sem tabela — usando Tabela Padrão',
    )
    await searchProducts(page, 'Arroz Branco')
    await expect(searchResult(page, PRODUCT.rice)).toContainText(/R\$\s*26,90/)
    await expectNoVisibleProductIds(page)
    await snapshot(page, 'r2-c004-fallback')
  })
})
