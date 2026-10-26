import { MINIMUM_ORDER_CENTS, formatBRL } from '@yandeh/shared'
import { describe, expect, it } from 'vitest'
import { formatCityUf, isCreditBelowMinimum } from './wallet'

function normalizeBRL(value: string): string {
  return value.replace(/[\u00A0\u202F]/g, ' ')
}

describe('isCreditBelowMinimum', () => {
  it('destaca C006 (R$ 100,00) e C010 (R$ 0,00) do seed', () => {
    expect(isCreditBelowMinimum(10000)).toBe(true)
    expect(isCreditBelowMinimum(0)).toBe(true)
  })

  it('não destaca C001 (R$ 3.800,00) nem C002 (R$ 350,00)', () => {
    expect(isCreditBelowMinimum(380000)).toBe(false)
    expect(isCreditBelowMinimum(35000)).toBe(false)
  })

  it('usa o mínimo do shared com comparação estrita', () => {
    expect(MINIMUM_ORDER_CENTS).toBe(30000)
    expect(isCreditBelowMinimum(MINIMUM_ORDER_CENTS - 1)).toBe(true)
    expect(isCreditBelowMinimum(MINIMUM_ORDER_CENTS)).toBe(false)
  })
})

describe('formatCityUf', () => {
  it('junta cidade e UF dos clientes do aceite', () => {
    expect(formatCityUf('Fortaleza', 'CE')).toBe('Fortaleza/CE')
    expect(formatCityUf('Caucaia', 'CE')).toBe('Caucaia/CE')
    expect(formatCityUf('Maracanaú', 'CE')).toBe('Maracanaú/CE')
    expect(formatCityUf('Mossoró', 'RN')).toBe('Mossoró/RN')
    expect(formatCityUf('Picos', 'PI')).toBe('Picos/PI')
  })
})

describe('formatBRL na carteira', () => {
  it('formata os créditos do aceite em pt-BR', () => {
    expect(normalizeBRL(formatBRL(380000))).toBe('R$ 3.800,00')
    expect(normalizeBRL(formatBRL(35000))).toBe('R$ 350,00')
    expect(normalizeBRL(formatBRL(10000))).toBe('R$ 100,00')
    expect(normalizeBRL(formatBRL(0))).toBe('R$ 0,00')
  })
})
