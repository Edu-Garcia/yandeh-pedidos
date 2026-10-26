import { describe, expect, it } from 'vitest'
import { toCents } from './money.js'
import { maxDiscount, statusForDiscount } from './discount.js'
import type { OrderLineInput, Seller } from './types.js'

function line(
  productId: string,
  quantityUnits: number,
  unitPrice: number,
  discountPercent: number,
): OrderLineInput {
  return { productId, quantityUnits, unitPrice, discountPercent }
}

/** V01 Carlos Menezes — alçada 5% no seed. */
const sellerV01: Seller = {
  id: 'V01',
  name: 'Carlos Menezes',
  supervisorId: 'S01',
  discountAuthorityPercent: 5,
}

/** V02 Renata Lima — alçada 7% no seed. */
const sellerV02: Seller = {
  id: 'V02',
  name: 'Renata Lima',
  supervisorId: 'S01',
  discountAuthorityPercent: 7,
}

/** V03 Paulo Andrade — alçada 3% no seed. */
const sellerV03: Seller = {
  id: 'V03',
  name: 'Paulo Andrade',
  supervisorId: 'S01',
  discountAuthorityPercent: 3,
}

/** Exemplo C001 / TP01 do PRD §6 (preços atuais da tabela). */
const c001P001 = line('P001', 10, toCents(26.9), 0)
const c001P006 = line('P006', 40, toCents(3.33), 2)
const c001P010 = line('P010', 24, toCents(4.99), 0)

const linesWith6: OrderLineInput[] = [c001P001, c001P006, line('P001', 10, toCents(26.9), 6)]
const linesAtAuthority: OrderLineInput[] = [c001P001, c001P006, line('P001', 10, toCents(26.9), 5)]

describe('maxDiscount', () => {
  it('linhas 0%, 2%, 6% → 6 (RN10)', () => {
    expect(
      maxDiscount([line('P001', 10, 2690, 0), line('P006', 40, 333, 2), line('P001', 10, 2690, 6)]),
    ).toBe(6)
  })

  it('exemplo C001 (0%, 2%, 0%) → 2', () => {
    expect(maxDiscount([c001P001, c001P006, c001P010])).toBe(2)
  })

  it('uma linha devolve o próprio desconto', () => {
    expect(maxDiscount([line('P001', 1, 2690, 7)])).toBe(7)
  })

  it('pedido sem linhas → 0 (leitura conservadora: nenhum item com desconto)', () => {
    expect(maxDiscount([])).toBe(0)
  })

  it('o máximo não se esconde num item barato (D7)', () => {
    const cheapHigh = line('P006', 1, 1, 6)
    const expensiveNone = line('P001', 10, 2690, 0)
    expect(maxDiscount([cheapHigh, expensiveNone])).toBe(6)
  })
})

describe('statusForDiscount', () => {
  it('V01 (5%) com 0%, 2%, 6% → Aguardando aprovação', () => {
    const lines = [line('P001', 10, 2690, 0), line('P006', 40, 333, 2), line('P001', 10, 2690, 6)]
    expect(maxDiscount(lines)).toBe(6)
    expect(statusForDiscount(lines, sellerV01.discountAuthorityPercent)).toBe(
      'Aguardando aprovação',
    )
    expect(statusForDiscount(linesWith6, sellerV01.discountAuthorityPercent)).toBe(
      'Aguardando aprovação',
    )
  })

  it('V01 (5%) com 0%, 2%, 5% → Enviado (igual à alçada é permitido)', () => {
    const lines = [line('P001', 10, 2690, 0), line('P006', 40, 333, 2), line('P001', 10, 2690, 5)]
    expect(maxDiscount(lines)).toBe(5)
    expect(statusForDiscount(lines, sellerV01.discountAuthorityPercent)).toBe('Enviado')
    expect(statusForDiscount(linesAtAuthority, sellerV01.discountAuthorityPercent)).toBe('Enviado')
  })

  it('V02 (7%) com item a 7% → Enviado (`>` estrito)', () => {
    const lines = [line('P001', 10, 2690, 7)]
    expect(maxDiscount(lines)).toBe(7)
    expect(statusForDiscount(lines, sellerV02.discountAuthorityPercent)).toBe('Enviado')
  })

  it('exemplo C001 (maior 2% ≤ 5%) → Enviado', () => {
    expect(
      statusForDiscount([c001P001, c001P006, c001P010], sellerV01.discountAuthorityPercent),
    ).toBe('Enviado')
  })

  it('V02 (7%) com 8% → Aguardando aprovação', () => {
    expect(statusForDiscount([line('P001', 10, 2690, 8)], sellerV02.discountAuthorityPercent)).toBe(
      'Aguardando aprovação',
    )
  })

  it('V03 (3%) com 3% → Enviado; com 4% → Aguardando aprovação', () => {
    expect(statusForDiscount([line('P001', 10, 2690, 3)], sellerV03.discountAuthorityPercent)).toBe(
      'Enviado',
    )
    expect(statusForDiscount([line('P001', 10, 2690, 4)], sellerV03.discountAuthorityPercent)).toBe(
      'Aguardando aprovação',
    )
  })

  it('pedido sem linhas → Enviado (max 0 não excede a alçada)', () => {
    expect(statusForDiscount([], sellerV01.discountAuthorityPercent)).toBe('Enviado')
    expect(statusForDiscount([], sellerV03.discountAuthorityPercent)).toBe('Enviado')
  })

  it('todos os itens a 0% → Enviado', () => {
    expect(
      statusForDiscount(
        [line('P001', 10, 2690, 0), line('P010', 24, 499, 0)],
        sellerV01.discountAuthorityPercent,
      ),
    ).toBe('Enviado')
  })
})
