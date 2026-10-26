/** Fuso civil do negócio: clientes do seed são do Ceará; Fortaleza não tem horário de verão. */
export const DEFAULT_BUSINESS_TIMEZONE = 'America/Fortaleza'

/**
 * Data civil `YYYY-MM-DD` no fuso informado.
 * Independente do TZ da máquina: o instante vem em `now` e o fuso em `timeZone`.
 */
export function businessDate(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}
