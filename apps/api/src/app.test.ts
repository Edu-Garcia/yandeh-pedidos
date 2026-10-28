import { randomUUID } from 'node:crypto'
import {
  businessDate,
  orderTotals,
  type CustomerProduct,
  type OrderLineInput,
} from '@yandeh/shared'
import { eq, inArray, notInArray } from 'drizzle-orm'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { db, pool } from './db/client.js'
import { clientes, pedidos, pedidosItens, produtos, supervisores } from './db/schema.js'
import { databaseNameFromUrl, resolveTestDatabaseUrl } from './db/test-database-url.js'
import { resetTestData } from './test/reset-test-data.js'

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

/** Preços/descontos congelados do seed (PH001 / PH002 / PH004). */
const historyPH001Lines: OrderLineInput[] = [
  { productId: 'P001', quantityUnits: 10, unitPrice: 2590, discountPercent: 0 },
  { productId: 'P006', quantityUnits: 40, unitPrice: 329, discountPercent: 2 },
  { productId: 'P010', quantityUnits: 24, unitPrice: 489, discountPercent: 0 },
  { productId: 'P022', quantityUnits: 30, unitPrice: 259, discountPercent: 0 },
]

const historyPH002Lines: OrderLineInput[] = [
  { productId: 'P002', quantityUnits: 15, unitPrice: 749, discountPercent: 5 },
  { productId: 'P011', quantityUnits: 12, unitPrice: 879, discountPercent: 0 },
  { productId: 'P015', quantityUnits: 24, unitPrice: 239, discountPercent: 0 },
]

const historyPH004Lines: OrderLineInput[] = [
  { productId: 'P003', quantityUnits: 20, unitPrice: 513, discountPercent: 0 },
]

const customerProductP001: CustomerProduct = {
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
}

const customerProductP003: CustomerProduct = {
  id: 'P003',
  sku: 'SKU-1002',
  ean: '7891133568863',
  description: 'Açúcar Cristal 1kg',
  category: 'mercearia',
  brand: 'Doce Vale',
  saleUnit: 'FD',
  packFactor: 10,
  multipleOnly: true,
  unitPrice: 513,
}

const customerProductP004: CustomerProduct = {
  id: 'P004',
  sku: 'SKU-1003',
  ean: '7891469138105',
  description: 'Óleo de Soja 900ml',
  category: 'mercearia',
  brand: 'Soyara',
  saleUnit: 'CX',
  packFactor: 20,
  multipleOnly: false,
  unitPrice: 719,
}

const customerProductP006: CustomerProduct = {
  id: 'P006',
  sku: 'SKU-1005',
  ean: '7891399588384',
  description: 'Macarrão Espaguete 500g',
  category: 'mercearia',
  brand: 'Massa Boa',
  saleUnit: 'FD',
  packFactor: 20,
  multipleOnly: true,
  unitPrice: 333,
}

const customerProductP010: CustomerProduct = {
  id: 'P010',
  sku: 'SKU-1009',
  ean: '7891216687320',
  description: 'Leite UHT Integral 1L',
  category: 'bebidas',
  brand: 'Vale Verde',
  saleUnit: 'CX',
  packFactor: 12,
  multipleOnly: true,
  unitPrice: 499,
}

const SEED_PACK_FACTOR = { P004: 20, P006: 20 } as const

async function restoreSeedPackFactors() {
  await Promise.all([
    db
      .update(produtos)
      .set({ fatorEmbalagem: SEED_PACK_FACTOR.P004 })
      .where(eq(produtos.id, 'P004')),
    db
      .update(produtos)
      .set({ fatorEmbalagem: SEED_PACK_FACTOR.P006 })
      .where(eq(produtos.id, 'P006')),
  ])
}

async function countOrders(): Promise<number> {
  const rows = await db.select({ id: pedidos.id }).from(pedidos)
  return rows.length
}

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

beforeEach(async () => {
  await resetTestData(db)
})

afterAll(async () => {
  await pool.end()
})

