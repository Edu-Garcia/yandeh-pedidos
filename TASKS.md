# TASKS — Plano de execução por tarefas

Cada tarefa é uma unidade de **escopo fechado**: implementável, validável e commitável sozinha. Problemas encontrados numa tarefa são resolvidos **nela**, antes de seguir. Fonte da verdade: [`PRD.md`](PRD.md) (RN01–RN13, R1–R9). Decisões: [`DECISIONS.md`](DECISIONS.md) · Assunções: [`ASSUMPTIONS.md`](ASSUMPTIONS.md).

## Como usar

1. Pegue a **próxima tarefa `[ ]`** cujas dependências estão `[x]`. Marque `[~]`.
2. Siga o fluxo abaixo até o fim. Uma tarefa = um commit.
3. Atualize a tabela de progresso.

### Fluxo por tarefa (derivado de `/grill-with-docs`)

1. **Grill:** confronte a tarefa com PRD, `ASSUMPTIONS.md`, `DECISIONS.md` e o glossário (PRD §4). Uma pergunta por vez, com recomendação. Termo novo ou conflito → resolva com o autor ou registre (assunção nova em `ASSUMPTIONS.md`, decisão em `DECISIONS.md`).
2. **Implemente:** regras puras em `packages/shared` com **teste primeiro** (números reais do seed). API/telas só consomem `@yandeh/shared`.
3. **Valide:** rode os comandos da seção _Validação_ da tarefa + `pnpm typecheck && pnpm lint && pnpm format:check`.
4. **Docs:** atualize o que a tarefa tocou (PRD, ASSUMPTIONS, DECISIONS, README, `AI_LOG.md` se houve momento relevante de IA, `.ai-private/PROMPTS.md`).
5. **Status:** marque `[x]` aqui e atualize o progresso.
6. **Commit:** o agente **propõe** a mensagem; o autor escolhe a linha `IA:` e aprova. **Nunca commitar sem aprovação.** Sem squash.

### Legenda

`[ ]` a fazer · `[~]` em andamento · `[x]` feito · `[-]` fora de escopo / descartado · **(opcional)** = só se sobrar tempo

## Progresso

| Fase                              | Tarefas | `[x]` |
| --------------------------------- | ------- | ----- |
| F0 — Base (scaffold + docs)       | 1       | 1     |
| F1 — Regras puras (`shared`)      | 9       | 1     |
| F2 — Banco e seed                 | 1       | 0     |
| F3 — API (req. 1–5, 7)            | 6       | 0     |
| F4 — Telas (req. 1–5, 7)          | 5       | 0     |
| F5 — Histórico e repetir (req. 8) | 2       | 0     |
| F6 — Supervisor (fecha req. 5)    | 2       | 0     |
| F7 — Offline parcial (req. 9)     | 2       | 0     |
| F8 — Entrega e docs               | 4       | 0     |
| **Total**                         | **32**  | **2** |
| Opcionais                         | 3       | 0     |

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
- **Docs:** —
- **Commit:** `chore: estrutura inicial, PRD e documentação do desafio` + `IA: majoritária` (`607ef9f`)
- **Status:** feito, commit `607ef9f` aprovado pelo autor

## F1 — Regras puras em `packages/shared` (req. 6)

Validação comum: `pnpm --filter @yandeh/shared test` (e `pnpm --filter @yandeh/shared typecheck`). Cada tarefa troca os `it.todo` correspondentes por testes reais em `packages/shared/src/rules.test.ts` (ou arquivo por regra).

### [x] T-01 — Dinheiro em centavos (`toCents`, `formatBRL`)

- **Refs:** PRD §6 intro, RN07; D8; A14.
- **Depende de:** T-00
- **Escopo:** `toCents(reais) = round(reais × 100)` robusto a float (ex.: `3.33 → 333`, `26.9 → 2690`, `4.99 → 499`); `formatBRL(cents)` via `Intl.NumberFormat('pt-BR')`.
- **Fora:** parsing de entrada do usuário.
- **Aceite:** `toCents(0.1 + 0.2) = 30`; `formatBRL(51930) = 'R$ 519,30'` (normalizar NBSP no teste).
- **Arquivos:** `packages/shared/src/rules.ts` (ou `money.ts`), testes.
- **Commit:** `feat(shared): conversão para centavos e formatação BRL`

### [ ] T-02 — Tabela efetiva com fallback TP01 e preço do cliente

