import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Db } from './client.js'
import {
  clientes,
  pedidos,
  pedidosItens,
  produtos,
  supervisores,
  tabelasPreco,
  tabelasPrecoItens,
  vendedores,
} from './schema.js'

// Carrega seed/seed.json COMO ESTÁ. Idempotente: ON CONFLICT DO NOTHING.
// Única transformação: reais -> centavos inteiros (Math.round(valor * 100)).

function resolveSeedPath(): string {
  const fromMeta = fileURLToPath(new URL('../../seed/seed.json', import.meta.url))
  if (existsSync(fromMeta)) {
    return fromMeta
  }
  return path.resolve(process.cwd(), 'seed/seed.json')
}

const toCents = (reais: number) => Math.round(reais * 100)

interface Seed {
  supervisores: { id: string; nome: string }[]
  vendedores: {
    id: string
    nome: string
    supervisor_id: string
    alcada_desconto_percentual: number
  }[]
  clientes: {
    id: string
    nome_fantasia: string
    razao_social: string
    cnpj: string
    vendedor_id: string
    tabela_preco_id: string | null
    limite_credito: number
    credito_utilizado: number
    cidade: string
    uf: string
  }[]
  produtos: {
    id: string
    sku: string
    ean: string
    descricao: string
    categoria: string
    marca: string
    unidade_venda: string
    fator_embalagem: number
    venda_somente_multiplo: boolean
    ativo: boolean
  }[]
  tabelas_preco: {
    id: string
    nome: string
    itens: { produto_id: string; preco_unidade: number }[]
  }[]
  pedidos_historico: {
    id: string
    cliente_id: string
    vendedor_id: string
    data: string
    status: string
    itens: {
      produto_id: string
      quantidade: number
      preco_unidade: number
      desconto_percentual: number
    }[]
  }[]
}

export async function seedDatabase(database: Db): Promise<void> {
  const seed = JSON.parse(await readFile(resolveSeedPath(), 'utf8')) as Seed

  await database.transaction(async (tx) => {
    await tx.insert(supervisores).values(seed.supervisores).onConflictDoNothing()
    await tx
      .insert(vendedores)
      .values(
        seed.vendedores.map((v) => ({
          id: v.id,
          nome: v.nome,
          supervisorId: v.supervisor_id,
          alcadaDescontoPercentual: v.alcada_desconto_percentual,
        })),
      )
      .onConflictDoNothing()
    await tx
      .insert(tabelasPreco)
      .values(seed.tabelas_preco.map((t) => ({ id: t.id, nome: t.nome })))
      .onConflictDoNothing()
    await tx
      .insert(clientes)
      .values(
        seed.clientes.map((c) => ({
          id: c.id,
          nomeFantasia: c.nome_fantasia,
          razaoSocial: c.razao_social,
          cnpj: c.cnpj,
          vendedorId: c.vendedor_id,
          tabelaPrecoId: c.tabela_preco_id,
          limiteCreditoCentavos: toCents(c.limite_credito),
          creditoUtilizadoCentavos: toCents(c.credito_utilizado),
          cidade: c.cidade,
          uf: c.uf,
        })),
      )
      .onConflictDoNothing()
    await tx
      .insert(produtos)
      .values(
        seed.produtos.map((p) => ({
          id: p.id,
          sku: p.sku,
          ean: p.ean,
          descricao: p.descricao,
          categoria: p.categoria,
          marca: p.marca,
          unidadeVenda: p.unidade_venda,
          fatorEmbalagem: p.fator_embalagem,
          vendaSomenteMultiplo: p.venda_somente_multiplo,
          ativo: p.ativo,
        })),
      )
      .onConflictDoNothing()
    await tx
      .insert(tabelasPrecoItens)
      .values(
        seed.tabelas_preco.flatMap((t) =>
          t.itens.map((i) => ({
            tabelaPrecoId: t.id,
            produtoId: i.produto_id,
            precoUnidadeCentavos: toCents(i.preco_unidade),
          })),
        ),
      )
      .onConflictDoNothing()
    await tx
      .insert(pedidos)
      .values(
        seed.pedidos_historico.map((p) => ({
          id: p.id,
          clienteId: p.cliente_id,
          vendedorId: p.vendedor_id,
          data: p.data,
          status: p.status,
          // Histórico não tem chave de envio; UNIQUE permite vários NULL (PH00x).
          idempotencyKey: null,
        })),
      )
      .onConflictDoNothing()
    await tx
      .insert(pedidosItens)
      .values(
        seed.pedidos_historico.flatMap((p) =>
          p.itens.map((i) => ({
            pedidoId: p.id,
            produtoId: i.produto_id,
            quantidade: i.quantidade,
            precoUnidadeCentavos: toCents(i.preco_unidade),
            descontoPercentual: i.desconto_percentual,
          })),
        ),
      )
      .onConflictDoNothing()
  })
}

function invokedAsCli(): boolean {
  const entry = process.argv[1]
  return entry?.endsWith('seed.ts') === true || entry?.endsWith('seed.js') === true
}

if (invokedAsCli()) {
  const { db, pool } = await import('./client.js')
  await seedDatabase(db)
  console.log('[seed] ok')
  await pool.end()
}