describe('banco de teste isolado', () => {
  it('não usa o banco de desenvolvimento', async () => {
    const { rows } = await pool.query<{ current_database: string }>('select current_database()')
    const name = rows[0]?.current_database
    expect(name).toBe(databaseNameFromUrl(resolveTestDatabaseUrl()))
    expect(name).not.toBe('yandeh')
  })
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
    const res = await app.inject({
      method: 'GET',
      url: '/sellers/V01/customers',
      headers: { 'x-seller-id': 'V01' },
    })
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

  it('carteira de outro vendedor retorna o mesmo 404 de vendedor inexistente', async () => {
    const app = buildApp(db)
    const otherSeller = await app.inject({
      method: 'GET',
      url: '/sellers/V02/customers',
      headers: { 'x-seller-id': 'V01' },
    })
    const missing = await app.inject({
      method: 'GET',
      url: '/sellers/V99/customers',
      headers: { 'x-seller-id': 'V01' },
    })
    expect(missing.statusCode).toBe(404)
    expect(missing.json()).toEqual({ message: 'Vendedor não encontrado' })
    expect(otherSeller.statusCode).toBe(missing.statusCode)
    expect(otherSeller.json()).toEqual(missing.json())
    await app.close()
  })

  it('sem X-Seller-Id retorna 400', async () => {
    const app = buildApp(db)
    const res = await app.inject({ method: 'GET', url: '/sellers/V01/customers' })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ message: 'Cabeçalho X-Seller-Id é obrigatório' })
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

  it('cliente de outra carteira retorna o mesmo 404 de cliente inexistente', async () => {
    const app = buildApp(db)
    const otherWallet = await app.inject({
      method: 'GET',
      url: '/customers/C005/products?q=arroz',
      headers: { 'x-seller-id': 'V01' },
    })
    const missing = await app.inject({
      method: 'GET',
      url: '/customers/C999/products?q=arroz',
      headers: { 'x-seller-id': 'V01' },
    })
    expect(missing.statusCode).toBe(404)
    expect(missing.json()).toEqual({ message: 'Cliente não encontrado' })
    expect(otherWallet.statusCode).toBe(missing.statusCode)
    expect(otherWallet.json()).toEqual(missing.json())
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

    const wallet = await app.inject({
      method: 'GET',
      url: '/sellers/V01/customers',
      headers: { 'x-seller-id': 'V01' },
    })
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

  it('V01 pedindo para C005 retorna o mesmo 404 de cliente inexistente', async () => {
    const app = buildApp(db)
    const headers = {
      'x-seller-id': 'V01',
      'content-type': 'application/json',
    }
    const otherWallet = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { ...headers, 'idempotency-key': randomUUID() },
      payload: { customerId: 'C005', items: exampleC001Items },
    })
    const missing = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { ...headers, 'idempotency-key': randomUUID() },
      payload: { customerId: 'C999', items: exampleC001Items },
    })

    expect(missing.statusCode).toBe(404)
    expect(missing.json()).toEqual({ message: 'Cliente não encontrado' })
    expect(otherWallet.statusCode).toBe(missing.statusCode)
    expect(otherWallet.json()).toEqual(missing.json())
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

describe('GET /customers/:id/orders', () => {
  beforeEach(resetOrdersAndCredit)
  afterEach(resetOrdersAndCredit)

  it('C001 lista PH001 e PH002 com status e total líquido congelado, mais recentes primeiro', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'GET',
      url: '/customers/C001/orders',
      headers: { 'x-seller-id': 'V01' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([
      {
        id: 'PH002',
        date: '2026-10-02',
        status: 'Faturado',
        total: orderTotals(historyPH002Lines).net,
      },
      {
        id: 'PH001',
        date: '2026-09-15',
        status: 'Faturado',
        total: orderTotals(historyPH001Lines).net,
      },
    ])
    await app.close()
  })

  it('C006 lista o PH004 Cancelado com status e total', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'GET',
      url: '/customers/C006/orders',
      headers: { 'x-seller-id': 'V02' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([
      {
        id: 'PH004',
        date: '2026-10-05',
        status: 'Cancelado',
        total: orderTotals(historyPH004Lines).net,
      },
    ])
    await app.close()
  })

  it('cliente de outra carteira retorna o mesmo 404 de cliente inexistente', async () => {
    const app = buildApp(db)
    const otherWallet = await app.inject({
      method: 'GET',
      url: '/customers/C005/orders',
      headers: { 'x-seller-id': 'V01' },
    })
    const missing = await app.inject({
      method: 'GET',
      url: '/customers/C999/orders',
      headers: { 'x-seller-id': 'V01' },
    })
    expect(missing.statusCode).toBe(404)
    expect(missing.json()).toEqual({ message: 'Cliente não encontrado' })
    expect(otherWallet.statusCode).toBe(missing.statusCode)
    expect(otherWallet.json()).toEqual(missing.json())
    await app.close()
  })

  it('cliente inexistente retorna 404', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'GET',
      url: '/customers/C999/orders',
      headers: { 'x-seller-id': 'V01' },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ message: 'Cliente não encontrado' })
    await app.close()
  })

  it('sem X-Seller-Id retorna 400', async () => {
    const app = buildApp(db)
    const res = await app.inject({ method: 'GET', url: '/customers/C001/orders' })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ message: 'Cabeçalho X-Seller-Id é obrigatório' })
    await app.close()
  })
})