- **Refs:** RN02; D11; A2; R2.
- **Depende de:** T-01
- **Escopo:** `resolvePriceTableId(customer)` → `{ tableId, isFallback }` (ou função + flag); `unitPriceFor(product, tableId, priceItems)` → `Cents | null`.
- **Fora:** UI do aviso (T-19).
- **Aceite:** C004 (`null`) → TP01 com `isFallback = true`; C001 → TP01 sem fallback; preço P001 em TP01 = 2690.
- **Commit:** `feat(shared): tabela de preço efetiva com fallback TP01`

### [ ] T-03 — Produto vendável

- **Refs:** RN03; A4, A5.
- **Depende de:** T-02
- **Escopo:** `isSellable(product, price)` ⇔ `ativo && price != null`.
- **Aceite:** P021/P022 (inativos) → falso; P021 em TP03 (sem preço) → falso; P001 em TP01 → verdadeiro.
- **Commit:** `feat(shared): regra de produto vendável`

### [ ] T-04 — Embalagem: conversão unidades/lote e validação de quantidade

- **Refs:** RN05; D9; A6, A7, A22; R3.
- **Depende de:** T-01
- **Escopo:** funções puras `unitsFromLots(lots, factor)`; `lotsFromUnits(units, factor)` (retorna `null` quando não é exato); `hasLotField(product)` (falso para `UN` fator 1); `isUnitsReadOnly(product)` (= `venda_somente_multiplo`); `isValidQuantity(product, units)` (inteiro ≥ 1; múltiplo do fator quando `venda_somente_multiplo`).
- **Fora:** componente dos campos Unidades/Lote (T-20).
- **Aceite:** `unitsFromLots(2, 20)` = 40 (P006); `lotsFromUnits(40, 20)` = 2; `lotsFromUnits(7, 20)` = `null` (P004); `lotsFromUnits(20, 20)` = 1; P006 40 ✅, 30 ❌, Unidades somente leitura; P010 (CX 12, só múltiplo) 24 ✅; 0, -1, 1,5 ❌; produto UN fator 1 → sem campo Lote.
- **Commit:** `feat(shared): conversão unidades/lote e validação de múltiplos`

### [ ] T-05 — Totais por linha e do pedido (arredondamento por linha)

- **Refs:** RN06, RN07; D7, D8; R4.
- **Depende de:** T-01
- **Escopo:** `lineTotals(line)` (bruto, desconto half-up, líquido); `orderTotals(lines)` = soma das linhas; desconto `0 ≤ d ≤ 100` (fora disso → issue em T-08).
- **Aceite:** PH001/P006: 40 × 329 com 2% → desconto 263, líquido 12.897; exemplo C001: bruto 52.196, desconto 266, líquido **51.930 (R$ 519,30)**; arroz a 6% → desconto 1.614, líquido 50.316.
- **Commit:** `feat(shared): totais por linha e do pedido em centavos`

### [ ] T-06 — Alçada pelo maior desconto e status

- **Refs:** RN10; D7; A9; R5.
- **Depende de:** T-05
- **Escopo:** `maxDiscount(lines)`; `statusForDiscount(lines, authority)` → `Enviado` | `Aguardando aprovação` (`>` estrito).
- **Aceite:** V01 (5%) com 0%, 2%, 6% → Aguardando aprovação; V01 com 0/2/5% → Enviado; V02 (7%) com 7% → Enviado.
- **Commit:** `feat(shared): status do pedido pela alçada do maior desconto`

### [ ] T-07 — Crédito disponível com reserva de pendentes

- **Refs:** RN09; D10; A11, A12, A19; R7.
- **Depende de:** T-01
- **Escopo:** `reservedCredit(pendingOrders)`; `availableCredit(customer, reserved)` (pode ser ≤ 0; não clampa negativo sem decidir no grill).
- **Aceite:** C001 → 380.000; C002 → 35.000; C006 → 10.000; C010 → 0; C002 com pendente de 32.000 → 3.000.
- **Commit:** `feat(shared): crédito disponível com reserva de pendentes`

### [ ] T-08 — Agregado de bloqueios de envio (`validateOrder`)

