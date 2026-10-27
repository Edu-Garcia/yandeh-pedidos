# TASKS — Plano de execução por tarefas

Cada tarefa é uma unidade de **escopo fechado**: implementável, validável e commitável sozinha. Problemas encontrados numa tarefa são resolvidos **nela**, antes de seguir. Fonte da verdade: [`PRD.md`](PRD.md) (RN01–RN13, R1–R9). Decisões: [`DECISIONS.md`](DECISIONS.md) · Assunções: [`ASSUMPTIONS.md`](ASSUMPTIONS.md).

## Como usar

1. Pegue a **próxima tarefa `[ ]`** cujas dependências estão `[x]`. Marque `[~]`.
2. Siga o fluxo abaixo até o fim. Uma tarefa = um commit.
3. Atualize a tabela de progresso.
4. Antes de abrir o PR, rode a **Validação manual** da tarefa e cole comandos/saídas (ou screenshots) como evidência na descrição.

### Fluxo por tarefa (derivado de `/grill-with-docs`)

1. **Grill:** confronte a tarefa com PRD, `ASSUMPTIONS.md`, `DECISIONS.md` e o glossário (PRD §4). Uma pergunta por vez, com recomendação. Termo novo ou conflito → resolva com o autor ou registre (assunção nova em `ASSUMPTIONS.md`, decisão em `DECISIONS.md`).
2. **Implemente:** regras puras em `packages/shared` com **teste primeiro** (números reais do seed). API/telas só consomem `@yandeh/shared`.
3. **Valide:** rode os comandos da seção _Validação_ da tarefa + `pnpm typecheck && pnpm lint && pnpm format:check`.
4. **Validação manual:** rode os passos da seção _Validação manual_ contra o artefato real (script tsx consumidor de `@yandeh/shared`, SQL, `curl` ou browser). Antes de abrir o PR, cole os comandos/saídas (ou screenshots) na descrição.
5. **Docs:** atualize o que a tarefa tocou (PRD, ASSUMPTIONS, DECISIONS, README, `AI_LOG.md` se houve momento relevante de IA, `.ai-private/PROMPTS.md`).
6. **Status:** marque `[x]` aqui e atualize o progresso.
7. **Commit:** o agente **propõe** a mensagem; o autor escolhe a linha `IA:` e aprova. **Nunca commitar sem aprovação.** Sem squash.

### Legenda

`[ ]` a fazer · `[~]` em andamento · `[x]` feito · `[-]` fora de escopo / descartado · **(opcional)** = só se sobrar tempo

**Validação** = checagens automatizadas. **Validação manual** = passos reproduzíveis no artefato real; a evidência (comandos/saídas ou screenshots) vai na descrição do PR.

## Progresso

| Fase                              | Tarefas | `[x]`  |
| --------------------------------- | ------- | ------ |
| F0 — Base (scaffold + docs)       | 1       | 1      |
| F1 — Regras puras (`shared`)      | 9       | 9      |
| F2 — Banco e seed                 | 1       | 1      |
| F3 — API (req. 1–5, 7)            | 8       | 8      |
| F4 — Telas (req. 1–5, 7)          | 5       | 5      |
| F5 — Histórico e repetir (req. 8) | 2       | 2      |
| F6 — Supervisor (fecha req. 5)    | 2       | 1      |
| F7 — Offline parcial (req. 9)     | 2       | 0      |
| F8 — Entrega e docs               | 4       | 0      |
| **Total**                         | **34**  | **27** |
| Opcionais                         | 3       | 0      |

> Sem estimativas de tempo: com IA acelerando a implementação, elas não refletem dados reais. Prioridade: núcleo (F1–F4 + F8, req. 1–7) primeiro. Se o prazo apertar, corte na ordem: opcionais → F7 → F6 (T-25) → F5, e registre em README "o que ficou de fora".

Mensagens de commit: obrigatoriamente [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/) (`<tipo>(<escopo>): <descrição>`), descrição em pt-BR; a última linha é `IA: <nenhuma|parcial|majoritária>` (o autor escolhe).

---

## F0 — Base

### [x] T-00 — Commit inicial do scaffold e docs

- **Refs:** PRD §13 bloco 0; entregável "histórico real".
- **Depende de:** —
- **Escopo:** commitar o que já existe (monorepo, Docker, schema/migração/seed, stubs, PRD, DECISIONS, ASSUMPTIONS, AI_LOG rascunho, AGENTS, rules, skills, TASKS).
- **Fora:** qualquer implementação de regra.
- **Aceite:** `.ai-private/` não entra (gitignored); `docker compose up --build` sobe e `GET /health` → `{"status":"ok"}`.
- **Validação:** `git status --ignored | grep .ai-private`; `pnpm install && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`; `curl localhost:3333/health`.
- **Validação manual:** o que foi conferido de fato no scaffold: `git status --ignored` lista `.ai-private/` (gitignored, fora dos commits `607ef9f`/`b5776fc`); `pnpm install && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` passou; `docker compose up --build` subiu Postgres/API/Web e `curl localhost:3333/health` → `{"status":"ok"}`.
- **Docs:** —
- **Commit:** `chore: estrutura inicial, PRD e documentação do desafio` + `IA: majoritária` (`607ef9f`)
- **Status:** feito, commit `607ef9f` aprovado pelo autor

## F1 — Regras puras em `packages/shared` (req. 6)

Validação comum: `pnpm --filter @yandeh/shared test` (e `pnpm --filter @yandeh/shared typecheck`). Cada tarefa troca os `it.todo` correspondentes por testes reais em `packages/shared/src/rules.test.ts` (ou arquivo por regra).

Consumir `@yandeh/shared` hoje exige `pnpm --filter @yandeh/shared build` antes: os `exports` do pacote apontam para `dist/`. O script tsx temporário de cada tarefa desta fase deve viver em `apps/api/` (consumidor) e ser rodado com `pnpm --filter @yandeh/api exec tsx ./_tmp.ts`.

### [x] T-01 — Dinheiro em centavos (`toCents`, `formatBRL`)

