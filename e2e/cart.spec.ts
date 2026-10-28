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

test.describe('R3 — carrinho Unidades/Lote e desconto', () => {
  test('P006 lote 2 FD vira 40 un somente leitura; P004 7 un deixa o lote vazio', async ({
    page,
  }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c001)

    await addProduct(page, 'Macarrão Espaguete', PRODUCT.pasta)
    const pasta = cartLine(page, PRODUCT.pasta)
    await expect(pasta.getByText('Lote FD')).toBeVisible()
    await pasta.getByTestId('cart-lots').fill('2')
    await expect(pasta.getByTestId('cart-units')).toHaveValue('40')
    await expect(pasta.getByTestId('cart-units')).toHaveJSProperty('readOnly', true)

    await addProduct(page, 'Óleo de Soja', PRODUCT.oil)
    const oil = cartLine(page, PRODUCT.oil)
    await expect(oil.getByText('Lote CX')).toBeVisible()
    await oil.getByTestId('cart-units').fill('7')
    await expect(oil.getByTestId('cart-lots')).toHaveValue('')
    await oil.getByTestId('cart-units').fill('20')
    await expect(oil.getByTestId('cart-lots')).toHaveValue('1')

    await expectNoVisibleProductIds(page)
    await snapshot(page, 'r3-unidades-lote')
  })

  test('remover item atualiza os totais e desconto fora de 0–100 mostra erro', async ({ page }) => {
    await signInSeller(page)
    await openCustomer(page, CUSTOMER.c001)

    await addProduct(page, 'Arroz Branco', PRODUCT.rice)
    await cartLine(page, PRODUCT.rice).getByTestId('cart-units').fill('10')
    await addProduct(page, 'Macarrão Espaguete', PRODUCT.pasta)
    await cartLine(page, PRODUCT.pasta).getByTestId('cart-lots').fill('2')

    const netWithPasta = await page.getByTestId('order-net').innerText()
    await cartLine(page, PRODUCT.pasta).getByTestId('remove-line').click()
    await expect(cartLine(page, PRODUCT.pasta)).toHaveCount(0)
    await expect(page.getByTestId('order-net')).not.toHaveText(netWithPasta)

    await cartLine(page, PRODUCT.rice).getByTestId('cart-discount').fill('101')
    await expect(page.getByTestId('cart-discount-error')).toHaveText('Desconto fora de 0–100%')
    await expect(page.getByTestId('send-order')).toBeDisabled()
  })
})