describe('POST /customers/:id/orders/:orderId/repeat', () => {
  beforeEach(async () => {
    await restoreSeedPackFactors()
    await resetOrdersAndCredit()
  })
  afterEach(async () => {
    await restoreSeedPackFactors()
    await resetOrdersAndCredit()
  })

  it('PH001 monta rascunho sem P022, preço atual e descontos 0, sem criar pedido', async () => {
    const app = buildApp(db)
    const before = await countOrders()
    const res = await app.inject({
      method: 'POST',
      url: '/customers/C001/orders/PH001/repeat',
      headers: { 'x-seller-id': 'V01' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      lines: Array<{
        productId: string
        product: CustomerProduct
        quantityUnits: number
        discountPercent: number
        lots: number | null
      }>
      removed: Array<{ productId: string; description: string; ean: string; reason: string }>
      notices: unknown[]
    }
    expect(body.lines.map((line) => line.productId)).toEqual(['P001', 'P006', 'P010'])
    expect(body.removed).toEqual([
      {
        productId: 'P022',
        description: 'Biscoito Recheado Chocolate 140g',
        ean: '7891366875370',
        reason: 'Produto inativo',
      },
    ])
    expect(body.lines[0]).toEqual({
      productId: 'P001',
      product: customerProductP001,
      quantityUnits: 10,
      discountPercent: 0,
      lots: 10,
    })
    expect(body.lines[1]).toEqual({
      productId: 'P006',
      product: customerProductP006,
      quantityUnits: 40,
      discountPercent: 0,
      lots: 2,
    })
    expect(body.lines[2]).toEqual({
      productId: 'P010',
      product: customerProductP010,
      quantityUnits: 24,
      discountPercent: 0,
      lots: 2,
    })
    expect(body.lines.every((line) => line.discountPercent === 0)).toBe(true)
    expect(body.notices).toEqual([])
    expect(await countOrders()).toBe(before)
    await app.close()
  })

  it('PH004 Cancelado é repetível e não cria pedido', async () => {
    const app = buildApp(db)
    const before = await countOrders()
    const res = await app.inject({
      method: 'POST',
      url: '/customers/C006/orders/PH004/repeat',
      headers: { 'x-seller-id': 'V02' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      lines: [
        {
          productId: 'P003',
          product: customerProductP003,
          quantityUnits: 20,
          discountPercent: 0,
          lots: 2,
        },
      ],
      removed: [],
      notices: [],
    })
    expect(await countOrders()).toBe(before)
    await app.close()
  })

  it('produto só-múltiplo com fator atual 12 e 30 un ajusta lote para cima', async () => {
    await db.update(produtos).set({ fatorEmbalagem: 12 }).where(eq(produtos.id, 'P006'))
    await db.insert(pedidos).values({
      id: 'PH-FACTOR-MULT',
      clienteId: 'C001',
      vendedorId: 'V01',
      data: '2026-10-20',
      status: 'Faturado',
    })
    await db.insert(pedidosItens).values({
      pedidoId: 'PH-FACTOR-MULT',
      produtoId: 'P006',
      quantidade: 30,
      precoUnidadeCentavos: 329,
      descontoPercentual: 0,
    })

    const app = buildApp(db)
    const res = await app.inject({
      method: 'POST',
      url: '/customers/C001/orders/PH-FACTOR-MULT/repeat',
      headers: { 'x-seller-id': 'V01' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { notices: Array<{ message: string }> }
    expect(body).toEqual({
      lines: [
        {
          productId: 'P006',
          product: { ...customerProductP006, packFactor: 12 },
          quantityUnits: 36,
          discountPercent: 0,
          lots: 3,
        },
      ],
      removed: [],
      notices: [
        {
          code: 'PACK_FACTOR_CHANGED',
          productId: 'P006',
          description: 'Macarrão Espaguete 500g',
          newFactor: 12,
          lots: 3,
          units: 36,
          message:
            'A quantidade de unidades por lote mudou para 12; a quantidade foi ajustada para 3 lote(s) (36 unidades)',
        },
      ],
    })
    expect(body.notices[0]?.message).not.toMatch(/P0\d{2}/)
    await app.close()
  })

  it('produto não só-múltiplo com fator 12 e 7 un mantém unidades e Lote vazio', async () => {
    await db.update(produtos).set({ fatorEmbalagem: 12 }).where(eq(produtos.id, 'P004'))
    await db.insert(pedidos).values({
      id: 'PH-FACTOR-UNIT',
      clienteId: 'C001',
      vendedorId: 'V01',
      data: '2026-10-21',
      status: 'Faturado',
    })
    await db.insert(pedidosItens).values({
      pedidoId: 'PH-FACTOR-UNIT',
      produtoId: 'P004',
      quantidade: 7,
      precoUnidadeCentavos: 719,
      descontoPercentual: 0,
    })

    const app = buildApp(db)
    const res = await app.inject({
      method: 'POST',
      url: '/customers/C001/orders/PH-FACTOR-UNIT/repeat',
      headers: { 'x-seller-id': 'V01' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { notices: Array<{ message: string }> }
    expect(body).toEqual({
      lines: [
        {
          productId: 'P004',
          product: { ...customerProductP004, packFactor: 12 },
          quantityUnits: 7,
          discountPercent: 0,
          lots: null,
        },
      ],
      removed: [],
      notices: [
        {
          code: 'LOT_NOT_EXACT',
          productId: 'P004',
          description: 'Óleo de Soja 900ml',
          newFactor: 12,
          lots: null,
          units: 7,
          message:
            'As unidades do histórico não fecham um lote com o fator atual (12); o campo Lote ficou vazio.',
        },
      ],
    })
    expect(body.notices[0]?.message).not.toMatch(/P0\d{2}/)
    await app.close()
  })

  it('cliente de outra carteira retorna o mesmo 404 de cliente inexistente', async () => {
    const app = buildApp(db)
    const otherWallet = await app.inject({
      method: 'POST',
      url: '/customers/C005/orders/PH003/repeat',
      headers: { 'x-seller-id': 'V01' },
    })
    const missing = await app.inject({
      method: 'POST',
      url: '/customers/C999/orders/PH001/repeat',
      headers: { 'x-seller-id': 'V01' },
    })
    expect(missing.statusCode).toBe(404)
    expect(missing.json()).toEqual({ message: 'Cliente não encontrado' })
    expect(otherWallet.statusCode).toBe(missing.statusCode)
    expect(otherWallet.json()).toEqual(missing.json())
    await app.close()
  })

  it('cliente inexistente retorna 404', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'POST',
      url: '/customers/C999/orders/PH001/repeat',
      headers: { 'x-seller-id': 'V01' },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ message: 'Cliente não encontrado' })
    await app.close()
  })

  it('pedido inexistente retorna 404', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'POST',
      url: '/customers/C001/orders/PH999/repeat',
      headers: { 'x-seller-id': 'V01' },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ message: 'Pedido não encontrado' })
    await app.close()
  })

  it('pedido de outro cliente retorna 404 sem vazar existência', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'POST',
      url: '/customers/C001/orders/PH004/repeat',
      headers: { 'x-seller-id': 'V01' },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ message: 'Pedido não encontrado' })
    await app.close()
  })

  it('sem X-Seller-Id retorna 400', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'POST',
      url: '/customers/C001/orders/PH001/repeat',
    })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ message: 'Cabeçalho X-Seller-Id é obrigatório' })
    await app.close()
  })
})