- **Refs:** PRD §6 intro, RN07; D8; A14.
- **Depende de:** T-00
- **Escopo:** `toCents(reais) = round(reais × 100)` robusto a float (ex.: `3.33 → 333`, `26.9 → 2690`, `4.99 → 499`); `formatBRL(cents)` via `Intl.NumberFormat('pt-BR')`.
- **Fora:** parsing de entrada do usuário.
- **Aceite:** `toCents(0.1 + 0.2) = 30`; `formatBRL(51930) = 'R$ 519,30'` (normalizar NBSP no teste).
- **Validação manual:** `pnpm --filter @yandeh/shared build` e, em `apps/api/_tmp.ts`, `import { toCents, formatBRL } from '@yandeh/shared'` seguido de `pnpm --filter @yandeh/api exec tsx ./_tmp.ts` (apagar o arquivo depois). Asserts: `toCents(26.9) === 2690`, `toCents(0.1 + 0.2) === 30`, `toCents(1.005) === 101`; `formatBRL(51930)` com NBSP/`\u00A0` ou NNBSP/`\u202F` normalizado para espaço → `'R$ 519,30'`; `formatBRL(-1500)` normalizado → `'-R$ 15,00'`. O import em `apps/api` só resolve depois do build. Evidência: saída com todos os asserts ok.
- **Arquivos:** `packages/shared/src/rules.ts` (ou `money.ts`), testes.
- **Commit:** `feat(shared): conversão para centavos e formatação BRL`

### [x] T-02 — Tabela efetiva com fallback TP01 e preço do cliente

- **Refs:** RN02; D11; A2; R2.
- **Depende de:** T-01
- **Escopo:** `resolvePriceTableId(customer)` → `{ tableId, isFallback }`; `unitPriceFor(product, tableId, priceItems)` → `Cents | null`.
- **Fora:** UI do aviso (T-19).
- **Aceite:** C004 (`null`) → TP01 com `isFallback = true`; C001 → TP01 sem fallback; preço P001 em TP01 = 2690.
- **Validação manual:** `pnpm --filter @yandeh/shared build` e script tsx em `apps/api/` importando `@yandeh/shared`. C004 (Mercearia Dona Lúcia, `priceTableId: null`) → `resolvePriceTableId` = `TP01` com `isFallback === true`; C001 (`priceTableId: 'TP01'`) → `TP01` com `isFallback === false`; `unitPriceFor` de P001 na TP01 (seed 26,9) → `2690`; produto sem preço na tabela → `null`. Evidência: saída do script.
- **Commit:** `feat(shared): tabela de preço efetiva com fallback TP01`

### [x] T-03 — Produto vendável

- **Refs:** RN03; A4, A5.
- **Depende de:** T-02
- **Escopo:** `isSellable(product, price)` ⇔ `ativo && price != null`.
- **Aceite:** P021/P022 (inativos) → falso; P021 em TP03 (sem preço) → falso; P001 em TP01 → verdadeiro.
- **Validação manual:** `pnpm --filter @yandeh/shared build` e script tsx consumidor: `isSellable` de P021 e P022 (`ativo: false` no seed) → `false` com qualquer preço; P021 em TP03 (sem item de preço no seed) → `false`; P001 ativo com preço TP01 2690 → `true`. Evidência: saída do script.
- **Commit:** `feat(shared): regra de produto vendável`

### [x] T-04 — Embalagem: conversão unidades/lote e validação de quantidade

- **Refs:** RN05; D9; A6, A7, A22; R3.
- **Depende de:** T-01
- **Escopo:** funções puras `unitsFromLots(lots, factor)`; `lotsFromUnits(units, factor)` (retorna `null` quando não é exato); `hasLotField(product)` (falso para `UN` fator 1); `isUnitsReadOnly(product)` (= `venda_somente_multiplo`); `isValidQuantity(product, units)` (inteiro ≥ 1; múltiplo do fator quando `venda_somente_multiplo`).
- **Fora:** componente dos campos Unidades/Lote (T-20).
- **Aceite:** `unitsFromLots(2, 20)` = 40 (P006); `lotsFromUnits(40, 20)` = 2; `lotsFromUnits(7, 20)` = `null` (P004); `lotsFromUnits(20, 20)` = 1; P006 40 ✅, 30 ❌, Unidades somente leitura; P010 (CX 12, só múltiplo) 24 ✅; 0, -1, 1,5 ❌; produto UN fator 1 → sem campo Lote.
- **Validação manual:** `pnpm --filter @yandeh/shared build` e script tsx: `unitsFromLots(2, 20) === 40` (P006 Macarrão Espaguete 500g, FD 20); `lotsFromUnits(40, 20) === 2`; `lotsFromUnits(7, 20) === null` (P004 Óleo de Soja 900ml); `lotsFromUnits(20, 20) === 1`; `isValidQuantity` P006 40 → true, 30 → false; `isUnitsReadOnly(P006)` → true; P010 Leite UHT (CX 12, só múltiplo) 24 → true; 0, -1 e 1,5 → false; P001 (UN fator 1) → `hasLotField === false`. Evidência: saída do script.
- **Commit:** `feat(shared): conversão unidades/lote e validação de múltiplos`

### [x] T-05 — Totais por linha e do pedido (arredondamento por linha)

- **Refs:** RN06, RN07; D7, D8; R4.
- **Depende de:** T-01
- **Escopo:** `lineTotals(line)` (bruto, desconto half-up, líquido); `orderTotals(lines)` = soma das linhas; desconto `0 ≤ d ≤ 100` (fora disso → issue em T-08).
- **Aceite:** PH001/P006: 40 × 329 com 2% → desconto 263, líquido 12.897; exemplo C001: bruto 52.196, desconto 266, líquido **51.930 (R$ 519,30)**; arroz a 6% → desconto 1.614, líquido 50.316.
- **Validação manual:** `pnpm --filter @yandeh/shared build` e script tsx: linha PH001/P006 `{ quantityUnits: 40, unitPrice: 329, discountPercent: 2 }` → `{ gross: 13160, discount: 263, net: 12897 }`; pedido exemplo C001/TP01 (P001 10×2690 0%, P006 40×333 2%, P010 24×499 0%) → `{ gross: 52196, discount: 266, net: 51930 }`; o mesmo com arroz a 6% → desconto da linha P001 = 1614 e totais `{ discount: 1880, net: 50316 }`. Evidência: saída do script.
- **Commit:** `feat(shared): totais por linha e do pedido em centavos`

### [x] T-06 — Alçada pelo maior desconto e status

- **Refs:** RN10; D7; A9; R5.
- **Depende de:** T-05
- **Escopo:** `maxDiscount(lines)`; `statusForDiscount(lines, authority)` → `Enviado` | `Aguardando aprovação` (`>` estrito).
- **Aceite:** V01 (5%) com 0%, 2%, 6% → Aguardando aprovação; V01 com 0/2/5% → Enviado; V02 (7%) com 7% → Enviado.
- **Validação manual:** `pnpm --filter @yandeh/shared build` e script tsx: `maxDiscount` das linhas 0%, 2%, 6% → 6; `statusForDiscount` com alçada V01=5 e essas linhas → `'Aguardando aprovação'`; V01 (5%) com 0/2/5% → `'Enviado'`; V02 (7%) com item a 7% → `'Enviado'` (`>` estrito). Evidência: saída do script.
- **Commit:** `feat(shared): status do pedido pela alçada do maior desconto`