- **Refs:** RN05, RN06, RN08, RN09; A10, A11; R4, R7.
- **Depende de:** T-03, T-04, T-05, T-07
- **Escopo:** `validateOrder({ lines, products, availableCredit })` → `ValidationIssue[]` com códigos estáveis (ex.: `EMPTY_ORDER`, `INVALID_QUANTITY`, `INVALID_DISCOUNT`, `PRODUCT_NOT_SELLABLE`, `BELOW_MINIMUM`, `INSUFFICIENT_CREDIT`) e mensagens pt-BR. Alçada **não** é bloqueio (só aviso).
- **Aceite:** líquido 29.999 → `BELOW_MINIMUM`; 30.000 → ok; C002 com pedido de R$ 400 → `INSUFFICIENT_CREDIT`; C010 com R$ 300 → `INSUFFICIENT_CREDIT`; P006 com 30 un → `INVALID_QUANTITY`; exemplo C001 (R$ 519,30, crédito 380.000) → `[]`; mínimo avaliado no **líquido** (bruto 30.500 com desconto → líquido < 30.000 bloqueia).
- **Docs:** códigos já definidos em PRD §8 e A24; atualizar se surgir código novo.
- **Commit:** `feat(shared): validação agregada de bloqueios de envio`

### [ ] T-09 — Montagem de "repetir pedido"

- **Refs:** RN12; D12; A15–A18; R8.
- **Depende de:** T-03, T-04
- **Escopo:** `buildRepeatDraft(historyOrder, catalog, priceTable)` → `{ lines, removed: [{productId, reason}], notices }`; preço atual, quantidade do histórico, desconto 0%, inativos/sem preço removidos; quantidade do histórico em unidades comparada ao fator atual: produto não só múltiplo que não fecha lote → mesmas unidades, Lote vazio + aviso; produto `venda_somente_multiplo` não múltiplo → `lote = ceil(unidades / fator_atual)`, `unidades = lote × fator_atual` + aviso `{ code: 'PACK_FACTOR_CHANGED', productId, newFactor, lots, units }` em `notices`.
- **Aceite:** PH001 (C001) → P022 removido com motivo; P001 a 2690 (não 2590); P006 com 0% (era 2%); funciona para PH004 Cancelado; com fator alterado em fixture: produto só múltiplo com 30 un no histórico e fator atual 12 → 3 lotes = 36 un + `PACK_FACTOR_CHANGED` com `newFactor: 12`; P004 (não só múltiplo) com fator alterado e 7 un → 7 un, Lote vazio + aviso. Histórico do seed fecha todos os lotes (salvaguarda).
- **Commit:** `feat(shared): montagem de rascunho para repetir pedido`

## F2 — Banco e seed

### [ ] T-10 — Revisar schema/seed para status, reserva e idempotência

- **Refs:** PRD §9; RN09, RN11, RN13.
- **Depende de:** T-00
- **Escopo:** conferir `pedidos.idempotency_key UNIQUE`, `status`, `vendedor_id`, totais em centavos, `pedidos_itens` com preço congelado; ajustar e gerar migração se faltar algo. Seed idempotente com histórico PH00x.
- **Fora:** editar `seed.json`.
- **Aceite:** `docker compose down -v && docker compose up --build` duas vezes sem erro/duplicata; `SELECT count(*) FROM pedidos` = nº de `pedidos_historico`.
- **Validação:** `pnpm --filter @yandeh/api db:generate` (sem diff ou migração nova revisada); `pnpm --filter @yandeh/api db:setup` 2×.
- **Commit:** `chore(api): ajusta schema de pedidos para status e idempotência`

## F3 — API (Fastify + Zod; rota testada com `app.inject`)

Validação comum: `pnpm --filter @yandeh/api test` (Postgres de teste via `docker compose up -d postgres`).

### [ ] T-11 — `GET /sellers` e `GET /supervisors` (login simulado)

- **Refs:** req. 1; A1; PRD §8.
- **Depende de:** T-10
- **Aceite:** retorna V01 Carlos (5%), V02 Renata (7%), V03 Paulo (3%) e S01 Marta.
- **Validação:** `curl localhost:3333/sellers`.
- **Commit:** `feat(api): lista vendedores e supervisor para login simulado`

### [ ] T-12 — `GET /sellers/:id/customers` (carteira com crédito e tabela efetiva)

- **Refs:** RN01, RN02, RN09; R1, R7.
- **Depende de:** T-11, T-02, T-07
- **Aceite:** V01 → exatamente C001–C004; C004 com `priceTableId: 'TP01', isFallback: true`; C001 `availableCredit: 380000`; C002 35.000; vendedor inexistente → 404.
- **Validação:** `curl localhost:3333/sellers/V01/customers`.
- **Commit:** `feat(api): carteira do vendedor com crédito disponível`

