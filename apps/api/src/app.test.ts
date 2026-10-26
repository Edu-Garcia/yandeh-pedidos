import { afterAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { db, pool } from './db/client.js'

afterAll(async () => {
  await pool.end()
})

describe('GET /health', () => {
  it('responde ok', async () => {
    const app = buildApp(db)
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
    await app.close()
  })
})

describe('GET /sellers', () => {
  it('lista os vendedores do seed com alçada percentual', async () => {
    const app = buildApp(db)
    const res = await app.inject({ method: 'GET', url: '/sellers' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([
      {
        id: 'V01',
        name: 'Carlos Menezes',
        supervisorId: 'S01',
        discountAuthorityPercent: 5,
      },
      {
        id: 'V02',
        name: 'Renata Lima',
        supervisorId: 'S01',
        discountAuthorityPercent: 7,
      },
      {
        id: 'V03',
        name: 'Paulo Andrade',
        supervisorId: 'S01',
        discountAuthorityPercent: 3,
      },
    ])
    await app.close()
  })
})

describe('GET /supervisors', () => {
  it('lista o supervisor do seed', async () => {
    const app = buildApp(db)
    const res = await app.inject({ method: 'GET', url: '/supervisors' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([{ id: 'S01', name: 'Marta Fernandes' }])
    await app.close()
  })
})

describe('GET /sellers/:id/customers', () => {
  it('V01 retorna exatamente C001–C004 com tabela efetiva e crédito disponível', async () => {
    const app = buildApp(db)
    const res = await app.inject({ method: 'GET', url: '/sellers/V01/customers' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([
      {
        id: 'C001',
        tradeName: 'Mercadinho São José',
        city: 'Fortaleza',
        uf: 'CE',
        priceTableId: 'TP01',
        isFallback: false,
        availableCredit: 380000,
      },
      {
        id: 'C002',
        tradeName: 'Minibox Bom Preço',
        city: 'Fortaleza',
        uf: 'CE',
        priceTableId: 'TP02',
        isFallback: false,
        availableCredit: 35000,
      },
      {
        id: 'C003',
        tradeName: 'Conveniência Esquina',
        city: 'Caucaia',
        uf: 'CE',
        priceTableId: 'TP01',
        isFallback: false,
        availableCredit: 250000,
      },
      {
        id: 'C004',
        tradeName: 'Mercearia Dona Lúcia',
        city: 'Maracanaú',
        uf: 'CE',
        priceTableId: 'TP01',
        isFallback: true,
        availableCredit: 300000,
      },
    ])
    await app.close()
  })

  it('vendedor inexistente retorna 404', async () => {
    const app = buildApp(db)
    const res = await app.inject({ method: 'GET', url: '/sellers/V99/customers' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ message: 'Vendedor não encontrado' })
    await app.close()
  })
})

describe('POST /orders', () => {
  it.todo('com a mesma Idempotency-Key retorna o pedido já criado')
  it.todo('revalida as regras do @yandeh/shared e rejeita pedido abaixo do mínimo')
})