### [x] T-07 — Crédito disponível com reserva de pendentes

- **Refs:** RN09; D10; A11, A12, A19; R7.
- **Depende de:** T-01
- **Escopo:** `reservedCredit(pendingOrders)`; `availableCredit(customer, reserved)` (pode ser ≤ 0; não clampa negativo sem decidir no grill).
- **Aceite:** C001 → 380.000; C002 → 35.000; C006 → 10.000; C010 → 0; C002 com pendente de 32.000 → 3.000.
- **Validação manual:** `pnpm --filter @yandeh/shared build` e script tsx com clientes do seed em centavos: C001 limite 500000 utilizado 120000 reservado 0 → `availableCredit` 380000; C002 1200000−1165000 → 35000; C006 400000−390000 → 10000; C010 450000−450000 → 0; C002 com `reservedCredit`/reservado 32000 → 3000. Evidência: saída do script.
- **Commit:** `feat(shared): crédito disponível com reserva de pendentes`

### [x] T-08 — Agregado de bloqueios de envio (`validateOrder`)

- **Refs:** RN05, RN06, RN08, RN09; A10, A11; R4, R7.
- **Depende de:** T-03, T-04, T-05, T-07
- **Escopo:** `validateOrder({ lines, products, availableCredit })` → `ValidationIssue[]` com códigos estáveis (ex.: `EMPTY_ORDER`, `INVALID_QUANTITY`, `INVALID_DISCOUNT`, `PRODUCT_NOT_SELLABLE`, `BELOW_MINIMUM`, `INSUFFICIENT_CREDIT`) e mensagens pt-BR. Alçada **não** é bloqueio (só aviso).
- **Aceite:** líquido 29.999 → `BELOW_MINIMUM`; 30.000 → ok; C002 com pedido de R$ 400 → `INSUFFICIENT_CREDIT`; C010 com R$ 300 → `INSUFFICIENT_CREDIT`; P006 com 30 un → `INVALID_QUANTITY`; exemplo C001 (R$ 519,30, crédito 380.000) → `[]`; mínimo avaliado no **líquido** (bruto 30.500 com desconto → líquido < 30.000 bloqueia).
- **Validação manual:** `pnpm --filter @yandeh/shared build` e script tsx: `validateOrder` com líquido 29999 → issue `BELOW_MINIMUM`; 30000 → `[]`; C002 `availableCredit: 35000` e líquido 40000 → `INSUFFICIENT_CREDIT`; C010 `availableCredit: 0` e líquido 30000 → `INSUFFICIENT_CREDIT`; P006 (`venda_somente_multiplo`, fator 20) com 30 un → `INVALID_QUANTITY`; exemplo C001 (líquido 51930, crédito 380000, P001/P006/P010 10/40/24) → `[]`; bruto 30500 com desconto que deixa líquido < 30000 → `BELOW_MINIMUM`. Códigos conforme PRD §8. Evidência: códigos impressos.
- **Docs:** códigos já definidos em PRD §8 e A24; atualizar se surgir código novo.
- **Commit:** `feat(shared): validação agregada de bloqueios de envio`

### [x] T-09 — Montagem de "repetir pedido"

- **Refs:** RN12; D12; A15–A18; R8.
- **Depende de:** T-03, T-04
- **Escopo:** `buildRepeatDraft(historyOrder, catalog, priceTable)` → `{ lines, removed: [{productId, reason}], notices }`; preço atual, quantidade do histórico, desconto 0%, inativos/sem preço removidos; quantidade do histórico em unidades comparada ao fator atual: produto não só múltiplo que não fecha lote → mesmas unidades, Lote vazio + aviso; produto `venda_somente_multiplo` não múltiplo → `lote = ceil(unidades / fator_atual)`, `unidades = lote × fator_atual` + aviso `{ code: 'PACK_FACTOR_CHANGED', productId, newFactor, lots, units }` em `notices`.
- **Aceite:** PH001 (C001) → P022 removido com motivo; P001 a 2690 (não 2590); P006 com 0% (era 2%); funciona para PH004 Cancelado; com fator alterado em fixture: produto só múltiplo com 30 un no histórico e fator atual 12 → 3 lotes = 36 un + `PACK_FACTOR_CHANGED` com `newFactor: 12`; P004 (não só múltiplo) com fator alterado e 7 un → 7 un, Lote vazio + aviso. Histórico do seed fecha todos os lotes (salvaguarda).
- **Validação manual:** `pnpm --filter @yandeh/shared build` e script tsx com PH001 do seed (C001/TP01): `buildRepeatDraft` remove P022 (inativo) em `removed` com motivo; P001 a 2690 (não 2590); P006 com `discountPercent: 0` (era 2); PH004 Cancelado (C006) também monta rascunho. Fixture: produto só múltiplo com 30 un no histórico e fator atual 12 → `lots=3`, `units=36` e notice `{ code: 'PACK_FACTOR_CHANGED', productId, newFactor: 12, lots: 3, units: 36 }`; P004 (não só múltiplo) com 7 un e fator alterado → 7 un, lote vazio + aviso. Evidência: JSON do retorno.
- **Commit:** `feat(shared): montagem de rascunho para repetir pedido`

## F2 — Banco e seed

### [x] T-10 — Revisar schema/seed para status, reserva e idempotência

