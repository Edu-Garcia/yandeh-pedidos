import { describe, expect, it } from 'vitest'
import { formatDiscountVsAuthority } from './approvals'

describe('formatDiscountVsAuthority', () => {
  it('mostra o maior desconto e a alçada do vendedor', () => {
    expect(formatDiscountVsAuthority(6, 5)).toBe('Maior desconto 6% · alçada 5%')
    expect(formatDiscountVsAuthority(7, 7)).toBe('Maior desconto 7% · alçada 7%')
    expect(formatDiscountVsAuthority(0, 3)).toBe('Maior desconto 0% · alçada 3%')
  })
})
