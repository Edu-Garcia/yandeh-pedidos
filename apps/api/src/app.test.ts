import { randomUUID } from 'node:crypto'
import { businessDate } from '@yandeh/shared'
import { eq, inArray, notInArray } from 'drizzle-orm'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { db, pool } from './db/client.js'
import { clientes, pedidos, pedidosItens } from './db/schema.js'

const SEED_ORDER_IDS = ['PH001', 'PH002', 'PH003', 'PH004']

/** `credito_utilizado` do seed em centavos — POST Enviado altera a coluna. */
const SEED_CREDIT_USED = {
  C001: 120000,
  C002: 1165000,
  C003: 0,
  C004: 0,
  C005: 830000,
  C006: 390000,
  C007: 150000,
  C008: 50000,
  C009: 200000,
  C010: 450000,
} as const

function civilDate(value: string | Date | null | undefined): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  return String(value).slice(0, 10)
}

const exampleC001Items = [
  { productId: 'P001', quantity: 10, discountPercent: 0 },
  { productId: 'P006', quantity: 40, discountPercent: 2 },
  { productId: 'P010', quantity: 24, discountPercent: 0 },
]

async function deleteNonSeedOrders() {
  const extras = await db
    .select({ id: pedidos.id })
    .from(pedidos)
    .where(notInArray(pedidos.id, SEED_ORDER_IDS))
  const ids = extras.map((row) => row.id)
  if (ids.length === 0) {
    return
  }
  await db.delete(pedidosItens).where(inArray(pedidosItens.pedidoId, ids))
  await db.delete(pedidos).where(inArray(pedidos.id, ids))
}

async function restoreSeedCreditUsed() {
  await Promise.all(
    Object.entries(SEED_CREDIT_USED).map(([id, creditUsed]) =>
      db.update(clientes).set({ creditoUtilizadoCentavos: creditUsed }).where(eq(clientes.id, id)),
    ),
  )
}

async function resetOrdersAndCredit() {
  await deleteNonSeedOrders()
  await restoreSeedCreditUsed()
}

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
        priceTableName: 'Tabela Padrão',
        isFallback: false,
        availableCredit: 380000,
      },
      {
        id: 'C002',
        tradeName: 'Minibox Bom Preço',
        city: 'Fortaleza',
        uf: 'CE',
        priceTableId: 'TP02',
        priceTableName: 'Tabela Volume',
        isFallback: false,
        availableCredit: 35000,
      },
      {
        id: 'C003',
        tradeName: 'Conveniência Esquina',
        city: 'Caucaia',
        uf: 'CE',
        priceTableId: 'TP01',
        priceTableName: 'Tabela Padrão',
        isFallback: false,
        availableCredit: 250000,
      },
      {
        id: 'C004',
        tradeName: 'Mercearia Dona Lúcia',
        city: 'Maracanaú',
        uf: 'CE',
        priceTableId: 'TP01',
        priceTableName: 'Tabela Padrão',
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

describe('GET /customers/:id/products', () => {
  it('q=achocolatado em C001/V01 retorna P009 e P023 e omite inativos', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'GET',
      url: '/customers/C001/products?q=achocolatado',
      headers: { 'x-seller-id': 'V01' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Array<{ id: string; description: string; ean: string }>
    expect(body.map((item) => item.id)).toEqual(['P009', 'P023'])
    expect(body.map((item) => item.description)).toEqual([
      'Achocolatado em Pó 400g',
      'Achocolatado em Pó 400g Sachê',
    ])
    expect(body.every((item) => item.ean === '7891831978575')).toBe(true)
    expect(body.some((item) => item.id === 'P021' || item.id === 'P022')).toBe(false)
    await app.close()
  })

  it('q=7891831978575 em C001/V01 retorna P009 e P023 (EAN duplicado)', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'GET',
      url: '/customers/C001/products?q=7891831978575',
      headers: { 'x-seller-id': 'V01' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Array<{ id: string }>
    expect(body.map((item) => item.id)).toEqual(['P009', 'P023'])
    expect(body.some((item) => item.id === 'P021' || item.id === 'P022')).toBe(false)
    await app.close()
  })

  it('C004 usa preços da TP01 (fallback): P001 = 2690', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'GET',
      url: '/customers/C004/products?q=arroz',
      headers: { 'x-seller-id': 'V01' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([
      {
        id: 'P001',
        sku: 'SKU-1000',
        ean: '7891958224128',
        description: 'Arroz Branco Tipo 1 5kg',
        category: 'mercearia',
        brand: 'Grão Fino',
        saleUnit: 'UN',
        packFactor: 1,
        multipleOnly: false,
        unitPrice: 2690,
      },
    ])
    await app.close()
  })

  it('cliente de outra carteira retorna 403', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'GET',
      url: '/customers/C005/products?q=arroz',
      headers: { 'x-seller-id': 'V01' },
    })
    expect(res.statusCode).toBe(403)
    expect(res.json()).toEqual({ message: 'Cliente não pertence à carteira do vendedor' })
    await app.close()
  })
})