- **Refs:** PRD §9; RN09, RN11, RN13.
- **Depende de:** T-00
- **Escopo:** conferir `pedidos.idempotency_key UNIQUE`, `status`, `vendedor_id`, totais em centavos, `pedidos_itens` com preço congelado; ajustar e gerar migração se faltar algo. Seed idempotente com histórico PH00x.
- **Fora:** editar `seed.json`.
- **Aceite:** `docker compose down -v && docker compose up --build` duas vezes sem erro/duplicata; `SELECT count(*) FROM pedidos` = nº de `pedidos_historico`.
- **Validação:** `pnpm --filter @yandeh/api db:generate` (sem diff ou migração nova revisada); `pnpm --filter @yandeh/api db:setup` 2×.
- **Validação manual:** `docker compose down -v && docker compose up --build` duas vezes, sem erro nem duplicata. No Postgres (`psql postgres://yandeh:yandeh@localhost:5432/yandeh`): `SELECT count(*) FROM supervisores` → 1; `vendedores` → 3; `clientes` → 10; `produtos` → 23; `tabelas_preco` → 3; `tabelas_preco_itens` → 68 (TP01 23 + TP02 23 + TP03 22); `pedidos` → 4 (igual a `pedidos_historico` do seed); `SELECT tabela_preco_id FROM clientes WHERE id='C004'` → NULL; `SELECT limite_credito_centavos, credito_utilizado_centavos FROM clientes WHERE id='C001'` → 500000, 120000; `SELECT preco_unidade_centavos FROM tabelas_preco_itens WHERE tabela_preco_id='TP01' AND produto_id='P001'` → 2690; `SELECT status FROM pedidos WHERE id='PH004'` → `Cancelado`; `idempotency_key` dos PH00x é NULL e a coluna é UNIQUE. Evidência: output do `psql`.
- **Commit:** `chore(api): ajusta schema de pedidos para status e idempotência`

## F3 — API (Fastify + Zod; rota testada com `app.inject`)

Validação comum: `pnpm --filter @yandeh/api test` (Postgres de teste via `docker compose up -d postgres`).

### [x] T-11 — `GET /sellers` e `GET /supervisors` (login simulado)

- **Refs:** req. 1; A1; PRD §8.
- **Depende de:** T-10
- **Aceite:** retorna V01 Carlos (5%), V02 Renata (7%), V03 Paulo (3%) e S01 Marta.
- **Validação:** `curl localhost:3333/sellers`.
- **Validação manual:** `docker compose up --build`. `curl -sS -D- localhost:3333/sellers` → 200 com V01 Carlos Menezes (alçada 5), V02 Renata Lima (7), V03 Paulo Andrade (3). `curl -sS -D- localhost:3333/supervisors` → 200 com S01 Marta Fernandes. Evidência: status + JSON.
- **Commit:** `feat(api): lista vendedores e supervisor para login simulado`

### [x] T-11b — Imports ESM do @yandeh/shared (tarefa extra)

- **Refs:** T-11 (schemas Zod espelhavam `Seller`/`Supervisor`); API NodeNext/ESM; preparação para T-12+ (`validateOrder`, `orderTotals`).
- **Depende de:** T-11
- **Escopo:** `packages/shared` compila com `module`/`moduleResolution` `NodeNext` e imports/exports relativos com extensão `.js` (src e testes). API importa tipos de `@yandeh/shared` (sem mudar o JSON das rotas). Teste de fumaça na API que importa uma função do shared em runtime. Sem bundler e sem apontar `exports` para o src.
- **Fora:** regras de rotas futuras; DECISIONS.md; seed.json.
- **Aceite:** `dist/index.js` emite `export * from './types.js'`; typecheck NodeNext da API enxerga `Seller`/`Supervisor` do shared; teste da API resolve `lineTotals` em runtime; `GET /sellers` e `/supervisors` 200 com o mesmo JSON; `pnpm --filter @yandeh/web build` OK; `docker compose up --build` sobe.
- **Validação:** `pnpm install && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`; `pnpm --filter @yandeh/shared build` e `head packages/shared/dist/index.js`.
- **Validação manual:** de `apps/api`, `node --input-type=module -e "import { lineTotals } from '@yandeh/shared'; ..."`; `docker compose up --build` + `curl` `/sellers` e `/supervisors`; `pnpm --filter @yandeh/web build`.
- **Commit:** `fix(shared): emite imports ESM com extensão .js`

### [x] T-12 — `GET /sellers/:id/customers` (carteira com crédito e tabela efetiva)

- **Refs:** RN01, RN02, RN09; R1, R7.
- **Depende de:** T-11, T-02, T-07
- **Aceite:** V01 → exatamente C001–C004; C004 com `priceTableId: 'TP01', isFallback: true`; C001 `availableCredit: 380000`; C002 35.000; vendedor inexistente → 404.
- **Validação:** `curl localhost:3333/sellers/V01/customers`.
- **Validação manual:** `docker compose up`. `curl -sS -D- localhost:3333/sellers/V01/customers` → 200 com exatamente C001–C004; C004 `priceTableId: 'TP01'` e `isFallback: true`; C001 `availableCredit: 380000`; C002 `availableCredit: 35000`. `curl -sS -D- localhost:3333/sellers/V99/customers` → 404. Evidência: status + JSON.
- **Commit:** `feat(api): carteira do vendedor com crédito disponível`

### [x] T-13 — `GET /customers/:id/products?q=` (nome/EAN com preço do cliente)

- **Refs:** RN02–RN04; A3, A21; R2.
- **Depende de:** T-12, T-03
- **Escopo:** busca case/acento-insensível (`unaccent` ou normalização em JS) ou EAN exato; só vendáveis; preço da tabela efetiva; header `X-Seller-Id` valida carteira.
- **Aceite:** `q=achocolatado` e `q=7891831978575` → P009 e P023; P021/P022 nunca; C004 → preços TP01; cliente de outra carteira → 403.
- **Validação:** `curl -H 'X-Seller-Id: V01' 'localhost:3333/customers/C001/products?q=7891831978575'`.
- **Validação manual:** `docker compose up`. `curl -sS -D- -H 'X-Seller-Id: V01' 'localhost:3333/customers/C001/products?q=achocolatado'` e o mesmo com `q=7891831978575` → 200 contendo P009 (Achocolatado em Pó 400g) e P023 (Achocolatado em Pó 400g Sachê), sem P021/P022. `curl -sS -D- -H 'X-Seller-Id: V01' 'localhost:3333/customers/C004/products?q=arroz'` → preços de TP01 (P001 = 2690). `curl -sS -D- -H 'X-Seller-Id: V01' 'localhost:3333/customers/C005/products?q=arroz'` → 403 (C005 é carteira de V02). Evidência: status + ids/preços no JSON.
- **Commit:** `feat(api): busca de produtos por nome ou EAN com preço da tabela do cliente`

### [x] T-14 — `POST /orders`: validação no servidor e status