### [ ] T-13 — `GET /customers/:id/products?q=` (nome/EAN com preço do cliente)

- **Refs:** RN02–RN04; A3, A21; R2.
- **Depende de:** T-12, T-03
- **Escopo:** busca case/acento-insensível (`unaccent` ou normalização em JS) ou EAN exato; só vendáveis; preço da tabela efetiva; header `X-Seller-Id` valida carteira.
- **Aceite:** `q=achocolatado` e `q=7891831978575` → P009 e P023; P021/P022 nunca; C004 → preços TP01; cliente de outra carteira → 403.
- **Validação:** `curl -H 'X-Seller-Id: V01' 'localhost:3333/customers/C001/products?q=7891831978575'`.
- **Commit:** `feat(api): busca de produtos por nome ou EAN com preço da tabela do cliente`

### [ ] T-14 — `POST /orders`: validação no servidor e status

- **Refs:** RN01, RN05–RN10; R1, R4, R5.
- **Depende de:** T-13, T-06, T-08
- **Escopo:** Zod no body; recalcula preço/totais no servidor (ignora preço do cliente); `validateOrder` → 422 com `ValidationIssue[]`; `statusForDiscount` → status; grava pedido + itens.
- **Fora:** transação de crédito e idempotência (T-15, T-16).
- **Aceite:** exemplo C001 → 201 `Enviado`, total 51.930; arroz a 6% → `Aguardando aprovação`; líquido < R$ 300 → 422 `BELOW_MINIMUM`; V01 pedindo para C005 → 403.
- **Validação:** `curl -X POST -H 'Content-Type: application/json' -H 'X-Seller-Id: V01' -H "Idempotency-Key: $(uuidgen)" -d '{"customerId":"C001","items":[{"productId":"P001","quantity":10,"discountPercent":0},{"productId":"P006","quantity":40,"discountPercent":2},{"productId":"P010","quantity":24,"discountPercent":0}]}' localhost:3333/orders`.
- **Commit:** `feat(api): cria pedido validando regras e decidindo status`

### [ ] T-15 — Crédito em transação (`SELECT ... FOR UPDATE`)

- **Refs:** RN09; D10; A12; R7.
- **Depende de:** T-14
- **Escopo:** na mesma transação: lock do cliente, soma reservado, valida crédito; `Enviado` soma em `credito_utilizado`; pendente só reserva.
- **Aceite:** C002 pedido R$ 400 → 422 `INSUFFICIENT_CREDIT`; C002 R$ 320 pendente → disponível vira R$ 30; dois POSTs concorrentes que somados estouram → só um passa (teste com `Promise.all`).
- **Docs:** A12 já decidida (histórico já está no `credito_utilizado`; só pedidos novos somam). Atualizar só se a implementação revelar algo novo.
- **Commit:** `feat(api): reserva e consumo de crédito em transação`

### [ ] T-16 — Idempotência do envio (`Idempotency-Key`)

- **Refs:** RN13; A20; R9.
- **Depende de:** T-14
- **Escopo:** header obrigatório (UUID); chave única; reenvio → 200 com o mesmo pedido; corrida resolvida pelo `UNIQUE` (captura conflito e relê).
- **Aceite:** mesmo POST 2× com a mesma chave → 1 linha em `pedidos`, segundo retorna 200 com o mesmo id; sem header → 400.
- **Commit:** `feat(api): envio idempotente com Idempotency-Key`

## F4 — Telas (Vue 3 + Tailwind + Pinia, mobile-first; skill `frontend-design`)

Validação comum: `pnpm --filter @yandeh/web typecheck && pnpm --filter @yandeh/web build` + passos manuais em viewport 390 px.

### [ ] T-17 — Cliente HTTP, store de sessão e tela "Quem é você?"

- **Refs:** req. 1; PRD §7.1; A1.
- **Depende de:** T-11
- **Aceite:** escolher V01 persiste sessão (recarregar mantém) e leva à carteira; S01 leva a Aprovações; sem sessão → redireciona para seleção.
- **Commit:** `feat(web): login simulado com seleção de vendedor`

### [ ] T-18 — Tela "Minha carteira"

- **Refs:** RN01, RN02, RN09; PRD §7.2; R1.
- **Depende de:** T-12, T-17
- **Aceite:** V01 vê C001–C004 com cidade/UF; badge "Padrão (fallback)" no C004; crédito em BRL; destaque em clientes com crédito < mínimo (V02 → C006; V03 → C010).
- **Commit:** `feat(web): carteira do vendedor com tabela e crédito`

