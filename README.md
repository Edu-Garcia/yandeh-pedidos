# Yandeh · Montagem de Pedidos (Desafio Fullstack Pleno)

Módulo de montagem de pedidos para vendedores externos. Requisitos e regras: [`PRD.md`](PRD.md).
Decisões: [`DECISIONS.md`](DECISIONS.md) · Assunções: [`ASSUMPTIONS.md`](ASSUMPTIONS.md) · Uso de IA: [`AI_LOG.md`](AI_LOG.md) · Plano de tarefas: [`TASKS.md`](TASKS.md).

> **Status:** scaffold inicial (estrutura, Docker, banco e seed). Regras de negócio e telas ainda são stubs.

## Stack

Vue 3 + Vite + TypeScript + Tailwind CSS v4 + Vue Router + Pinia · Node.js 22 + Fastify + Zod + Drizzle ORM · PostgreSQL 17 · Vitest · pnpm workspaces.

```
apps/web         Frontend (Vue 3)
apps/api         Backend (Fastify) — schema Drizzle, migrações em apps/api/drizzle, seed em apps/api/seed/seed.json
packages/shared  Regras de negócio puras (preço, embalagem, alçada, totais, mínimo, crédito) usadas pelo front e pela API
```

## Como rodar

### Com Docker (recomendado)

```bash
docker compose up --build
```

- Web: http://localhost:5173
- API: http://localhost:3333/health
- Postgres: localhost:5432 (`yandeh`/`yandeh`)

A API roda migrações e seed a cada start (idempotente: `ON CONFLICT DO NOTHING`). Para zerar o banco: `docker compose down -v`.

### Local (desenvolvimento)

Pré-requisitos: Node 22 (`.nvmrc`) e pnpm via Corepack (`corepack enable`).

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm --filter @yandeh/api db:setup   # migra + seed
pnpm --filter @yandeh/shared build
pnpm dev                              # api (3333) + web (5173)
```

Variáveis da API (ver `.env.example` e `docker-compose.yml`): `DATABASE_URL`, `API_PORT`, `HOST`, `BUSINESS_TIMEZONE` (fuso da data civil do pedido; default `America/Fortaleza`).

## Como testar

```bash
pnpm test        # Vitest em packages/shared e apps/api
pnpm typecheck
pnpm lint
pnpm format:check
```

Regras de negócio são testadas em `packages/shared/src/*.test.ts` (funções puras, valores em centavos).

## Banco de dados

- Schema: `apps/api/src/db/schema.ts`. Nova migração: `pnpm --filter @yandeh/api db:generate`.
- Dinheiro em centavos (`integer`); quantidades em unidades.

## O que ficou de fora

> _Atualizar ao final._

- Offline completo (catálogo/preços offline e sincronização com resolução de conflitos) — V1 cobre apenas rascunho local + reenvio idempotente.
- Autenticação real (login é simulado escolhendo o vendedor/supervisor).
- Desconto no total do pedido e descontos cumulativos.
- Leitura de código de barras pela câmera (busca por EAN digitado).
- _(completar)_

## Convenção de commits

- Formato [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/): `<tipo>(<escopo opcional>): <descrição>` com tipos `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `build`, `ci`, `style`, `perf`; descrição em pt-BR, no imperativo.
- **Sem squash**: o histórico deve mostrar a evolução.
- Toda mensagem **termina** com uma linha: `IA: nenhuma`, `IA: parcial` ou `IA: majoritária`.
- Template: `git config commit.template .gitmessage`.

Exemplo:

```
feat(shared): calcula totais por linha em centavos

IA: parcial
```