- **Refs:** RN01, RN05–RN10; R1, R4, R5.
- **Depende de:** T-13, T-06, T-08
- **Escopo:** Zod no body; recalcula preço/totais no servidor (ignora preço do cliente); `validateOrder` → 422 com `ValidationIssue[]`; `statusForDiscount` → status; grava pedido + itens.
- **Fora:** transação de crédito e idempotência (T-15, T-16).
- **Aceite:** exemplo C001 → 201 `Enviado`, total 51.930; arroz a 6% → `Aguardando aprovação`; líquido < R$ 300 → 422 `BELOW_MINIMUM`; V01 pedindo para C005 → 403.
- **Validação:** `curl -X POST -H 'Content-Type: application/json' -H 'X-Seller-Id: V01' -H "Idempotency-Key: $(uuidgen)" -d '{"customerId":"C001","items":[{"productId":"P001","quantity":10,"discountPercent":0},{"productId":"P006","quantity":40,"discountPercent":2},{"productId":"P010","quantity":24,"discountPercent":0}]}' localhost:3333/orders`.
- **Validação manual:** `docker compose up`. `curl -sS -D- -X POST -H 'Content-Type: application/json' -H 'X-Seller-Id: V01' -H "Idempotency-Key: $(uuidgen)" -d '{"customerId":"C001","items":[{"productId":"P001","quantity":10,"discountPercent":0},{"productId":"P006","quantity":40,"discountPercent":2},{"productId":"P010","quantity":24,"discountPercent":0}]}' localhost:3333/orders` → 201, `status: "Enviado"`, total líquido 51930. O mesmo body com P001 `discountPercent: 6` → 201, `status: "Aguardando aprovação"`. Pedido com líquido < 30000 (ex.: só P001 `quantity: 1`) → 422 com `code: "BELOW_MINIMUM"` (PRD §8). `customerId: "C005"` com `X-Seller-Id: V01` → 403. Evidência: status + JSON.
- **Commit:** `feat(api): cria pedido validando regras e decidindo status`

### [x] T-14b — Data do pedido no fuso do negócio (tarefa extra)

- **Refs:** T-14 (`POST /orders` gravava `data` via `toISOString()` em UTC); clientes do seed em CE (`America/Fortaleza`).
- **Depende de:** T-14
- **Escopo:** `businessDate(now, timeZone)` em `@yandeh/shared` (`Intl.DateTimeFormat('en-CA')`, relógio injetável). API lê `BUSINESS_TIMEZONE` (default `America/Fortaleza`) e grava a data civil desse fuso. Testes da virada (23:30Z / 02:30Z / 03:00Z) e teste de API com relógio congelado. Documentar a env em `.env.example` e compose.
- **Fora:** crédito (T-15), idempotência (T-16); DECISIONS.md; seed.json; guards contra fuso inválido.
- **Aceite:** `2026-10-26T23:30:00Z` → `2026-10-26`; `2026-10-27T02:30:00Z` → `2026-10-26`; `2026-10-27T03:00:00Z` → `2026-10-27` em Fortaleza. POST `/orders` com relógio em `2026-10-27T02:30:00Z` grava `data = 2026-10-26`.
- **Validação:** `pnpm install && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` (inclui `pnpm --filter @yandeh/api test`).
- **Validação manual:** `docker compose up --build`. POST do exemplo C001 (`X-Seller-Id: V01`, itens P001 qty 10 desc 0, P006 qty 40 desc 2, P010 qty 24 desc 0). No psql do container: coluna `data` do pedido criado junto com `now()` em UTC e `now() at time zone 'America/Fortaleza'`, provando que a data gravada é a de Fortaleza. Saída dos testes unitários da virada.
- **Commit:** `fix(api): grava data do pedido no fuso do negócio`

### [x] T-15 — Crédito em transação (`SELECT ... FOR UPDATE`)

- **Refs:** RN09; D10; A12; R7.
- **Depende de:** T-14
- **Escopo:** na mesma transação: lock do cliente, soma reservado, valida crédito; `Enviado` soma em `credito_utilizado`; pendente só reserva.
- **Aceite:** C002 pedido R$ 400 → 422 `INSUFFICIENT_CREDIT`; C002 R$ 320 pendente → disponível vira R$ 30; dois POSTs concorrentes que somados estouram → só um passa (teste com `Promise.all`).
- **Validação manual:** `docker compose up`. POST `/orders` C002/`X-Seller-Id: V01` com `Idempotency-Key` nova e item acima do crédito (P001 qty 16 na TP02: 16×2529=40464 > 35000) → 422 `INSUFFICIENT_CREDIT`. POST pendente com líquido 32000 e desconto > 5% (alçada V01) → 201 `Aguardando aprovação`; `GET /sellers/V01/customers` mostra C002 `availableCredit: 3000`. Dois POST concorrentes cuja soma estoura 35000 → só um 201 e o outro 422 `INSUFFICIENT_CREDIT`. Evidência: status + JSON + `availableCredit`.
- **Docs:** A12 já decidida (histórico já está no `credito_utilizado`; só pedidos novos somam). Atualizar só se a implementação revelar algo novo.
- **Commit:** `feat(api): reserva e consumo de crédito em transação`

### [x] T-16 — Idempotência do envio (`Idempotency-Key`)

- **Refs:** RN13; A20; R9.
- **Depende de:** T-14
- **Escopo:** header obrigatório (UUID); chave única; reenvio → 200 com o mesmo pedido; corrida resolvida pelo `UNIQUE` (captura conflito e relê).
- **Aceite:** mesmo POST 2× com a mesma chave → 1 linha em `pedidos`, segundo retorna 200 com o mesmo id; sem header → 400.
- **Validação manual:** `docker compose up`. `KEY=$(uuidgen)` e POST `/orders` (exemplo C001, `X-Seller-Id: V01`, `Content-Type: application/json`, `Idempotency-Key: $KEY`) duas vezes com a mesma chave → primeiro 201, segundo 200 com o mesmo `id`. `SELECT count(*) FROM pedidos WHERE idempotency_key = '$KEY'` → 1. POST sem header `Idempotency-Key` → 400. Evidência: status + id repetido + count SQL.
- **Commit:** `feat(api): envio idempotente com Idempotency-Key`

## F4 — Telas (Vue 3 + Tailwind + Pinia, mobile-first; skill `frontend-design`)

Validação comum: `pnpm --filter @yandeh/web typecheck && pnpm --filter @yandeh/web build` + passos manuais em viewport 390 px.

### [x] T-17 — Cliente HTTP, store de sessão e tela "Quem é você?"