### [ ] T-19 — Pedido: busca de produtos

- **Refs:** RN02–RN04; PRD §7.3; R2.
- **Depende de:** T-13, T-18
- **Aceite:** "achocolatado" e `7891831978575` mostram P009 e P023 (descrições distintas visíveis); C004 mostra aviso "Cliente sem tabela — usando Tabela Padrão"; busca com debounce; estado vazio/erro.
- **Commit:** `feat(web): busca de produtos no pedido`

### [ ] T-20 — Pedido: carrinho (Unidades e Lote interligados, desconto, remover)

- **Refs:** RN05, RN06; D9; R3.
- **Depende de:** T-19, T-04
- **Escopo:** store Pinia do rascunho em **unidades**; campos Unidades e Lote (rótulo CX/FD) interligados via funções de T-04; Unidades somente leitura quando `venda_somente_multiplo`; só Unidades para `UN` fator 1; desconto 0–100.
- **Aceite:** P006 (FD 20, só múltiplo): Lote 2 FD → 40 un, Unidades somente leitura; P004 (CX 20, não só múltiplo): 7 un → Lote vazio, 20 un → Lote 1 CX, Lote 2 → 40 un; P010 (CX 12, só múltiplo): Lote 2 → 24 un, Unidades somente leitura; remover item atualiza totais; erro inline em quantidade inválida.
- **Commit:** `feat(web): carrinho com campos unidades e lote interligados`

### [ ] T-21 — Pedido: totais, bloqueios e envio

- **Refs:** RN07–RN10; R4, R5, R7.
- **Depende de:** T-20, T-14, T-08
- **Escopo:** painel fixo de totais (`orderTotals`); lista de `validateOrder`; aviso "precisará de aprovação" (`statusForDiscount`); botão Enviar desabilitado com bloqueio; envia com `Idempotency-Key`; exibe 422 da API; tela de resultado com status.
- **Aceite:** exemplo C001 mostra R$ 521,96 / R$ 2,66 / R$ 519,30 e envia como "Enviado"; arroz 6% mostra aviso e resulta "Aguardando aprovação"; C002 com R$ 400 → bloqueio de crédito; < R$ 300 → bloqueio de mínimo.
- **Commit:** `feat(web): totais, bloqueios e envio do pedido`

## F5 — Histórico e repetir (req. 8)

### [ ] T-22 — API: `GET /customers/:id/orders` e `POST .../repeat`

- **Refs:** RN12; A15–A18; R8.
- **Depende de:** T-14, T-09
- **Aceite:** C001 lista PH001 com status/total; repeat PH001 → itens sem P022 + `removed` com motivo, P001 a 2690, descontos 0; **não** cria pedido (`count(pedidos)` igual); PH004 Cancelado listado e repetível; outra carteira → 403.
- **Validação:** `curl -X POST -H 'X-Seller-Id: V01' localhost:3333/customers/C001/orders/PH001/repeat`.
- **Commit:** `feat(api): histórico do cliente e montagem de repetir pedido`

### [ ] T-23 — Web: histórico e "Repetir pedido"

- **Depende de:** T-22, T-21
- **Aceite:** lista data, status, total; "Repetir" carrega o carrinho para revisão com aviso "P022 removido (inativo)"; descontos 0%; item cujo fator mudou: não só múltiplo vem com as mesmas unidades, Lote vazio e mensagem; só múltiplo vem com o lote arredondado para cima e a mensagem "A quantidade de unidades por lote mudou para 12; a quantidade foi ajustada para 3 lote(s) (36 unidades)"; nada é enviado sem clicar Enviar; confirma antes de sobrescrever rascunho existente.
- **Commit:** `feat(web): histórico do cliente com repetir pedido`

## F6 — Supervisor (fecha o fluxo do req. 5)

### [ ] T-24 — API: pendentes, aprovar e rejeitar

- **Refs:** RN09, RN11; D10; A13; R5, R7.
- **Depende de:** T-15
- **Escopo:** `GET /supervisor/orders?status=Aguardando aprovação`; `POST /supervisor/orders/:id/approve|reject` (header `X-Supervisor-Id`); aprovar revalida crédito em transação e move reserva → utilizado; rejeitar libera; só pendente pode mudar (senão 409).
- **Aceite:** C002 pendente R$ 320 → rejeitar → disponível volta a R$ 350; aprovar → utilizado +32.000; aprovar 2× → 409.
- **Commit:** `feat(api): aprovação e rejeição de pedidos pelo supervisor`

