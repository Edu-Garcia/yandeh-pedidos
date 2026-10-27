import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api'
import {
  DRAFT_LOCKED_MESSAGE,
  SUBMIT_RETRY_DELAYS_MS,
  isRetryableSubmitFailure,
  nextSubmitRetryDelayMs,
  submitPendingMessage,
} from '@/submit-retry'

describe('submit retry helpers', () => {
  it('classifica falha de rede e 5xx como retentáveis', () => {
    expect(isRetryableSubmitFailure(new TypeError('Failed to fetch'))).toBe(true)
    expect(isRetryableSubmitFailure(new Error('network'))).toBe(true)
    expect(isRetryableSubmitFailure(new ApiError(500, 'falha temporária'))).toBe(true)
    expect(isRetryableSubmitFailure(new ApiError(502, 'bad gateway'))).toBe(true)
    expect(isRetryableSubmitFailure(new ApiError(503, 'indisponível'))).toBe(true)
  })

  it('não retenta 422 nem demais 4xx', () => {
    expect(
      isRetryableSubmitFailure(
        new ApiError(422, 'Total líquido abaixo de R$ 300,00', [
          {
            code: 'BELOW_MINIMUM',
            message: 'Total líquido abaixo de R$ 300,00',
            minimum: 30000,
            net: 2690,
          },
        ]),
      ),
    ).toBe(false)
    expect(isRetryableSubmitFailure(new ApiError(400, 'corpo inválido'))).toBe(false)
    expect(isRetryableSubmitFailure(new ApiError(403, 'outra carteira'))).toBe(false)
    expect(isRetryableSubmitFailure(new ApiError(404, 'ausente'))).toBe(false)
    expect(isRetryableSubmitFailure(new ApiError(409, 'conflito'))).toBe(false)
  })

  it('backoff 1s, 2s, 4s, 8s, 16s e teto 30s', () => {
    expect(SUBMIT_RETRY_DELAYS_MS).toEqual([1000, 2000, 4000, 8000, 16000, 30000])
    expect(nextSubmitRetryDelayMs(0)).toBe(1000)
    expect(nextSubmitRetryDelayMs(1)).toBe(2000)
    expect(nextSubmitRetryDelayMs(2)).toBe(4000)
    expect(nextSubmitRetryDelayMs(3)).toBe(8000)
    expect(nextSubmitRetryDelayMs(4)).toBe(16000)
    expect(nextSubmitRetryDelayMs(5)).toBe(30000)
    expect(nextSubmitRetryDelayMs(8)).toBe(30000)
    expect(nextSubmitRetryDelayMs(-1)).toBe(1000)
  })

  it('mensagem de pendente conforme a conexão', () => {
    expect(submitPendingMessage(false)).toBe('Aguardando conexão')
    expect(submitPendingMessage(true)).toBe('Pendente de envio')
    expect(DRAFT_LOCKED_MESSAGE).toBe('Este pedido está aguardando envio e não pode ser editado.')
  })
})
