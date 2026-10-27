import type { RepeatRemovedItem } from '@/api'

const REMOVAL_REASON_LABEL: Record<string, string> = {
  'Produto inativo': 'inativo',
  'Produto sem preço na tabela': 'sem preço',
  'Produto não encontrado no catálogo': 'ausente',
}

/**
 * Data civil `YYYY-MM-DD` → `dd/mm/aaaa` sem passar por `Date` (A38).
 * `new Date('2026-09-15')` é meia-noite UTC e atrasaria um dia em Fortaleza.
 */
export function formatCivilDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) return isoDate
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

/** Aviso de item removido no repeat: descrição + motivo, sem id (A36, A39). */
export function formatRemovedItem(item: Pick<RepeatRemovedItem, 'description' | 'reason'>): string {
  const name = item.description?.trim() || 'Produto'
  const label = REMOVAL_REASON_LABEL[item.reason] ?? item.reason
  return `${name} removido (${label})`
}
