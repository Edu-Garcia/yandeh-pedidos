import { lineTotals } from '@yandeh/shared'
import { describe, expect, it } from 'vitest'

describe('@yandeh/shared (resolução ESM em runtime)', () => {
  it('importa lineTotals e calcula o exemplo PH001/P006', () => {
    expect(
      lineTotals({
        productId: 'P006',
        quantityUnits: 40,
        unitPrice: 329,
        discountPercent: 2,
      }),
    ).toEqual({ gross: 13160, discount: 263, net: 12897 })
  })
})
