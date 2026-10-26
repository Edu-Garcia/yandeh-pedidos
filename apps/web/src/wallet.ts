import { MINIMUM_ORDER_CENTS, type Cents } from '@yandeh/shared'

/** RN08/RN09: crédito disponível não cobre o pedido mínimo (R$ 300). */
export function isCreditBelowMinimum(availableCredit: Cents): boolean {
  return availableCredit < MINIMUM_ORDER_CENTS
}

/** Cidade e UF no formato do PRD §7.2 (ex.: Fortaleza/CE). */
export function formatCityUf(city: string, uf: string): string {
  return `${city}/${uf}`
}