### [ ] T-25 — Web: tela de Aprovações

- **Depende de:** T-24, T-17
- **Aceite:** lista pendentes com vendedor, cliente, maior desconto vs alçada, total; Aprovar/Rejeitar atualiza a lista e mostra erro de crédito se a revalidação falhar.
- **Commit:** `feat(web): tela de aprovações do supervisor`

## F7 — Offline parcial (req. 9, V1)

### [ ] T-26 — Rascunho persistido localmente

- **Refs:** RN13; A20; R9.
- **Depende de:** T-21
- **Escopo:** rascunho por cliente (itens + `idempotencyKey` UUID) em localStorage; restaura ao recarregar; limpa após envio confirmado; indicador "rascunho salvo".
- **Fora:** catálogo/preço offline, sincronização bidirecional.
- **Aceite:** montar pedido C001, recarregar → itens e chave mantidos; após envio, rascunho some.
- **Commit:** `feat(web): persistência local do rascunho do pedido`

### [ ] T-27 — Retentativa de envio com a mesma chave

- **Depende de:** T-26, T-16
- **Escopo:** falha de rede/5xx → estado "pendente de envio" + botão/auto-retry com backoff usando a mesma `Idempotency-Key`; 422 não retenta; indicador online/offline (`navigator.onLine`).
- **Aceite:** DevTools offline → Enviar → "aguardando conexão"; voltar online → enviado uma única vez (`SELECT count(*) FROM pedidos WHERE idempotency_key = ...` = 1).
- **Commit:** `feat(web): retentativa de envio idempotente`

## F8 — Entrega e documentação

### [ ] T-28 — README final

- **Refs:** entregável README.
- **Depende de:** F1–F7
- **Aceite:** "como rodar", "como testar" (com o que cada suíte cobre), "o que ficou de fora" completo (sem `_(completar)_`), status atualizado.
- **Commit:** `docs: README com como rodar, testar e fora do escopo`

### [ ] T-29 — DECISIONS: "com mais tempo" e revisão

- **Refs:** entregável DECISIONS (≥ 5).
- **Depende de:** T-28
- **Aceite:** nenhum `_a preencher_`; decisões tomadas durante as tarefas registradas; PRD e ASSUMPTIONS coerentes com o código.
- **Commit:** `docs: completa decisões com o que faria com mais tempo`

### [ ] T-30 — AI_LOG: momentos reais e mapa de autoria

- **Refs:** entregável AI_LOG (3–5 momentos, ≥ 1 erro da IA, mapa de autoria).
- **Depende de:** T-29
- **Escopo:** autor revisa os rascunhos, remove marcas `[RASCUNHO]`, escolhe momentos a partir de `.ai-private/PROMPTS.md`; mapa por parte (modelagem, regras, API, telas, testes).
- **Commit:** `docs: AI_LOG com momentos de uso de IA e mapa de autoria`

### [ ] T-31 — Verificação final a partir de clone limpo

- **Depende de:** T-30
- **Validação:** `git clone <repo> /tmp/check && cd /tmp/check && docker compose up --build`; roteiro manual R1–R9 (seção 11 do PRD); `pnpm install && pnpm test && pnpm typecheck && pnpm lint && pnpm format:check`; `git log` com linha `IA:` em todos os commits (`git log --format=%B | grep -c '^IA:'` = nº de commits).
- **Aceite:** tudo verde; só correções pontuais (cada uma em commit próprio).
- **Commit:** só se houver correção (`fix: ...`).

## Opcionais (somente se sobrar tempo)

### [ ] T-32 — (opcional) Teste e2e do fluxo feliz (Playwright)

- **Depende de:** T-21 · **Aceite:** V01 → C001 → exemplo R$ 519,30 → "Enviado".

### [ ] T-33 — (opcional) Testes de componente do carrinho (Vitest + Vue Test Utils)

- **Depende de:** T-20 · **Aceite:** P006 com Unidades somente leitura e Lote FD; P004 7 un → Lote vazio; bloqueios exibidos.

### [ ] T-34 — (opcional) Cache do catálogo do cliente para busca offline

- **Depende de:** T-27 · **Escopo:** cache da última busca/carteira em IndexedDB, com aviso de preço possivelmente desatualizado (servidor revalida no envio).
