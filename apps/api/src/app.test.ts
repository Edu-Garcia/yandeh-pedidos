import { describe, expect, it } from 'vitest'
import { buildApp } from './app.js'

describe('GET /health', () => {
  it('responde ok', async () => {
    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
    await app.close()
  })
})

describe('POST /orders', () => {
  it.todo('com a mesma Idempotency-Key retorna o pedido já criado')
  it.todo('revalida as regras do @yandeh/shared e rejeita pedido abaixo do mínimo')
})