- **Refs:** req. 1; PRD §7.1; A1.
- **Depende de:** T-11
- **Aceite:** escolher V01 persiste sessão (recarregar mantém) e leva à carteira; S01 leva a Aprovações; sem sessão, qualquer URL (existente ou não) redireciona para a seleção `/`; com sessão, rota de outro papel ou URL inexistente mostra o mesmo 404 ("Página não encontrada") sem mudar a URL, com link para o início do papel; `/` continua acessível para trocar de usuário.
- **Validação:** `pnpm --filter @yandeh/web typecheck && pnpm --filter @yandeh/web build`; `pnpm --filter @yandeh/web test` (store de sessão + guard de rota e papel).
- **Validação manual:** `docker compose up --build`. Viewport ~390 px em http://localhost:5173. Escolher V01 Carlos Menezes → `/clientes` (Minha carteira); recarregar mantém a sessão V01. Escolher S01 Marta Fernandes → `/supervisor` (Aprovações). Sem sessão, abrir `/clientes` ou URL inexistente → `/`. Com V01, abrir `/supervisor` e `/nao-existe` → o mesmo 404, URL mantida. Com S01, abrir `/clientes` → o mesmo 404. Evidência: screenshots da seleção, da carteira após reload, do redirect (URL final visível) e dos 404s (artifacts, fora do repo).
- **Commit:** `feat(web): login simulado com seleção de vendedor`
- **Status:** feito

### [x] T-18 — Tela "Minha carteira"

- **Refs:** RN01, RN02, RN09; PRD §7.2; R1.
- **Depende de:** T-12, T-17
- **Aceite:** V01 vê C001–C004 com cidade/UF; badge "Padrão (fallback)" no C004; crédito em BRL; destaque em clientes com crédito < mínimo (V02 → C006; V03 → C010).
- **Validação:** `pnpm --filter @yandeh/web typecheck && pnpm --filter @yandeh/web build`; `pnpm --filter @yandeh/web test` (formatação, destaque abaixo do mínimo e renderização com API mockada).
- **Validação manual:** `docker compose down -v && docker compose up --build`. Viewport ~390 px. Logar V01 → "Minha carteira" lista só C001 Mercadinho São José (Fortaleza/CE), C002 Minibox Bom Preço (Fortaleza/CE), C003 Conveniência Esquina (Caucaia/CE), C004 Mercearia Dona Lúcia (Maracanaú/CE); C004 com badge "Padrão (fallback)"; créditos em BRL (C001 R$ 3.800,00; C002 R$ 350,00). Logar V02 → C006 Mercadinho Central em destaque (crédito R$ 100,00 < mínimo). Logar V03 → C010 Conveniência 24h Posto Sol em destaque (R$ 0,00). Evidência: screenshots das três carteiras (artifacts, fora do repo).
- **Commit:** `feat(web): carteira do vendedor com tabela e crédito`
- **Status:** feito

### [x] T-19 — Pedido: busca de produtos

- **Refs:** RN02–RN04; PRD §7.3; R2.
- **Depende de:** T-13, T-18
- **Aceite:** "achocolatado" e `7891831978575` mostram P009 e P023 (descrições distintas visíveis); C004 mostra aviso "Cliente sem tabela — usando Tabela Padrão"; busca com debounce; estado vazio/erro.
- **Validação:** `pnpm --filter @yandeh/web typecheck && pnpm --filter @yandeh/web build`; `pnpm --filter @yandeh/web test` (debounce com fake timers, resultados P009/P023, aviso de fallback, vazio/erro e 404 em 403/404).
- **Validação manual:** Logar V01, abrir o pedido de C001 (`/clientes/C001/pedido`). Digitar "achocolatado" e, em outra busca, `7891831978575` → P009 e P023 com descrições distintas e preço TP01; P021/P022 não aparecem. Abrir o pedido de C004 → aviso "Cliente sem tabela — usando Tabela Padrão" e preços TP01. Confirmar debounce da busca. Busca sem resultado e falha de rede mostram estados vazio/erro. Evidência: screenshots da busca em C001 e do aviso em C004.
- **Commit:** `feat(web): busca de produtos no pedido`
- **Status:** feito

### [x] T-20 — Pedido: carrinho (Unidades e Lote interligados, desconto, remover)

- **Refs:** RN05, RN06; D9; R3.
- **Depende de:** T-19, T-04
- **Escopo:** store Pinia do rascunho em **unidades**; campos Unidades e Lote (rótulo CX/FD) interligados via funções de T-04; Unidades somente leitura quando `venda_somente_multiplo`; só Unidades para `UN` fator 1; desconto 0–100.
- **Aceite:** P006 (FD 20, só múltiplo): Lote 2 FD → 40 un, Unidades somente leitura; P004 (CX 20, não só múltiplo): 7 un → Lote vazio, 20 un → Lote 1 CX, Lote 2 → 40 un; P010 (CX 12, só múltiplo): Lote 2 → 24 un, Unidades somente leitura; remover item atualiza totais; erro inline em quantidade inválida.
- **Validação:** `pnpm --filter @yandeh/web typecheck && pnpm --filter @yandeh/web build`; `pnpm --filter @yandeh/web test` (store do rascunho, interligação P006/P004/P010, somente leitura, só Unidades para UN fator 1, faixa de desconto, remover e erro inline).
- **Validação manual:** No pedido de C001: adicionar P006 Macarrão Espaguete 500g (FD 20, só múltiplo) → Lote 2 FD preenche 40 un e Unidades fica somente leitura. Adicionar P004 Óleo de Soja 900ml (CX 20, não só múltiplo): 7 un → Lote vazio; 20 un → Lote 1 CX; Lote 2 → 40 un. Adicionar P010 Leite UHT Integral 1L (CX 12, só múltiplo): Lote 2 → 24 un, Unidades somente leitura. Remover um item atualiza os totais; quantidade inválida mostra erro inline. Evidência: screenshots dos três produtos no carrinho.
- **Commit:** `feat(web): carrinho com campos unidades e lote interligados`
- **Status:** feito

### [x] T-21 — Pedido: totais, bloqueios e envio

- **Refs:** RN07–RN10; R4, R5, R7.
- **Depende de:** T-20, T-14, T-08
- **Escopo:** painel fixo de totais (`orderTotals`); lista de `validateOrder`; aviso "precisará de aprovação" (`statusForDiscount`); botão Enviar desabilitado com bloqueio; envia com `Idempotency-Key`; exibe 422 da API; tela de resultado com status.
- **Aceite:** exemplo C001 mostra R$ 521,96 / R$ 2,66 / R$ 519,30 e envia como "Enviado"; arroz 6% mostra aviso e resulta "Aguardando aprovação"; C002 com R$ 400 → bloqueio de crédito; < R$ 300 → bloqueio de mínimo.
- **Validação manual:** No pedido C001, montar o exemplo (P001 10 un 0%, P006 40 un 2%, P010 24 un 0%) → painel R$ 521,96 / R$ 2,66 / R$ 519,30; sem bloqueios; Enviar (com `Idempotency-Key`) → resultado "Enviado". Repetir com P001 a 6% → aviso "precisará de aprovação" e resultado "Aguardando aprovação". Em C002, itens que somem ~R$ 400 → bloqueio `INSUFFICIENT_CREDIT` e Enviar desabilitado. Líquido < R$ 300 → bloqueio `BELOW_MINIMUM`. Evidência: screenshots dos totais C001, do aviso de alçada e dos bloqueios.
- **Commit:** `feat(web): totais, bloqueios e envio do pedido`
- **Status:** feito