describe('POST /orders', () => {
  beforeEach(resetOrdersAndCredit)
  afterEach(resetOrdersAndCredit)

  it('exemplo C001 cria pedido Enviado com líquido 51930', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: {
        'x-seller-id': 'V01',
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
      },
      payload: { customerId: 'C001', items: exampleC001Items },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json() as {
      id: string
      status: string
      totals: { gross: number; discount: number; net: number }
      items: Array<{ productId: string; unitPrice: number }>
    }
    expect(body.status).toBe('Enviado')
    expect(body.totals).toEqual({ gross: 52196, discount: 266, net: 51930 })
    expect(body.items).toEqual([
      { productId: 'P001', quantity: 10, unitPrice: 2690, discountPercent: 0 },
      { productId: 'P006', quantity: 40, unitPrice: 333, discountPercent: 2 },
      { productId: 'P010', quantity: 24, unitPrice: 499, discountPercent: 0 },
    ])

    const [order] = await db
      .select()
      .from(pedidos)
      .where(inArray(pedidos.id, [body.id]))
    expect(order?.status).toBe('Enviado')
    const lines = await db
      .select()
      .from(pedidosItens)
      .where(inArray(pedidosItens.pedidoId, [body.id]))
    expect(
      lines.map((line) => ({
        productId: line.produtoId,
        quantity: line.quantidade,
        unitPrice: line.precoUnidadeCentavos,
        discountPercent: line.descontoPercentual,
      })),
    ).toEqual([
      { productId: 'P001', quantity: 10, unitPrice: 2690, discountPercent: 0 },
      { productId: 'P006', quantity: 40, unitPrice: 333, discountPercent: 2 },
      { productId: 'P010', quantity: 24, unitPrice: 499, discountPercent: 0 },
    ])
    const [c001] = await db
      .select({ creditUsed: clientes.creditoUtilizadoCentavos })
      .from(clientes)
      .where(eq(clientes.id, 'C001'))
    expect(c001?.creditUsed).toBe(SEED_CREDIT_USED.C001 + 51930)
    await app.close()
  })

  it('arroz a 6% cria pedido Aguardando aprovação', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: {
        'x-seller-id': 'V01',
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
      },
      payload: {
        customerId: 'C001',
        items: [
          { productId: 'P001', quantity: 10, discountPercent: 6 },
          { productId: 'P006', quantity: 40, discountPercent: 2 },
          { productId: 'P010', quantity: 24, discountPercent: 0 },
        ],
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json() as { status: string; totals: { net: number } }
    expect(body.status).toBe('Aguardando aprovação')
    expect(body.totals.net).toBe(50316)
    const [c001] = await db
      .select({ creditUsed: clientes.creditoUtilizadoCentavos })
      .from(clientes)
      .where(eq(clientes.id, 'C001'))
    expect(c001?.creditUsed).toBe(SEED_CREDIT_USED.C001)
    await app.close()
  })

  it('líquido abaixo do mínimo retorna 422 BELOW_MINIMUM', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: {
        'x-seller-id': 'V01',
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
      },
      payload: {
        customerId: 'C001',
        items: [{ productId: 'P001', quantity: 1, discountPercent: 0 }],
      },
    })

    expect(res.statusCode).toBe(422)
    const body = res.json() as Array<{ code: string; minimum: number; net: number }>
    expect(body.some((issue) => issue.code === 'BELOW_MINIMUM')).toBe(true)
    expect(body).toContainEqual({
      code: 'BELOW_MINIMUM',
      message: 'Total líquido abaixo de R$ 300,00',
      minimum: 30000,
      net: 2690,
    })
    await app.close()
  })

  it('grava a data civil no fuso do negócio, não em UTC', async () => {
    const frozen = new Date('2026-10-27T02:30:00.000Z')
    const app = buildApp(db, { now: () => frozen })
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: {
        'x-seller-id': 'V01',
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
      },
      payload: { customerId: 'C001', items: exampleC001Items },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json() as { id: string }
    const [order] = await db
      .select({ data: pedidos.data })
      .from(pedidos)
      .where(eq(pedidos.id, body.id))
    expect(frozen.toISOString().slice(0, 10)).toBe('2026-10-27')
    expect(civilDate(order?.data)).toBe('2026-10-26')
    expect(civilDate(order?.data)).toBe(businessDate(frozen, 'America/Fortaleza'))
    await app.close()
  })

  it('C002 com P001 qty 16 na TP02 retorna 422 INSUFFICIENT_CREDIT', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: {
        'x-seller-id': 'V01',
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
      },
      payload: {
        customerId: 'C002',
        items: [{ productId: 'P001', quantity: 16, discountPercent: 0 }],
      },
    })

    expect(res.statusCode).toBe(422)
    expect(res.json()).toContainEqual({
      code: 'INSUFFICIENT_CREDIT',
      message: 'Total líquido acima do crédito disponível',
      available: 35000,
      net: 40464,
    })
    const extras = await db
      .select({ id: pedidos.id })
      .from(pedidos)
      .where(notInArray(pedidos.id, SEED_ORDER_IDS))
    expect(extras).toHaveLength(0)
    await app.close()
  })

  it('C002 pendente de 32000 reserva crédito e disponível cai para 3000', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: {
        'x-seller-id': 'V01',
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
      },
      payload: {
        customerId: 'C002',
        items: [
          { productId: 'P001', quantity: 11, discountPercent: 6 },
          { productId: 'P008', quantity: 13, discountPercent: 0 },
        ],
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json() as { status: string; totals: { net: number } }
    expect(body.status).toBe('Aguardando aprovação')
    expect(body.totals.net).toBe(32000)

    const [c002] = await db
      .select({ creditUsed: clientes.creditoUtilizadoCentavos })
      .from(clientes)
      .where(eq(clientes.id, 'C002'))
    expect(c002?.creditUsed).toBe(SEED_CREDIT_USED.C002)

    const wallet = await app.inject({ method: 'GET', url: '/sellers/V01/customers' })
    expect(wallet.statusCode).toBe(200)
    const customers = wallet.json() as Array<{ id: string; availableCredit: number }>
    expect(customers.find((customer) => customer.id === 'C002')?.availableCredit).toBe(3000)
    await app.close()
  })

  it('dois POSTs concorrentes que somados estouram o crédito: só um passa', async () => {
    const app = buildApp(db)
    const payload = {
      customerId: 'C002',
      items: [{ productId: 'P001', quantity: 12, discountPercent: 0 }],
    }
    const headers = () => ({
      'x-seller-id': 'V01',
      'content-type': 'application/json',
      'idempotency-key': randomUUID(),
    })

    const [first, second] = await Promise.all([
      app.inject({ method: 'POST', url: '/orders', headers: headers(), payload }),
      app.inject({ method: 'POST', url: '/orders', headers: headers(), payload }),
    ])

    const statuses = [first.statusCode, second.statusCode].sort()
    expect(statuses).toEqual([201, 422])

    const failed = first.statusCode === 422 ? first : second
    const issues = failed.json() as Array<{ code: string; available: number; net: number }>
    expect(issues).toContainEqual({
      code: 'INSUFFICIENT_CREDIT',
      message: 'Total líquido acima do crédito disponível',
      available: 4652,
      net: 30348,
    })

    const extras = await db.select().from(pedidos).where(notInArray(pedidos.id, SEED_ORDER_IDS))
    expect(extras).toHaveLength(1)
    expect(extras[0]?.status).toBe('Enviado')

    const [c002] = await db
      .select({ creditUsed: clientes.creditoUtilizadoCentavos })
      .from(clientes)
      .where(eq(clientes.id, 'C002'))
    expect(c002?.creditUsed).toBe(SEED_CREDIT_USED.C002 + 30348)
    await app.close()
  })

  it('V01 pedindo para C005 retorna 403', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: {
        'x-seller-id': 'V01',
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
      },
      payload: { customerId: 'C005', items: exampleC001Items },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json()).toEqual({ message: 'Cliente não pertence à carteira do vendedor' })
    await app.close()
  })

  it('sem Idempotency-Key retorna 400', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: {
        'x-seller-id': 'V01',
        'content-type': 'application/json',
      },
      payload: { customerId: 'C001', items: exampleC001Items },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({
      message: 'Cabeçalho Idempotency-Key é obrigatório e deve ser um UUID',
    })
    const extras = await db.select().from(pedidos).where(notInArray(pedidos.id, SEED_ORDER_IDS))
    expect(extras).toHaveLength(0)
    await app.close()
  })

  it('Idempotency-Key inválida retorna 400', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: {
        'x-seller-id': 'V01',
        'content-type': 'application/json',
        'idempotency-key': 'nao-e-uuid',
      },
      payload: { customerId: 'C001', items: exampleC001Items },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({
      message: 'Cabeçalho Idempotency-Key é obrigatório e deve ser um UUID',
    })
    await app.close()
  })

  it('com a mesma Idempotency-Key retorna o pedido já criado', async () => {
    const app = buildApp(db)
    const key = randomUUID()
    const headers = {
      'x-seller-id': 'V01',
      'content-type': 'application/json',
      'idempotency-key': key,
    }
    const payload = { customerId: 'C001', items: exampleC001Items }

    const first = await app.inject({ method: 'POST', url: '/orders', headers, payload })
    expect(first.statusCode).toBe(201)
    const created = first.json() as { id: string; totals: { net: number } }

    const second = await app.inject({ method: 'POST', url: '/orders', headers, payload })
    expect(second.statusCode).toBe(200)
    expect(second.json()).toEqual(created)

    const extras = await db.select().from(pedidos).where(eq(pedidos.idempotencyKey, key))
    expect(extras).toHaveLength(1)
    expect(extras[0]?.id).toBe(created.id)

    const [c001] = await db
      .select({ creditUsed: clientes.creditoUtilizadoCentavos })
      .from(clientes)
      .where(eq(clientes.id, 'C001'))
    expect(c001?.creditUsed).toBe(SEED_CREDIT_USED.C001 + 51930)
    await app.close()
  })

  it('mesma chave de outro vendedor retorna 409 sem gravar nem alterar crédito', async () => {
    const app = buildApp(db)
    const key = randomUUID()
    const first = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: {
        'x-seller-id': 'V01',
        'content-type': 'application/json',
        'idempotency-key': key,
      },
      payload: { customerId: 'C001', items: exampleC001Items },
    })
    expect(first.statusCode).toBe(201)

    const conflict = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: {
        'x-seller-id': 'V02',
        'content-type': 'application/json',
        'idempotency-key': key,
      },
      payload: { customerId: 'C005', items: exampleC001Items },
    })
    expect(conflict.statusCode).toBe(409)
    expect(conflict.json()).toEqual({
      message: 'Idempotency-Key já foi usada em outro pedido',
      code: 'IDEMPOTENCY_KEY_CONFLICT',
    })
    expect(conflict.json()).not.toHaveProperty('id')

    const extras = await db.select().from(pedidos).where(eq(pedidos.idempotencyKey, key))
    expect(extras).toHaveLength(1)
    expect(extras[0]?.clienteId).toBe('C001')
    expect(extras[0]?.vendedorId).toBe('V01')

    const [c001, c005] = await Promise.all([
      db
        .select({ creditUsed: clientes.creditoUtilizadoCentavos })
        .from(clientes)
        .where(eq(clientes.id, 'C001')),
      db
        .select({ creditUsed: clientes.creditoUtilizadoCentavos })
        .from(clientes)
        .where(eq(clientes.id, 'C005')),
    ])
    expect(c001[0]?.creditUsed).toBe(SEED_CREDIT_USED.C001 + 51930)
    expect(c005[0]?.creditUsed).toBe(SEED_CREDIT_USED.C005)
    await app.close()
  })

  it('mesma chave para outro cliente do mesmo vendedor retorna 409 sem gravar nem alterar crédito', async () => {
    const app = buildApp(db)
    const key = randomUUID()
    const first = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: {
        'x-seller-id': 'V01',
        'content-type': 'application/json',
        'idempotency-key': key,
      },
      payload: { customerId: 'C001', items: exampleC001Items },
    })
    expect(first.statusCode).toBe(201)

    const conflict = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: {
        'x-seller-id': 'V01',
        'content-type': 'application/json',
        'idempotency-key': key,
      },
      payload: { customerId: 'C003', items: exampleC001Items },
    })
    expect(conflict.statusCode).toBe(409)
    expect(conflict.json()).toEqual({
      message: 'Idempotency-Key já foi usada em outro pedido',
      code: 'IDEMPOTENCY_KEY_CONFLICT',
    })
    expect(conflict.json()).not.toHaveProperty('id')

    const extras = await db.select().from(pedidos).where(eq(pedidos.idempotencyKey, key))
    expect(extras).toHaveLength(1)
    expect(extras[0]?.clienteId).toBe('C001')

    const [c001, c003] = await Promise.all([
      db
        .select({ creditUsed: clientes.creditoUtilizadoCentavos })
        .from(clientes)
        .where(eq(clientes.id, 'C001')),
      db
        .select({ creditUsed: clientes.creditoUtilizadoCentavos })
        .from(clientes)
        .where(eq(clientes.id, 'C003')),
    ])
    expect(c001[0]?.creditUsed).toBe(SEED_CREDIT_USED.C001 + 51930)
    expect(c003[0]?.creditUsed).toBe(SEED_CREDIT_USED.C003)
    await app.close()
  })

  it('dois POSTs concorrentes com a mesma chave: uma linha e o mesmo id', async () => {
    const app = buildApp(db)
    const key = randomUUID()
    const headers = {
      'x-seller-id': 'V01',
      'content-type': 'application/json',
      'idempotency-key': key,
    }
    const payload = { customerId: 'C001', items: exampleC001Items }

    const [first, second] = await Promise.all([
      app.inject({ method: 'POST', url: '/orders', headers, payload }),
      app.inject({ method: 'POST', url: '/orders', headers, payload }),
    ])

    const statuses = [first.statusCode, second.statusCode].sort()
    expect(statuses).toEqual([200, 201])

    const firstBody = first.json() as { id: string }
    const secondBody = second.json() as { id: string }
    expect(firstBody.id).toBe(secondBody.id)

    const extras = await db.select().from(pedidos).where(eq(pedidos.idempotencyKey, key))
    expect(extras).toHaveLength(1)
    expect(extras[0]?.id).toBe(firstBody.id)

    const [c001] = await db
      .select({ creditUsed: clientes.creditoUtilizadoCentavos })
      .from(clientes)
      .where(eq(clientes.id, 'C001'))
    expect(c001?.creditUsed).toBe(SEED_CREDIT_USED.C001 + 51930)
    await app.close()
  })
})