const pendingOrdersUrl = `/supervisor/orders?status=${encodeURIComponent('Aguardando aprovação')}`

/** 404 genérico do Fastify para rota inexistente (não vaza o recurso). */
function fastifyRouteNotFound(method: string, url: string) {
  return {
    message: `Route ${method}:${url} not found`,
    error: 'Not Found',
    statusCode: 404,
  }
}

const pendingC002Items = [
  { productId: 'P001', quantity: 11, discountPercent: 6 },
  { productId: 'P008', quantity: 13, discountPercent: 0 },
]

async function createPendingC002(app: ReturnType<typeof buildApp>) {
  const res = await app.inject({
    method: 'POST',
    url: '/orders',
    headers: {
      'x-seller-id': 'V01',
      'content-type': 'application/json',
      'idempotency-key': randomUUID(),
    },
    payload: { customerId: 'C002', items: pendingC002Items },
  })
  expect(res.statusCode).toBe(201)
  const body = res.json() as { id: string; status: string; totals: { net: number } }
  expect(body.status).toBe('Aguardando aprovação')
  expect(body.totals.net).toBe(32000)
  return body
}

async function availableCreditOf(app: ReturnType<typeof buildApp>, customerId: string) {
  const wallet = await app.inject({
    method: 'GET',
    url: '/sellers/V01/customers',
    headers: { 'x-seller-id': 'V01' },
  })
  expect(wallet.statusCode).toBe(200)
  const customers = wallet.json() as Array<{ id: string; availableCredit: number }>
  return customers.find((customer) => customer.id === customerId)?.availableCredit
}