## F5 — Histórico e repetir (req. 8)

### [x] T-22 — API: `GET /customers/:id/orders` e `POST .../repeat`

- **Refs:** RN12; A15–A18, A33–A36; R8.
- **Depende de:** T-14, T-09
- **Aceite:** C001 lista PH001 com status/total; repeat PH001 → itens sem P022 + `removed` com motivo, P001 a 2690, descontos 0; **não** cria pedido (`count(pedidos)` igual); PH004 Cancelado listado e repetível; outra carteira → 403.
- **Validação:** `curl -X POST -H 'X-Seller-Id: V01' localhost:3333/customers/C001/orders/PH001/repeat`.
- **Validação manual:** `docker compose up`. `curl -sS -D- -H 'X-Seller-Id: V01' localhost:3333/customers/C001/orders` → 200 listando PH001 com status/total. `curl -sS -D- -X POST -H 'X-Seller-Id: V01' localhost:3333/customers/C001/orders/PH001/repeat` → 200 com itens sem P022, `removed` com motivo, P001 a 2690, descontos 0; `SELECT count(*) FROM pedidos` inalterado. Repeat de PH004 (Cancelado, C006, `X-Seller-Id: V02`) funciona. `curl -sS -D- -H 'X-Seller-Id: V01' localhost:3333/customers/C005/orders` → 403. Evidência: status + JSON + count.
- **Commit:** `feat(api): histórico do cliente e montagem de repetir pedido`
- **Status:** feito

### [x] T-23 — Web: histórico e "Repetir pedido"

- **Depende de:** T-22, T-21
- **Aceite:** lista data, status, total; "Repetir" carrega o carrinho para revisão com aviso "P022 removido (inativo)"; descontos 0%; item cujo fator mudou: não só múltiplo vem com as mesmas unidades, Lote vazio e mensagem; só múltiplo vem com o lote arredondado para cima e a mensagem "A quantidade de unidades por lote mudou para 12; a quantidade foi ajustada para 3 lote(s) (36 unidades)"; nada é enviado sem clicar Enviar; confirma antes de sobrescrever rascunho existente.
- **Validação manual:** Logar V01, abrir C001 e o histórico → PH001 com data 2026-09-15, status Faturado e total. Clicar "Repetir" → carrinho para revisão, aviso de P022 removido (inativo), P001 a R$ 26,90, P006 com 0%. Nada é enviado sem clicar Enviar; se já houver rascunho, confirma antes de sobrescrever. Item cujo fator mudou: não só múltiplo vem com as mesmas unidades, Lote vazio e mensagem; só múltiplo vem com lote arredondado para cima e "A quantidade de unidades por lote mudou para 12; a quantidade foi ajustada para 3 lote(s) (36 unidades)". Evidência: screenshots do histórico e do carrinho após repetir.
- **Commit:** `feat(web): histórico do cliente com repetir pedido`
- **Status:** feito

## F6 — Supervisor (fecha o fluxo do req. 5)

### [x] T-24 — API: pendentes, aprovar e rejeitar

- **Refs:** RN09, RN11; D10; A13; R5, R7.
- **Depende de:** T-15
- **Escopo:** `GET /supervisor/orders?status=Aguardando aprovação`; `POST /supervisor/orders/:id/approve|reject` (header `X-Supervisor-Id`); aprovar revalida crédito em transação e move reserva → utilizado; rejeitar libera; só pendente pode mudar (senão 409).
- **Aceite:** C002 pendente R$ 320 → rejeitar → disponível volta a R$ 350; aprovar → utilizado +32.000; aprovar 2× → 409.
- **Validação manual:** `docker compose up`. Criar pedido C002 `Aguardando aprovação` com líquido 32000. `curl -sS -D- -H 'X-Supervisor-Id: S01' 'localhost:3333/supervisor/orders?status=Aguardando%20aprova%C3%A7%C3%A3o'` → 200 contém o pedido. `curl -sS -D- -X POST -H 'X-Supervisor-Id: S01' localhost:3333/supervisor/orders/<id>/reject` → disponível de C002 volta a 35000. Recriar e `POST .../approve` → `credito_utilizado` de C002 sobe 32000; o mesmo approve de novo → 409. Pedido já Enviado → 409. Evidência: status + `GET /sellers/V01/customers` no C002.
- **Commit:** `feat(api): aprovação e rejeição de pedidos pelo supervisor`
- **Status:** feito

### [ ] T-25 — Web: tela de Aprovações

- **Depende de:** T-24, T-17
- **Aceite:** lista pendentes com vendedor, cliente, maior desconto vs alçada, total; Aprovar/Rejeitar atualiza a lista e mostra erro de crédito se a revalidação falhar.
- **Validação manual:** Logar S01 → Aprovações lista pendentes com vendedor, cliente, maior desconto vs alçada e total. Aprovar um item some da lista; rejeitar outro some e libera crédito (conferir carteira do vendedor, ex.: C002 de V01). Se a revalidação de crédito falhar, a UI mostra o erro. Evidência: screenshots da lista e do estado após aprovar/rejeitar.
- **Commit:** `feat(web): tela de aprovações do supervisor`

## F7 — Offline parcial (req. 9, V1)

### [ ] T-26 — Rascunho persistido localmente

- **Refs:** RN13; A20; R9.
- **Depende de:** T-21
- **Escopo:** rascunho por cliente (itens + `idempotencyKey` UUID) em localStorage; restaura ao recarregar; limpa após envio confirmado; indicador "rascunho salvo".
- **Fora:** catálogo/preço offline, sincronização bidirecional.
- **Aceite:** montar pedido C001, recarregar → itens e chave mantidos; após envio, rascunho some.
- **Validação manual:** Logar V01, montar pedido C001 (pelo menos P001 10 un). Recarregar → itens e a mesma `idempotencyKey` permanecem; indicador "rascunho salvo". Enviar com sucesso → rascunho some do localStorage. Evidência: screenshot do indicador + DevTools Application/localStorage antes e depois do envio.
- **Commit:** `feat(web): persistência local do rascunho do pedido`

