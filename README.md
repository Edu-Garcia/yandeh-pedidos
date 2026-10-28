# Yandeh · Montagem de Pedidos (Desafio Fullstack Pleno)

Módulo de montagem de pedidos para vendedores externos. Requisitos e regras: [`PRD.md`](PRD.md).
Decisões: [`DECISIONS.md`](DECISIONS.md) · Assunções: [`ASSUMPTIONS.md`](ASSUMPTIONS.md) · Uso de IA: [`AI_LOG.md`](AI_LOG.md) · Plano de tarefas: [`TASKS.md`](TASKS.md).

> **Status:** Tarefas obrigatórias T-00–T-31 concluídas (F0–F8; req. 1–8 e V1 do req. 9: rascunho local + reenvio idempotente). Opcional T-32 (e2e Playwright dos fluxos R1–R9) feito. T-33 e T-34 não feitos.
>
> O desafio foi entregue ao recrutador em 26/10/2026 com o repositório incompleto. O estado no prazo é o commit [`af003cc`](https://github.com/Edu-Garcia/yandeh-pedidos/tree/af003cc9b2f8b06639fb757cd27388568e8a2c51) (merge do PR #25, T-22): no `TASKS.md` daquele commit, T-00–T-22 estavam `[x]` (F0–F4 e a API de histórico/repetir; 25 de 34). Depois do prazo: tela de histórico (T-23), supervisor (T-24/T-25) e offline parcial V1 (T-26/T-27).

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
- API: http://localhost:3333 — `GET /health` → `{"status":"ok"}`
- Postgres: localhost:5432 (`yandeh`/`yandeh`)

A API roda migrações e seed a cada start (idempotente: `ON CONFLICT DO NOTHING`). Para zerar o banco: `docker compose down -v`.

### Local (desenvolvimento)

Pré-requisitos: Node 22 (`.nvmrc`) e pnpm via Corepack (`corepack enable`).

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm --filter @yandeh/api db:setup   # migra + seed
pnpm dev                              # api (3333) + web (5173)
```

`@yandeh/shared` exporta `dist/`. Os scripts de raiz `pnpm dev`, `pnpm test` e `pnpm typecheck` compilam o shared antes (em clone limpo, `pnpm typecheck`/`pnpm test` falhavam sem o `dist/`). `pnpm --filter @yandeh/shared build` continua disponível se precisar do `dist/` isolado.

Variáveis da API (ver `.env.example`, `apps/api/src/env.ts` e `docker-compose.yml`): `DATABASE_URL`, `TEST_DATABASE_URL` (só nos testes da API; default = `DATABASE_URL` com sufixo `_test`), `E2E_DATABASE_URL` (só no Playwright; default = `DATABASE_URL` com sufixo `_e2e`), `API_PORT`, `HOST` (default `0.0.0.0`), `BUSINESS_TIMEZONE` (fuso da data civil do pedido; default `America/Fortaleza`).

### Usuários de teste (login simulado)

Sem senha. Na tela "Quem é você?" a API lista o seed:

| Papel      | Id  | Nome            | Alçada | Carteira / tela            |
| ---------- | --- | --------------- | ------ | -------------------------- |
| Vendedor   | V01 | Carlos Menezes  | 5%     | C001–C004 → `/clientes`    |
| Vendedor   | V02 | Renata Lima     | 7%     | C005–C007                  |
| Vendedor   | V03 | Paulo Andrade   | 3%     | C008–C010                  |
| Supervisor | S01 | Marta Fernandes | —      | Aprovações → `/supervisor` |

Exemplo do PRD (V01 / C001 / TP01): P001 10 un 0%, P006 40 un 2%, P010 24 un 0% → líquido R$ 519,30, status **Enviado**.

## Como testar

Os testes da API usam um **banco isolado**, derivado de `DATABASE_URL` com sufixo `_test` (default `postgres://yandeh:yandeh@localhost:5432/yandeh_test`). O `globalSetup` do Vitest cria o banco se não existir, aplica as migrações e faz `TRUNCATE` + seed antes da suíte; cada teste da API reseeda de novo. Os e2e Playwright usam outro banco (`yandeh_e2e`, ou `E2E_DATABASE_URL`), no mesmo padrão (D21/D22): criam o banco, migram e reseedeiam a cada teste. O banco de desenvolvimento (`yandeh`) não é lido nem escrito — pedidos criados pelo app (R1–R9, Docker ou `pnpm dev`) continuam lá. Vale no fluxo Docker do README, no Postgres local e se houver CI. Suba o Postgres antes (`docker compose up -d postgres` ou o stack completo). Para apontar para outro banco: `TEST_DATABASE_URL` / `E2E_DATABASE_URL`. Shared e web (Vitest) não precisam do banco.

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
```

`pnpm test` e `pnpm typecheck` compilam `@yandeh/shared` antes, então o pipeline acima funciona num clone limpo (sem passo extra de `pnpm --filter @yandeh/shared build`).

`pnpm test` **não** roda o Playwright: os e2e pedem Chromium instalado. Depois do `pnpm install`, uma vez por máquina:

```bash
pnpm test:e2e:install   # playwright install --with-deps chromium
pnpm test:e2e
```

`pnpm test:e2e` compila o shared, cria/migra `yandeh_e2e` se faltar, sobe API em `127.0.0.1:3334` e Vite em `127.0.0.1:5174` (webServer do Playwright; portas distintas de 3333/5173 para conviver com `docker compose` / `pnpm dev`) e roda os fluxos R1–R9 no Chromium com viewport 390×844. Cada teste reseeda o banco, então a suíte passa repetidamente e em qualquer ordem.

Não há workflow de CI neste repositório. Se for adicionado, incluir `pnpm test:e2e` com `pnpm test:e2e:install` (ou `playwright install --with-deps chromium`) e cache de `~/.cache/ms-playwright`.

`pnpm test` compila o shared e em seguida roda `pnpm -r test` (Vitest em cada pacote). O que cada suíte cobre:

### `packages/shared` — regras puras (números do seed, sem I/O)

Arquivos em `packages/shared/src/*.test.ts`:

- `money` — `toCents` / `formatBRL` (float, half-up, pt-BR)
- `price` — tabela efetiva e fallback TP01 (`C004`); `unitPriceFor` (P001 = 2690)
- `sellable` — ativo + preço; P021/P022 inativos; preço 0 é válido
- `packaging` — Unidades/Lote, múltiplo, P006/P004/P010
- `totals` — arredondamento por linha; exemplo C001 = 51.930
- `discount` — maior desconto e status (`>` estrito na alçada)
- `credit` — reserva de pendentes; C001 380.000, C002 35.000
- `validate` — bloqueios `EMPTY_ORDER`, `INVALID_QUANTITY`, `INVALID_DISCOUNT`, `PRODUCT_NOT_SELLABLE`, `BELOW_MINIMUM`, `INSUFFICIENT_CREDIT` (alçada não bloqueia)
- `repeat` — `buildRepeatDraft` (PH001 sem P022, preço atual, desconto 0%; fator alterado)
- `search` — nome case/acento-insensível; EAN exato `7891831978575` → P009 e P023
- `business-date` — data civil em `America/Fortaleza` (não UTC)
- `rules` — constantes (mínimo 30.000, fallback TP01)

### `apps/api` — rotas com `app.inject` (Postgres `yandeh_test`, seed automático)

- `GET /health`, `/sellers` (V01/V02/V03), `/supervisors` (S01)
- Carteira `GET /sellers/:id/customers` (crédito, fallback; outro vendedor = mesmo 404 de inexistente; sem header 400)
- Busca `GET /customers/:id/products?q=` (nome/EAN, só vendáveis; outra carteira = mesmo 404 de inexistente)
- `POST /orders` — Zod + `validateOrder`; exemplo C001 → 201 Enviado 51.930; alçada → Aguardando aprovação; 422 de regra; crédito com `FOR UPDATE` e corrida; `Idempotency-Key` (reenvio 200, sem header 400); data civil no fuso do negócio; outra carteira = mesmo 404 de inexistente
- Histórico `GET /customers/:id/orders` e `POST .../repeat` (não cria pedido; PH004 Cancelado; outra carteira = mesmo 404 de inexistente)
- Supervisor `GET /supervisor/orders` e `POST .../approve|reject` (reserva ↔ utilizado, 409, 422 de crédito)
- `shared-runtime` — import ESM de `lineTotals` em runtime

### `apps/web` — Vitest + happy-dom (API mockada)

- Sessão Pinia e guard de rota/papel (T-17)
- Carteira: formatação BRL, destaque abaixo do mínimo, renderização (T-18)
- Pedido: debounce da busca, P009/P023, aviso de fallback, carrinho Unidades/Lote, totais/bloqueios/envio, histórico e repetir, rascunho em localStorage, retentativa idempotente (rede/5xx/offline; 422 não retenta)
- Aprovações do supervisor (lista, confirmar, 422 de crédito)
- Cliente HTTP (`X-Seller-Id` / `X-Supervisor-Id` / `Idempotency-Key`)

### e2e Playwright (`pnpm test:e2e`, banco `yandeh_e2e`)

Viewport 390×844. Cobre o roteiro R1–R9 no browser (T-32):

- Login/sessão do vendedor; carteira só com os clientes dele e **nome da tabela** (não o id `TP01`)
- Cliente de outra carteira e rota inexistente → a mesma página 404, URL mantida
- Busca por descrição e EAN; a UI **não mostra** id de produto (`P009` etc.)
- Carrinho Unidades/Lote, desconto, mínimo e crédito bloqueando Enviar
- Envio Enviado / Aguardando aprovação; aprovação e rejeição do supervisor com confirmação inline
- Repetir pedido; rascunho sobrevivendo ao reload; offline com "Aguardando conexão" e um único envio ao voltar a rede (`context.setOffline`)

Não há testes de componente com Vue Test Utils (T-33).

## Banco de dados

- Schema: `apps/api/src/db/schema.ts`. Nova migração: `pnpm --filter @yandeh/api db:generate`.
- Dinheiro em centavos (`integer`); quantidades em unidades.
- Seed em `apps/api/seed/seed.json` — usar como está, sem editar.

## O que ficou de fora

Escopo do PRD §5.2, V1 do req. 9 (A20) e opcionais T-33–T-34:

- Offline completo: catálogo/preços offline, sincronização bidirecional e resolução de conflitos. A V1 cobre rascunho em localStorage (`yandeh.orderDraft`) + retentativa com a mesma `Idempotency-Key`. Sem service worker, sem fila de vários pedidos e sem botão de cancelar pendente (A52, A54).
- Cache do catálogo do cliente em IndexedDB para busca offline (T-34).
- Autenticação real (login é escolher vendedor/supervisor; identidade na API via `X-Seller-Id` / `X-Supervisor-Id`).
- Cadastro/edição de clientes, produtos e tabelas.
- Faturamento (status `Faturado` só no histórico do seed).
- Desconto no total do pedido e descontos cumulativos (só % por item).
- Impostos e frete.
- Leitura de código de barras pela câmera (busca por EAN digitado).
- Notificações.
- Multi-supervisor (só S01).
- Testes de componente do carrinho com Vue Test Utils (T-33); a suíte web cobre store e páginas com happy-dom. Os e2e Playwright (T-32) cobrem o carrinho no browser.

Limitações do seed/regras (não são bugs da V1):

- C004 sem tabela usa TP01 (risco de preço errado; D11, A2).
- C006 (crédito R$ 100) e C010 (R$ 0) nunca alcançam o mínimo de R$ 300 — envio sempre bloqueado (A19). C002 só cabe entre R$ 300 e R$ 350.
- Repetir pedido zera descontos e usa preço atual da tabela (A15, A18). Histórico guarda só unidades; se o fator mudar, o ajuste segue RN12/D13.

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
