# AI_LOG — Uso de IA

> Ferramentas: Cursor (agente). Commits de implementação assinados como `Cursor Agent`, com `Co-authored-by: Eduardo Garcia`; merges na `main` pelo autor.
>
> `.ai-private/PROMPTS.md` não está versionado (gitignored) e não existia neste checkout. Os momentos abaixo vêm do histórico git/GitHub, de [`DECISIONS.md`](DECISIONS.md) e de [`ASSUMPTIONS.md`](ASSUMPTIONS.md) — só o que dá para conferir no repositório. O autor escolhe a versão final.

---

## Momento 1 — Leitura do desafio, ambiguidades do seed e decisões de produto

- **Contexto:** T-00. Commit [`607ef9f`](https://github.com/Edu-Garcia/yandeh-pedidos/commit/607ef9f) (`chore: estrutura inicial, PRD e documentação do desafio`). O rascunho original deste arquivo já descrevia essa rodada.
- **O que foi pedido:** ler o enunciado e o `seed.json`, montar o `PRD.md` e perguntar definições com trade-offs (e sempre uma opção livre).
- **O que a IA fez:** listou imperfeições do seed que viraram assunções (C004 sem tabela, EAN duplicado P009/P023, inativos P021/P022 no histórico, preços históricos diferentes dos atuais, clientes sem crédito para o mínimo). Apresentou alternativas de stack e de regra (Fastify vs Express/NestJS, Drizzle vs Prisma, desconto/alçada, fallback de tabela, embalagem, crédito, arredondamento).
- **O que o autor decidiu:** D1–D10 em `DECISIONS.md` (marcadas **[autor]**): Vue 3 + Fastify + Drizzle + Tailwind; monorepo com `packages/shared`; escopo 1–8 + V1 do 9; desconto % por item e alçada pelo **maior** desconto; centavos inteiros; Unidades/Lote interligados; crédito com reserva; C004 → TP01. O autor descartou NestJS/Prisma/desconto no total/média ponderada. Continuidade: T-02 (PR [#3](https://github.com/Edu-Garcia/yandeh-pedidos/pull/3)) cravou D11/A27 (string vazia = fallback; preço 0 é válido) em commits extras no mesmo PR.

---

## Momento 2 — Data do pedido em UTC (a IA errou; corrigido na T-14b)

- **Contexto:** T-14, PR [#16](https://github.com/Edu-Garcia/yandeh-pedidos/pull/16) / commit [`c11c330`](https://github.com/Edu-Garcia/yandeh-pedidos/commit/c11c330). Clientes do seed são do Ceará.
- **O que foi pedido:** gravar o pedido com status e totais; a data faz parte do registro.
- **O que a IA fez (o erro):** `pedidos.data` saiu de `new Date().toISOString().slice(0, 10)` — data civil em **UTC**. Depois das 21h em Fortaleza (UTC−3) o pedido ficaria no dia seguinte.
- **Como foi verificado:** T-14b / PR [#17](https://github.com/Edu-Garcia/yandeh-pedidos/pull/17) documenta o bug e os testes da virada (`2026-10-27T02:30:00Z` → `2026-10-26` em Fortaleza).
- **O que o autor decidiu / a correção:** `businessDate` em `@yandeh/shared` (`Intl.DateTimeFormat('en-CA')`, relógio injetável); API lê `BUSINESS_TIMEZONE` (default `America/Fortaleza`). Commit [`e6dcd44`](https://github.com/Edu-Garcia/yandeh-pedidos/commit/e6dcd44). Registrado depois em D20 (T-29).

---

## Momento 3 — 403 para cliente de outra carteira (a IA errou; corrigido no PR #33)

- **Contexto:** T-13 (PR [#15](https://github.com/Edu-Garcia/yandeh-pedidos/pull/15)) o aceite pedia **403** para cliente de outra carteira (`V01` + `C005`). A D14 pede tratar recurso sem permissão como inexistente — um 403 ensina que o id existe.
- **O que a IA fez (o erro):** `findCustomerInSellerWallet` respondia **403** `{ message: 'Cliente não pertence à carteira do vendedor' }` nos endpoints de cliente e em `POST /orders`. `GET /sellers/:id/customers` listava a carteira de qualquer vendedor **sem** conferir o `X-Seller-Id`. A Web já mascarava o 403 como 404. T-22 (PR [#25](https://github.com/Edu-Garcia/yandeh-pedidos/pull/25)) e T-24 (PR [#27](https://github.com/Edu-Garcia/yandeh-pedidos/pull/27)) já tinham 404 para pedido alheio e supervisor inválido; o 403 da carteira ficou.
- **Como foi verificado:** T-29 / PR [#32](https://github.com/Edu-Garcia/yandeh-pedidos/pull/32) ainda documentava o 403 da carteira como exceção. O autor não aceitou: o 403 vazava a existência do cliente.
- **O que o autor decidiu / a correção:** PR [#33](https://github.com/Edu-Garcia/yandeh-pedidos/pull/33) (merge [`5a59326`](https://github.com/Edu-Garcia/yandeh-pedidos/commit/5a59326001d11ba4fbe249d10cc189894fb67438), commit [`6a53aa1`](https://github.com/Edu-Garcia/yandeh-pedidos/commit/6a53aa1)). Cliente de outra carteira passou a ser o **mesmo 404** `{ message: 'Cliente não encontrado' }` de cliente inexistente em `GET /customers/:id/products`, `GET /customers/:id/orders`, `POST .../repeat` e `POST /orders`. Na listagem, `GET /sellers/:id/customers` com `X-Seller-Id` diferente do `:id` passou a ser o **mesmo 404** `{ message: 'Vendedor não encontrado' }` de vendedor inexistente (header ausente continua 400). D14/A33 atualizadas. O 403 de outra carteira **não continua**.

---

## Momento 4 — Rascunho pendente editável com a mesma `Idempotency-Key` (a IA errou; corrigido com trava)

- **Contexto:** T-27, PR [#30](https://github.com/Edu-Garcia/yandeh-pedidos/pull/30) / commit [`a0c3e21`](https://github.com/Edu-Garcia/yandeh-pedidos/commit/a0c3e21). A API (T-16) faz replay 200 com a mesma chave **sem comparar o resto do corpo**.
- **O que foi pedido:** retentativa de envio com a mesma chave (rede/5xx/offline); 422 não retenta.
- **O que a IA fez (o erro):** a primeira versão deixava o rascunho **editável** enquanto `submitPending`. Dava para mudar quantidade/desconto/itens e reenviar **outro corpo** com a mesma chave: a API gravaria um pedido e devolveria outro no replay.
- **Como foi verificado:** o próprio PR #30 documenta o “Ajuste do PR #30” e a validação manual **após o lock** (controles travados, mesma chave `658f0391-…`, `SELECT count(*) = 1`, itens iguais à primeira tentativa).
- **O que o autor decidiu / a correção:** enquanto pendente, a UI trava adicionar/remover, quantidade, desconto e Repetir/Substituir. 422/4xx saem do pendente e liberam a edição; a chave permanece. Sem botão de cancelar pendente. A54 (origem “Pedido no PR #30”) e D18.

---

## Momento 5 — Status do README dizendo que a T-28 “é este PR”

- **Contexto:** T-28, PR [#31](https://github.com/Edu-Garcia/yandeh-pedidos/pull/31) / commit [`2cdd9e0`](https://github.com/Edu-Garcia/yandeh-pedidos/commit/2cdd9e0).
- **O que foi pedido:** README final (como rodar, como testar, o que ficou de fora) e status atualizado, válido **depois** do merge.
- **O que a IA fez (o erro):** o status falava em “este PR” / “Este README é a T-28” — texto de branch, inútil na `main`.
- **O que o autor decidiu / a correção:** ajuste posterior no mesmo commit (`2cdd9e0`): o status descreve o estado do repositório (F0–F7 e T-28 concluídas; faltam T-29–T-31), sem “este PR” / “nesta branch”. Registrado no corpo do PR #31.

---

## Mapa de autoria

Legenda: **Eu escrevi** · **IA gerou, eu revisei/alterei** · **IA gerou, aceitei como veio**

| Parte                                      | Autoria                      | Observações                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Modelagem (schema, entidades)              | IA gerou, eu revisei/alterei | Autor escolheu Drizzle, centavos, `idempotency_key`, status e seed intacto (D3, D8, T-10). Schema e migração gerados pela IA; T-10 só ajustou o que faltava.                                                                                                                                                                                           |
| Regras de negócio (`packages/shared`)      | IA gerou, eu revisei/alterei | Autor decidiu D7–D13 e D15 (alçada pelo maior, centavos, fallback TP01, repetir sem desconto, preço 0). IA implementou T-01–T-09 com testes e números do seed; follow-ups na T-02 (string vazia, contrato D11).                                                                                                                                        |
| API (rotas, validação, transações)         | IA gerou, eu revisei/alterei | Autor pediu 404 genérico (D14). T-13 usou 403 de carteira; PR [#33](https://github.com/Edu-Garcia/yandeh-pedidos/pull/33) unificou 404 para cliente/carteira alheios (inclui `GET /sellers/:id/customers`). Supervisor 404 (T-24), replay sem hash (T-16), data no fuso (D20). IA escreveu Fastify + Zod + `FOR UPDATE`; T-11b corrigiu ESM do shared. |
| Telas (Vue)                                | IA gerou, eu revisei/alterei | Autor decidiu D9, D16–D18 (Unidades/Lote, sem id de produto, confirmação inline, rascunho pendente travado). IA gerou Vue 3 + Pinia + skill `frontend-design` (T-17–T-27).                                                                                                                                                                             |
| Testes                                     | IA gerou, eu revisei/alterei | Autor definiu o aceite com ids do seed. IA escreveu Vitest (shared puro, API `app.inject`, web happy-dom). Casos extras depois das correções (virada de fuso, 404 genérico, trava do pendente).                                                                                                                                                        |
| Documentação (PRD, DECISIONS, ASSUMPTIONS) | IA gerou, eu revisei/alterei | Rascunho inicial a partir das decisões do autor (T-00). D1–D20 marcadas **[autor]**; T-29 preencheu “com mais tempo”; PR #33 atualizou D14/A33 (404 da carteira). Autor revisou este `AI_LOG.md` no PR #34.                                                                                                                                            |
| Scaffold / Docker / configuração           | IA gerou, eu revisei/alterei | Gerado na T-00 a partir das decisões D1–D5. Commits `607ef9f` e `b5776fc` no git estão no nome do autor; o restante da implementação está em commits `Cursor Agent`.                                                                                                                                                                                   |
