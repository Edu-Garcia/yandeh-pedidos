import { ApiError } from '@/api'

/** Backoff do auto-retry: 1s, 2s, 4s, 8s, 16s e teto de 30s (A52). */
export const SUBMIT_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000] as const

export function nextSubmitRetryDelayMs(attempt: number): number {
  const last = SUBMIT_RETRY_DELAYS_MS.length - 1
  const index = Math.min(Math.max(attempt, 0), last)
  return SUBMIT_RETRY_DELAYS_MS[index] ?? 30_000
}

/** Rede (fetch lança) e 5xx retentam; 422 e demais 4xx não (A50). */
export function isRetryableSubmitFailure(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status >= 500 && error.status <= 599
  }
  return true
}

export const DRAFT_LOCKED_MESSAGE = 'Este pedido está aguardando envio e não pode ser editado.'

export function submitPendingMessage(online: boolean): string {
  return online ? 'Pendente de envio' : 'Aguardando conexão'
}