### [ ] T-27 — Retentativa de envio com a mesma chave

- **Depende de:** T-26, T-16
- **Escopo:** falha de rede/5xx → estado "pendente de envio" + botão/auto-retry com backoff usando a mesma `Idempotency-Key`; 422 não retenta; indicador online/offline (`navigator.onLine`).
- **Aceite:** DevTools offline → Enviar → "aguardando conexão"; voltar online → enviado uma única vez (`SELECT count(*) FROM pedidos WHERE idempotency_key = ...` = 1).
- **Validação manual:** Montar pedido C001, DevTools → Offline, clicar Enviar → UI "aguardando conexão" / pendente de envio. Voltar Online → envia uma vez com a mesma `Idempotency-Key`. `SELECT count(*) FROM pedidos WHERE idempotency_key = '<chave>'` → 1. 422 (ex.: abaixo do mínimo, `BELOW_MINIMUM`) não retenta. Evidência: screenshot offline + count SQL.
- **Commit:** `feat(web): retentativa de envio idempotente`

## F8 — Entrega e documentação

### [ ] T-28 — README final

- **Refs:** entregável README.
- **Depende de:** F1–F7
- **Aceite:** "como rodar", "como testar" (com o que cada suíte cobre), "o que ficou de fora" completo (sem `_(completar)_`), status atualizado.
- **Validação manual:** Ler o README do zero: seguir "Como rodar" (`docker compose up --build`) e abrir http://localhost:5173 e `GET http://localhost:3333/health` → `{"status":"ok"}`; seguir "Como testar" (`pnpm test && pnpm typecheck && pnpm lint && pnpm format:check`). Conferir que "o que ficou de fora" não tem `_(completar)_` e que o status descreve o estado atual. Evidência: comandos/saídas colados.
- **Commit:** `docs: README com como rodar, testar e fora do escopo`

### [ ] T-29 — DECISIONS: "com mais tempo" e revisão

- **Refs:** entregável DECISIONS (≥ 5).
- **Depende de:** T-28
- **Aceite:** nenhum `_a preencher_`; decisões tomadas durante as tarefas registradas; PRD e ASSUMPTIONS coerentes com o código.
- **Validação manual:** Ler `DECISIONS.md` do zero: `rg '_a preencher_' DECISIONS.md` → 0 matches; cada decisão tem contexto/alternativas/escolha/por quê/com mais tempo; cruzar com o código (centavos, fallback TP01, alçada pelo maior desconto) e com PRD/ASSUMPTIONS. Evidência: comando `rg` vazio + trecho das decisões preenchidas.
- **Commit:** `docs: completa decisões com o que faria com mais tempo`

### [ ] T-30 — AI_LOG: momentos reais e mapa de autoria

- **Refs:** entregável AI_LOG (3–5 momentos, ≥ 1 erro da IA, mapa de autoria).
- **Depende de:** T-29
- **Escopo:** autor revisa os rascunhos, remove marcas `[RASCUNHO]`, escolhe momentos a partir de `.ai-private/PROMPTS.md`; mapa por parte (modelagem, regras, API, telas, testes).
- **Validação manual:** Ler `AI_LOG.md`: 3–5 momentos, pelo menos um erro da IA, mapa de autoria (modelagem, regras, API, telas, testes); `rg '\[RASCUNHO\]' AI_LOG.md` vazio. Conferir que os momentos batem com `.ai-private/PROMPTS.md`. Evidência: sumário dos momentos + `rg` vazio.
- **Commit:** `docs: AI_LOG com momentos de uso de IA e mapa de autoria`

### [ ] T-31 — Verificação final a partir de clone limpo

- **Depende de:** T-30
- **Validação:** `git clone <repo> /tmp/check && cd /tmp/check && docker compose up --build`; roteiro manual R1–R9 (seção 11 do PRD); `pnpm install && pnpm test && pnpm typecheck && pnpm lint && pnpm format:check`; `git log` com linha `IA:` em todos os commits (`git log --format=%B | grep -c '^IA:'` = nº de commits).
- **Validação manual:** `git clone <repo> /tmp/check && cd /tmp/check && docker compose up --build`. Percorrer o roteiro manual R1–R9 do PRD §11 na Web/API (V01/C001 exemplo R$ 519,30 Enviado; busca achocolatado/`7891831978575`; P006/P004 embalagem; bloqueios mínimo/crédito; alçada; repetir PH001; rascunho + idempotência). `pnpm install && pnpm test && pnpm typecheck && pnpm lint && pnpm format:check`. `git log --format=%B | grep -c '^IA:'` = número de commits. Evidência: checklist R1–R9 + saídas.
- **Aceite:** tudo verde; só correções pontuais (cada uma em commit próprio).
- **Commit:** só se houver correção (`fix: ...`).

## Opcionais (somente se sobrar tempo)

### [ ] T-32 — (opcional) Teste e2e do fluxo feliz (Playwright)

- **Depende de:** T-21 · **Aceite:** V01 → C001 → exemplo R$ 519,30 → "Enviado".
- **Validação manual:** Rodar o e2e Playwright do fluxo feliz. No browser, o mesmo caminho: V01 → C001 → montar o exemplo (P001 10, P006 40 @ 2%, P010 24) → total R$ 519,30 → Enviar → "Enviado". Evidência: relatório Playwright + screenshot do resultado.

### [ ] T-33 — (opcional) Testes de componente do carrinho (Vitest + Vue Test Utils)

- **Depende de:** T-20 · **Aceite:** P006 com Unidades somente leitura e Lote FD; P004 7 un → Lote vazio; bloqueios exibidos.
- **Validação manual:** Rodar os testes de componente (Vitest + Vue Test Utils). No browser, no carrinho de C001: P006 com Unidades somente leitura e rótulo Lote FD; P004 com 7 un → Lote vazio; bloqueios visíveis. Evidência: saída do Vitest + screenshots.

### [ ] T-34 — (opcional) Cache do catálogo do cliente para busca offline

- **Depende de:** T-27 · **Escopo:** cache da última busca/carteira em IndexedDB, com aviso de preço possivelmente desatualizado (servidor revalida no envio).
- **Validação manual:** Com o catálogo de C001 já buscado, DevTools Offline e buscar de novo → resultados vêm do cache (IndexedDB) com aviso de preço possivelmente desatualizado. Enviar (online) revalida no servidor. Evidência: screenshot do aviso + Application/IndexedDB.