describe('GET /supervisor/orders', () => {
  beforeEach(resetOrdersAndCredit)
  afterEach(resetOrdersAndCredit)

  it('lista o pendente de C002 com cliente, vendedor, data, total e maior desconto', async () => {
    const app = buildApp(db)
    const created = await createPendingC002(app)

    const res = await app.inject({
      method: 'GET',
      url: pendingOrdersUrl,
      headers: { 'x-supervisor-id': 'S01' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([
      {
        id: created.id,
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        status: 'Aguardando aprovação',
        total: 32000,
        maxDiscount: 6,
        customer: { id: 'C002', tradeName: 'Minibox Bom Preço' },
        seller: { id: 'V01', name: 'Carlos Menezes', discountAuthorityPercent: 5 },
      },
    ])
    await app.close()
  })

  it('não lista pedido Enviado', async () => {
    const app = buildApp(db)
    const sent = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: {
        'x-seller-id': 'V01',
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
      },
      payload: { customerId: 'C001', items: exampleC001Items },
    })
    expect(sent.statusCode).toBe(201)

    const res = await app.inject({
      method: 'GET',
      url: pendingOrdersUrl,
      headers: { 'x-supervisor-id': 'S01' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
    await app.close()
  })

  it('supervisor inexistente retorna o mesmo 404 de rota inexistente', async () => {
    const app = buildApp(db)
    const missingRoute = await app.inject({ method: 'GET', url: '/rota-inexistente' })
    const res = await app.inject({
      method: 'GET',
      url: pendingOrdersUrl,
      headers: { 'x-supervisor-id': 'S99' },
    })
    expect(missingRoute.statusCode).toBe(404)
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual(fastifyRouteNotFound('GET', pendingOrdersUrl))
    expect(res.json()).toEqual({
      ...missingRoute.json(),
      message: fastifyRouteNotFound('GET', pendingOrdersUrl).message,
    })
    expect(res.json()).not.toEqual(
      expect.objectContaining({ message: 'Supervisor não encontrado' }),
    )
    await app.close()
  })

  it('sem X-Supervisor-Id retorna o mesmo 404 de rota inexistente', async () => {
    const app = buildApp(db)
    const res = await app.inject({ method: 'GET', url: pendingOrdersUrl })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual(fastifyRouteNotFound('GET', pendingOrdersUrl))
    await app.close()
  })

  it('X-Supervisor-Id vazio retorna o mesmo 404 de rota inexistente', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'GET',
      url: pendingOrdersUrl,
      headers: { 'x-supervisor-id': '   ' },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual(fastifyRouteNotFound('GET', pendingOrdersUrl))
    await app.close()
  })

  it('supervisor inexistente com status ausente também retorna 404, não 400', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'GET',
      url: '/supervisor/orders',
      headers: { 'x-supervisor-id': 'S99' },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual(fastifyRouteNotFound('GET', '/supervisor/orders'))
    await app.close()
  })

  it('status ausente ou diferente de Aguardando aprovação retorna 400', async () => {
    const app = buildApp(db)
    const missing = await app.inject({
      method: 'GET',
      url: '/supervisor/orders',
      headers: { 'x-supervisor-id': 'S01' },
    })
    expect(missing.statusCode).toBe(400)
    expect(missing.json()).toEqual({
      message: 'Parâmetro status deve ser Aguardando aprovação',
    })

    const other = await app.inject({
      method: 'GET',
      url: '/supervisor/orders?status=Enviado',
      headers: { 'x-supervisor-id': 'S01' },
    })
    expect(other.statusCode).toBe(400)
    expect(other.json()).toEqual({
      message: 'Parâmetro status deve ser Aguardando aprovação',
    })
    await app.close()
  })
})

describe('POST /supervisor/orders/:id/approve e /reject', () => {
  beforeEach(resetOrdersAndCredit)
  afterEach(async () => {
    await db.delete(supervisores).where(eq(supervisores.id, 'S99'))
    await resetOrdersAndCredit()
  })

  it('rejeitar C002 de 32000 libera a reserva e o disponível volta a 35000', async () => {
    const app = buildApp(db)
    const created = await createPendingC002(app)
    expect(await availableCreditOf(app, 'C002')).toBe(3000)

    const res = await app.inject({
      method: 'POST',
      url: `/supervisor/orders/${created.id}/reject`,
      headers: { 'x-supervisor-id': 'S01' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      id: created.id,
      status: 'Rejeitado',
      total: 32000,
      maxDiscount: 6,
      customer: { id: 'C002', tradeName: 'Minibox Bom Preço' },
      seller: { id: 'V01', name: 'Carlos Menezes', discountAuthorityPercent: 5 },
    })
    expect(await availableCreditOf(app, 'C002')).toBe(35000)

    const [c002] = await db
      .select({ creditUsed: clientes.creditoUtilizadoCentavos })
      .from(clientes)
      .where(eq(clientes.id, 'C002'))
    expect(c002?.creditUsed).toBe(SEED_CREDIT_USED.C002)

    const list = await app.inject({
      method: 'GET',
      url: pendingOrdersUrl,
      headers: { 'x-supervisor-id': 'S01' },
    })
    expect(list.json()).toEqual([])
    await app.close()
  })

  it('aprovar C002 de 32000 soma 32000 no utilizado', async () => {
    const app = buildApp(db)
    const created = await createPendingC002(app)
    expect(await availableCreditOf(app, 'C002')).toBe(3000)

    const res = await app.inject({
      method: 'POST',
      url: `/supervisor/orders/${created.id}/approve`,
      headers: { 'x-supervisor-id': 'S01' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      id: created.id,
      status: 'Aprovado',
      total: 32000,
      customer: { id: 'C002', tradeName: 'Minibox Bom Preço' },
      seller: { id: 'V01', name: 'Carlos Menezes', discountAuthorityPercent: 5 },
    })

    const [c002] = await db
      .select({ creditUsed: clientes.creditoUtilizadoCentavos })
      .from(clientes)
      .where(eq(clientes.id, 'C002'))
    expect(c002?.creditUsed).toBe(SEED_CREDIT_USED.C002 + 32000)
    expect(await availableCreditOf(app, 'C002')).toBe(3000)
    await app.close()
  })

  it('aprovar duas vezes retorna 409', async () => {
    const app = buildApp(db)
    const created = await createPendingC002(app)

    const first = await app.inject({
      method: 'POST',
      url: `/supervisor/orders/${created.id}/approve`,
      headers: { 'x-supervisor-id': 'S01' },
    })
    expect(first.statusCode).toBe(200)

    const second = await app.inject({
      method: 'POST',
      url: `/supervisor/orders/${created.id}/approve`,
      headers: { 'x-supervisor-id': 'S01' },
    })
    expect(second.statusCode).toBe(409)
    expect(second.json()).toEqual({ message: 'Pedido não está aguardando aprovação' })

    const [c002] = await db
      .select({ creditUsed: clientes.creditoUtilizadoCentavos })
      .from(clientes)
      .where(eq(clientes.id, 'C002'))
    expect(c002?.creditUsed).toBe(SEED_CREDIT_USED.C002 + 32000)
    await app.close()
  })

  it('pedido já Enviado retorna 409', async () => {
    const app = buildApp(db)
    const sent = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: {
        'x-seller-id': 'V01',
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
      },
      payload: { customerId: 'C001', items: exampleC001Items },
    })
    expect(sent.statusCode).toBe(201)
    const { id } = sent.json() as { id: string }

    const res = await app.inject({
      method: 'POST',
      url: `/supervisor/orders/${id}/approve`,
      headers: { 'x-supervisor-id': 'S01' },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json()).toEqual({ message: 'Pedido não está aguardando aprovação' })
    await app.close()
  })

  it('sem X-Supervisor-Id retorna o mesmo 404 de rota inexistente', async () => {
    const app = buildApp(db)
    const created = await createPendingC002(app)
    const url = `/supervisor/orders/${created.id}/approve`
    const res = await app.inject({ method: 'POST', url })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual(fastifyRouteNotFound('POST', url))
    await app.close()
  })

  it('supervisor inexistente retorna o mesmo 404 de rota inexistente', async () => {
    const app = buildApp(db)
    const created = await createPendingC002(app)
    const url = `/supervisor/orders/${created.id}/approve`
    const res = await app.inject({
      method: 'POST',
      url,
      headers: { 'x-supervisor-id': 'S99' },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual(fastifyRouteNotFound('POST', url))
    expect(res.json()).not.toEqual(expect.objectContaining({ message: 'Pedido não encontrado' }))

    const [order] = await db
      .select({ status: pedidos.status })
      .from(pedidos)
      .where(eq(pedidos.id, created.id))
    expect(order?.status).toBe('Aguardando aprovação')
    await app.close()
  })

  it('supervisor de outro time retorna 404 sem vazar o pedido', async () => {
    await db.insert(supervisores).values({ id: 'S99', nome: 'Outro Supervisor' })
    const app = buildApp(db)
    const created = await createPendingC002(app)

    const res = await app.inject({
      method: 'POST',
      url: `/supervisor/orders/${created.id}/reject`,
      headers: { 'x-supervisor-id': 'S99' },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ message: 'Pedido não encontrado' })
    await app.close()
  })

  it('pedido inexistente retorna 404', async () => {
    const app = buildApp(db)
    const res = await app.inject({
      method: 'POST',
      url: '/supervisor/orders/PH999/approve',
      headers: { 'x-supervisor-id': 'S01' },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ message: 'Pedido não encontrado' })
    await app.close()
  })

  it('crédito insuficiente na aprovação retorna 422 e mantém o pendente', async () => {
    const app = buildApp(db)
    const created = await createPendingC002(app)

    await db
      .update(clientes)
      .set({ creditoUtilizadoCentavos: SEED_CREDIT_USED.C002 + 4000 })
      .where(eq(clientes.id, 'C002'))

    const res = await app.inject({
      method: 'POST',
      url: `/supervisor/orders/${created.id}/approve`,
      headers: { 'x-supervisor-id': 'S01' },
    })

    expect(res.statusCode).toBe(422)
    expect(res.json()).toEqual([
      {
        code: 'INSUFFICIENT_CREDIT',
        message: 'Total líquido acima do crédito disponível',
        available: 31000,
        net: 32000,
      },
    ])

    const [order] = await db
      .select({ status: pedidos.status })
      .from(pedidos)
      .where(eq(pedidos.id, created.id))
    expect(order?.status).toBe('Aguardando aprovação')
    const [c002] = await db
      .select({ creditUsed: clientes.creditoUtilizadoCentavos })
      .from(clientes)
      .where(eq(clientes.id, 'C002'))
    expect(c002?.creditUsed).toBe(SEED_CREDIT_USED.C002 + 4000)
    await app.close()
  })

  it('dois approves concorrentes do mesmo pedido: um 200 e o outro 409', async () => {
    const app = buildApp(db)
    const created = await createPendingC002(app)
    const headers = { 'x-supervisor-id': 'S01' }
    const url = `/supervisor/orders/${created.id}/approve`

    const [first, second] = await Promise.all([
      app.inject({ method: 'POST', url, headers }),
      app.inject({ method: 'POST', url, headers }),
    ])

    const statuses = [first.statusCode, second.statusCode].sort()
    expect(statuses).toEqual([200, 409])

    const failed = first.statusCode === 409 ? first : second
    expect(failed.json()).toEqual({ message: 'Pedido não está aguardando aprovação' })

    const [c002] = await db
      .select({ creditUsed: clientes.creditoUtilizadoCentavos })
      .from(clientes)
      .where(eq(clientes.id, 'C002'))
    expect(c002?.creditUsed).toBe(SEED_CREDIT_USED.C002 + 32000)

    const [order] = await db
      .select({ status: pedidos.status })
      .from(pedidos)
      .where(eq(pedidos.id, created.id))
    expect(order?.status).toBe('Aprovado')
    await app.close()
  })
})
