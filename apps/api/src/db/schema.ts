import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// Valores monetários em CENTAVOS (integer). Quantidades em UNIDADES.
// Espelha as entidades do seed.json (nomes de colunas em português, como no seed).

export const supervisores = pgTable('supervisores', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
})

export const vendedores = pgTable('vendedores', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  supervisorId: text('supervisor_id')
    .notNull()
    .references(() => supervisores.id),
  alcadaDescontoPercentual: numeric('alcada_desconto_percentual', {
    precision: 5,
    scale: 2,
    mode: 'number',
  }).notNull(),
})

export const tabelasPreco = pgTable('tabelas_preco', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
})

export const clientes = pgTable('clientes', {
  id: text('id').primaryKey(),
  nomeFantasia: text('nome_fantasia').notNull(),
  razaoSocial: text('razao_social').notNull(),
  cnpj: text('cnpj').notNull(),
  vendedorId: text('vendedor_id')
    .notNull()
    .references(() => vendedores.id),
  // Nulo no seed para C004 — fallback para TP01 é regra de domínio, não do banco.
  tabelaPrecoId: text('tabela_preco_id').references(() => tabelasPreco.id),
  limiteCreditoCentavos: integer('limite_credito_centavos').notNull(),
  creditoUtilizadoCentavos: integer('credito_utilizado_centavos').notNull(),
  cidade: text('cidade').notNull(),
  uf: text('uf').notNull(),
})

export const produtos = pgTable('produtos', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull(),
  // EAN NÃO é único: P009 e P023 compartilham o mesmo código no seed.
  ean: text('ean').notNull(),
  descricao: text('descricao').notNull(),
  categoria: text('categoria').notNull(),
  marca: text('marca').notNull(),
  unidadeVenda: text('unidade_venda').notNull(),
  fatorEmbalagem: integer('fator_embalagem').notNull(),
  vendaSomenteMultiplo: boolean('venda_somente_multiplo').notNull(),
  ativo: boolean('ativo').notNull(),
})

export const tabelasPrecoItens = pgTable(
  'tabelas_preco_itens',
  {
    tabelaPrecoId: text('tabela_preco_id')
      .notNull()
      .references(() => tabelasPreco.id),
    produtoId: text('produto_id')
      .notNull()
      .references(() => produtos.id),
    precoUnidadeCentavos: integer('preco_unidade_centavos').notNull(),
  },
  (t) => [primaryKey({ columns: [t.tabelaPrecoId, t.produtoId] })],
)

export const pedidos = pgTable('pedidos', {
  id: text('id').primaryKey(),
  clienteId: text('cliente_id')
    .notNull()
    .references(() => clientes.id),
  vendedorId: text('vendedor_id')
    .notNull()
    .references(() => vendedores.id),
  data: date('data').notNull(),
  // 'Faturado' | 'Cancelado' (histórico) | 'Enviado' | 'Aguardando aprovação' | 'Aprovado' | 'Rejeitado'
  status: text('status').notNull(),
  // Chave de idempotência enviada pelo front (reenvio offline). Nula para pedidos do histórico.
  idempotencyKey: uuid('idempotency_key').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const pedidosItens = pgTable(
  'pedidos_itens',
  {
    pedidoId: text('pedido_id')
      .notNull()
      .references(() => pedidos.id),
    produtoId: text('produto_id')
      .notNull()
      .references(() => produtos.id),
    quantidade: integer('quantidade').notNull(),
    precoUnidadeCentavos: integer('preco_unidade_centavos').notNull(),
    descontoPercentual: numeric('desconto_percentual', {
      precision: 5,
      scale: 2,
      mode: 'number',
    }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.pedidoId, t.produtoId] })],
)
