import { describe, expect, it } from 'vitest'
import { formatCivilDate, formatRemovedItem } from './order-history'

describe('formatCivilDate', () => {
  it('formata 2026-09-15 em pt-BR sem deslocar o fuso', () => {
    expect(formatCivilDate('2026-09-15')).toBe('15/09/2026')
    expect(formatCivilDate('2026-10-02')).toBe('02/10/2026')
  })

  it('devolve a string original quando o formato não é civil YYYY-MM-DD', () => {
    expect(formatCivilDate('15/09/2026')).toBe('15/09/2026')
  })
})

describe('formatRemovedItem', () => {
  it('usa a descrição e o motivo curto, sem id', () => {
    expect(
      formatRemovedItem({
        description: 'Biscoito Recheado Chocolate 140g',
        reason: 'Produto inativo',
      }),
    ).toBe('Biscoito Recheado Chocolate 140g removido (inativo)')
  })

  it('mapeia sem preço e ausente; cai no motivo original se for outro', () => {
    expect(
      formatRemovedItem({
        description: 'Arroz Branco Tipo 1 5kg',
        reason: 'Produto sem preço na tabela',
      }),
    ).toBe('Arroz Branco Tipo 1 5kg removido (sem preço)')
    expect(
      formatRemovedItem({ description: null, reason: 'Produto não encontrado no catálogo' }),
    ).toBe('Produto removido (ausente)')
    expect(
      formatRemovedItem({ description: 'Leite UHT Integral 1L', reason: 'fora de linha' }),
    ).toBe('Leite UHT Integral 1L removido (fora de linha)')
  })
})
