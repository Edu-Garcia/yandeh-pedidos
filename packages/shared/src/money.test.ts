import { describe, expect, it } from 'vitest'
import { formatBRL, toCents } from './money'

/** Intl pt-BR pode emitir NBSP/NNBSP entre "R$" e o valor. */
function normalizeBRL(value: string): string {
  return value.replace(/[\u00A0\u202F]/g, ' ')
}

describe('toCents', () => {
  it('converte preços do seed para centavos (3.33, 26.9, 4.99)', () => {
    expect(toCents(3.33)).toBe(333)
    expect(toCents(26.9)).toBe(2690)
    expect(toCents(4.99)).toBe(499)
  })

  it('sobrevive à soma clássica de ponto flutuante', () => {
    expect(toCents(0.1 + 0.2)).toBe(30)
  })

  it('converte zero', () => {
    expect(toCents(0)).toBe(0)
  })

  it('converte valores negativos', () => {
    expect(toCents(-3.33)).toBe(-333)
    expect(toCents(-26.9)).toBe(-2690)
  })

  it('arredonda metade de centavo half-up (Math.round)', () => {
    expect(toCents(0.005)).toBe(1)
    // Math.round(-0.5) vai para +∞ → 0; ver relatório T-01.
    expect(toCents(-0.005)).toBe(0)
    expect(toCents(1.005)).toBe(101)
  })
})

describe('formatBRL', () => {
  it('formata o total do exemplo C001', () => {
    expect(normalizeBRL(formatBRL(51930))).toBe('R$ 519,30')
  })

  it('formata zero e um centavo', () => {
    expect(normalizeBRL(formatBRL(0))).toBe('R$ 0,00')
    expect(normalizeBRL(formatBRL(1))).toBe('R$ 0,01')
  })

  it('formata valores negativos no padrão Intl pt-BR', () => {
    expect(normalizeBRL(formatBRL(-51930))).toBe('-R$ 519,30')
  })

  it('formata preços do seed', () => {
    expect(normalizeBRL(formatBRL(2690))).toBe('R$ 26,90')
    expect(normalizeBRL(formatBRL(333))).toBe('R$ 3,33')
    expect(normalizeBRL(formatBRL(499))).toBe('R$ 4,99')
  })
})
