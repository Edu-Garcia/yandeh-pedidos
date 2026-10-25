import type { Cents } from './types'

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/**
 * Converte reais (number do seed) para centavos inteiros.
 * PRD §6 / RN07 / D8: `centavos = round(reais × 100)`, robusto a float.
 */
export function toCents(reais: number): Cents {
  return Math.round((reais + Number.EPSILON) * 100) || 0
}

/** Formata centavos inteiros em BRL via `Intl.NumberFormat('pt-BR')`. */
export function formatBRL(cents: Cents): string {
  return brlFormatter.format(cents / 100)
}
