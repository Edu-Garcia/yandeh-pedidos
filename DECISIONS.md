# Decisões

Formato: contexto · alternativas consideradas · escolha · por quê · o que faria diferente com mais tempo.
Decisões marcadas **[autor]** foram tomadas pelo candidato (com os motivos dele); a IA apresentou opções e trade-offs.

---

## D1 — Stack: Vue 3 + Node.js/TypeScript + PostgreSQL [autor]

- **Contexto:** o desafio recomenda a stack do time.
- **Alternativas:** outra stack (exigiria justificativa).
- **Escolha:** Vue 3, Node.js + TypeScript, PostgreSQL.
- **Por quê:** é a stack recomendada e usada pelo time; reduz atrito na avaliação e na conversa.
- **Com mais tempo:** não trocaria a stack. O ganho estaria no que ficou de fora: e2e do fluxo feliz (T-32), testes de componente do carrinho (T-33) e a verificação a partir de clone limpo (T-31).

## D2 — Backend: Fastify [autor]

- **Contexto:** API pequena de escopo fechado, num teste técnico com prazo curto.
- **Alternativas:** Express (tipagem fraca, erros assíncronos tratados manualmente); NestJS (boilerplate e "mágica" de DI/decorators difícil de explicar ao vivo).
- **Escolha:** Fastify + Zod.
- **Por quê:** rápido e flexível; validação por schema e boa tipagem (Zod/TypeBox) facilitam testes (`app.inject`) e estrutura. Express/NestJS são mais pesados/complexos sem necessidade para o escopo.
- **Com mais tempo:** manteria Fastify + Zod. O que faltou não é outro framework: é o roteiro R1–R9 num clone limpo (T-31) e um e2e que exercite as rotas no browser (T-32).

## D3 — Acesso a dados: Drizzle ORM + drizzle-kit [autor]

- **Contexto:** precisa de tipagem forte, migrações e SQL fino (ex.: `SELECT ... FOR UPDATE` na reserva de crédito).
- **Alternativas:** Prisma (exige `prisma generate`, imagem Docker mais pesada, problemas de engine/OpenSSL no Alpine, particularidades em monorepo pnpm, menos flexível para SQL fino); Knex/SQL puro (tipagem manual e boilerplate).
- **Escolha:** Drizzle ORM com migrações via drizzle-kit.
- **Por quê:** schema em TypeScript com tipos inferidos pelo compilador, sem etapa de geração de código; próximo do SQL.
- **Com mais tempo:** manteria Drizzle. O SQL fino da reserva (`FOR UPDATE` em T-15) e o `UNIQUE` da idempotência (T-16) já dependem disso. O que acrescentaria é auditoria das movimentações de crédito (hoje só o saldo) — fora do escopo do PRD §5.2.

## D4 — UI: Tailwind CSS [autor]

- **Contexto:** app mobile-first para uso em campo.
- **Alternativas:** PrimeVue (visual genérico de admin); Vuetify (pesado e opinativo).
- **Escolha:** Tailwind CSS v4.
- **Por quê:** liberdade visual total, layout livre, combina com a skill `frontend-design`.
- **Com mais tempo:** manteria Tailwind. Fecharia os testes de componente do carrinho (T-33) e um e2e do fluxo feliz (T-32); a direção visual já atende o viewport de ~390 px das tarefas F4–F7.

## D5 — Monorepo pnpm com `packages/shared` para regras de negócio [autor]

- **Contexto:** as mesmas regras precisam dar feedback imediato na UI (inclusive offline) e ser autoritativas na API.
- **Alternativas:** regras só no backend (UI sem feedback offline); duplicar no front e no back (divergência); repositórios separados.
- **Escolha:** pnpm workspaces com `apps/web`, `apps/api` e `packages/shared` (funções puras: preço, embalagem, alçada, totais, mínimo, crédito).
- **Por quê:** regras separadas e reutilizadas nos dois lados; coerente com sistemas multi-repo/microsserviços que compartilham regras, skills e docs. Custo aceito: Docker/build um pouco mais complexos.
- **Com mais tempo:** manteria o pacote compartilhado. O `exports` aponta para `dist/` (T-11b): `pnpm --filter @yandeh/shared build` é obrigatório antes de typecheck/testes da API e da web. Automatizaria esse build no `pnpm dev`/`pnpm test` para reduzir o atrito.

## D6 — Escopo: 1–6 + crédito (7) + histórico/repetir (8) + offline parcial (9) [autor]

- **Contexto:** 4–6 h de esforço; avaliação foca em decisões.
- **Alternativas:** só obrigatórios; offline completo.
- **Escolha:** obrigatórios + 7 + 8 + V1 de 9 (rascunho persistido localmente + envio com retentativa e chave de idempotência). Sync offline completo documentado como trabalho futuro.
- **Por quê:** crédito e histórico agregam valor real com pouco custo; offline completo é caro (catálogo local, conflitos), mas o cenário de sinal ruim justifica ao menos não perder o pedido nem duplicá-lo.
- **Com mais tempo:** cache do catálogo em IndexedDB (T-34), sincronização bidirecional e resolução de conflitos — já no README como fora da V1. Sem service worker, sem fila de vários pedidos e sem botão de cancelar pendente (A52, A54).

## D7 — Desconto percentual por item; alçada pelo MAIOR desconto de item [autor]

- **Contexto:** enunciado não define se desconto é por item ou por pedido, nem como medir a alçada.
- **Alternativas:** desconto no total; média ponderada dos descontos; acúmulo item + pedido.
- **Escolha:** % por item (padrão do histórico do seed); sem desconto no pedido e sem acúmulo; se algum item tiver desconto > alçada → "Aguardando aprovação".
- **Por quê:** conservador e simples; um desconto alto não se esconde num item barato (como aconteceria na média ponderada).
- **Com mais tempo:** refinaria a regra com o PO (alçada por valor em R$, teto por pedido, ou média ponderada). No teste técnico não há esse canal; a comparação permanece `>` estrito em `statusForDiscount` (`packages/shared/src/discount.ts`).

## D8 — Dinheiro em centavos inteiros, arredondamento por linha [autor]

- **Contexto:** ponto flutuante gera erros (0,1 + 0,2).
- **Alternativas:** decimal.js / numeric no banco; arredondar só no total.
- **Escolha:** inteiros em centavos; desconto arredondado (half-up) por linha; total = soma das linhas.
- **Por quê:** determinístico, fácil de testar, bate com o que se imprime por linha.
- **Com mais tempo:** se o domínio crescesse (impostos, frete, outras moedas — fora do PRD §5.2), avaliaria `numeric` no banco. O seed e o PRD §6 cabem em `Cents`; `toCents` / `lineTotals` em `packages/shared` já cobrem o exemplo C001 = 51.930.

## D9 — Quantidade em unidades com campos interligados Unidades e Lote [Decisão do autor]

- **Contexto:** `preco_unidade` é por unidade; `fator_embalagem` dá unidades por embalagem; alguns produtos só em múltiplos.
- **Alternativas:** guardar quantidade em embalagens; campo livre com validação; seletor de modo (unidade ou embalagem) por item (versão anterior, substituída).
- **Escolha:** cada item tem dois campos interligados, **Unidades** e **Lote** (CX ou FD; produtos `UN` fator 1 mostram só Unidades). Lote → `Unidades = lote × fator`; Unidades múltiplo do fator → Lote = `unidades / fator`, senão Lote vazio. Com `venda_somente_multiplo = true`, Unidades fica somente leitura e só muda pelo Lote. Banco continua guardando só unidades. Comportamento no repetir pedido: ver D13.
- **Por quê:** o vendedor pode pensar em unidades ou em lotes sem trocar de modo; os dois valores nunca divergem; a regra "só por lote" é garantida pela própria UI em vez de um erro depois do fato; histórico do seed está em unidades.
- **Com mais tempo:** testes de componente do carrinho (T-33). Num produto real, refinaria com o PO se vale persistir o modo de entrada (já considerado e recusado em D13).

## D10 — Crédito: bloqueio, reserva por pendentes, supervisor [autor]

- **Contexto:** req. 7 e fluxo de aprovação.
- **Alternativas:** apenas avisar; não reservar crédito de pendentes.
- **Escolha:** bloqueia envio se total líquido > disponível; "Aguardando aprovação" reserva crédito; rejeição libera; tela simples para S01 aprovar/rejeitar.
- **Por quê:** evita que pedidos pendentes estourem o limite quando aprovados.
- **Com mais tempo:** expiração de reserva, multi-supervisor e notificações — fora do PRD §5.2. A tela de S01 (T-24/T-25) fecha o fluxo do req. 5; a revalidação na aprovação já exclui o próprio pendente (A42).

## D11 — Cliente sem tabela usa TP01 (fallback) [autor]

- **Contexto:** C004 tem `tabela_preco_id: null`. API e UI precisam do mesmo contrato da regra pura.
- **Alternativas:** bloquear venda; perguntar ao produto; devolver só o id + flag em função separada.
- **Escolha:** `resolvePriceTableId(customer) → { tableId, isFallback }`. `isFallback` significa que o fallback foi _usado_ (C001 com TP01 explícita → `false`). Id nulo, vazio ou só espaços → `{ tableId: 'TP01', isFallback: true }`. API e UI devem usar este formato.
- **Por quê:** não impede a venda em campo; um único formato evita a API/UI divergirem. Trade-off: risco de preço errado.
- **Com mais tempo:** refinaria a regra com o PO (bloquear, usar uma tabela padrão ou exigir cadastro antes da venda). Num teste técnico não dá pra refinar com o PO como num cenário real, então a escolha fica documentada como provisória.

## D12 — Repetir pedido mantém quantidade, mas não o desconto [autor]

- **Contexto:** o requisito 8 pede "repetir pedido", e o histórico do seed traz desconto por item (ex.: PH001 P006 com 2%, PH002 P002 com 5%).
- **Alternativas:** manter o desconto histórico (revalidado pela alçada); sugerir o desconto anterior sem aplicar; zerar o desconto.
- **Escolha:** recria os itens no carrinho para revisão, com preço atual, sem inativos, com a quantidade do histórico e desconto 0%.
- **Por quê:** desconto não é sempre critério de compra e varia conforme época e negociação; repetir um desconto antigo automaticamente pode conceder algo que não foi negociado nesta visita.
- **Com mais tempo:** refinaria a regra com o PO (por exemplo, mostrar o desconto anterior como referência). Num teste técnico não dá pra refinar com o PO como num cenário real, então a escolha fica documentada como provisória.

## D13 — Histórico salva apenas unidades; ajuste de lote no repetir pedido [Decisão do autor]

- **Contexto:** o banco guarda a quantidade só em unidades; se o `fator_embalagem` mudar depois de um pedido, as unidades do histórico podem não fechar o lote atual ao repetir.
- **Alternativas:** (a) guardar só unidades e derivar o lote com o fator atual; (b) snapshot de `fator_embalagem` no item do pedido, como o preço congelado (o histórico mostraria o lote da época e detectaria mudança comparando snapshot × atual, ao custo de uma coluna a mais); (c) guardar também o modo de entrada/qtd. de lotes digitada (mais fiel, mas campo redundante com unidades).
- **Escolha:** (a). Nada muda na persistência. No repetir pedido: produto não só múltiplo → mesmas unidades, Lote vazio e mensagem; produto `venda_somente_multiplo = true` com unidades que não são múltiplas do fator atual → o sistema deduz que o fator mudou e arredonda o lote para cima (`lote = ceil(unidades_hist / fator_atual)`, `unidades = lote × fator_atual`), com a mensagem "A quantidade de unidades por lote mudou para X; a quantidade foi ajustada para N lote(s) (M unidades)". Ex.: 30 un, fator atual 12 → 3 lotes = 36 un.
- **Por quê:** mantém o modelo simples (só unidades); para itens vendáveis por unidade a quantidade original continua válida; para itens só por lote, a dedução automática evita um item travado e o vendedor revisa antes de enviar. Trade-off: arredondar para cima aumenta o valor do pedido (crédito, mínimo e alçada são recalculados normalmente).
- **Com mais tempo:** num cenário real, refinaria com o PO (arredondar para cima, para baixo ou para o mais próximo); um snapshot do fator permitiria ao histórico mostrar o lote da época.

## D14 — Recurso sem permissão responde como 404 [autor]

- **Contexto:** login é simulado (A1); a Web e a API precisam tratar URL inexistente, papel errado e recurso alheio sem ensinar quais rotas ou ids existem.
- **Alternativas:** 403 explícito em todo lugar; redirecionar para a home do papel; 404 só em URL inexistente e 403 nas demais.
- **Escolha:** na Web, rota de outro papel, URL inexistente e 403/404 da API renderizam a mesma `NotFoundPage` ("Página não encontrada") **sem mudar a URL** (`apps/web/src/router/index.ts`, `isHiddenResourceError` em `apps/web/src/api.ts`). Sem sessão, qualquer URL que não seja `/` redireciona para a seleção — também para não vazar o mapa de rotas (T-17). Na API:
  - supervisor inválido/inexistente ou header ausente em `/supervisor/*` → o **mesmo 404 genérico do Fastify** para rota desconhecida (`reply.callNotFound()`);
  - vendedor acessando `/supervisor/*` (sem `X-Supervisor-Id` válido) → o mesmo 404 de rota inexistente; não há 403 por papel;
  - pedido de outro cliente ou de outro time → 404 `Pedido não encontrado`, igual a inexistente (A33, A41);
  - cliente de outra carteira → o **mesmo 404** `{ message: 'Cliente não encontrado' }` de cliente inexistente (`findCustomerInSellerWallet`), em `GET /customers/:id/products`, `GET /customers/:id/orders`, `POST /customers/:id/orders/:orderId/repeat` e `POST /orders`;
  - `GET /sellers/:id/customers` com `X-Seller-Id` diferente do `:id` → o **mesmo 404** `{ message: 'Vendedor não encontrado' }` de vendedor inexistente. Header ausente continua **400** (igual às outras rotas do vendedor; não distingue se o `:id` existe).
- **Por quê:** não revelar quais URLs e recursos existem. Um 403 de carteira ensinaria que o id do cliente existe na carteira de outro vendedor. O replay da `Idempotency-Key` só roda depois da carteira, para um 409 não vazar que a chave existe (T-16).
- **Com mais tempo:** autenticação real (fora do PRD §5.2) substituiria o mascaramento por sessão e papéis de verdade.

## D15 — Preço zero é preço válido; seed usado como está [autor]

- **Contexto:** o seed tem imperfeições de dados reais (C004 sem tabela, EAN duplicado, inativos no histórico). Surgiu a dúvida se `preco_unidade = 0` seria ausência.
- **Alternativas:** tratar 0 como "sem preço" (`null`); recusar o item; validar o seed e corrigir inconsistências.
- **Escolha:** 0 é preço válido. `unitPriceFor` devolve `null` só quando o produto não está na tabela (`packages/shared/src/price.ts`). `isSellable` aceita 0 (A27). Sem guards extras contra seed corrompido — `apps/api/seed/seed.json` é usado como está.
- **Por quê:** o desafio pede o seed intacto; 0 não aparece como ausência no `_meta`. Inventar validação de catálogo no teste técnico misturaria regra de venda com higiene de cadastro.
- **Com mais tempo:** num produto real, o cadastro teria invariantes (preço > 0, tabela obrigatória) e um pipeline de qualidade do catálogo. Aqui o risco de dado ruim fica explícito (C004/D11, A19).

## D16 — UI sem id de produto; carteira mostra o nome da tabela [autor]

- **Contexto:** a API usa ids (`P001`, `TP01`) como chave. O vendedor em campo precisa de descrição, EAN e preço — não de código interno.
- **Alternativas:** mostrar o id ao lado da descrição; prefixar "Tabela TP01"; só o badge de fallback, sem o nome.
- **Escolha:** listas de produto (busca e carrinho) mostram **descrição, EAN e preço** (`OrderPage.vue`, `CartLine.vue`). O id fica só como chave interna (`:key`, `data-product-id`, payload). Avisos de repetir usam a descrição ("Biscoito Recheado Chocolate 140g removido (inativo)"), nunca `P022` (A36, A39). A carteira mostra o **nome** da tabela efetiva (`priceTableName`: Tabela Padrão / Volume / Interior), não o id `TP01` (PR #21). O badge "Padrão (fallback)" cobre o C004.
- **Por quê:** os nomes do seed já começam com "Tabela"; prefixar o id gerava "Tabela TP01", que não ajuda o vendedor. Ids de produto não são critério de escolha quando a descrição e o EAN distinguem P009 de P023.
- **Com mais tempo:** ids continuariam na API e nos testes. Se o suporte interno precisasse deles, um modo restrito — não a tela de campo.

## D17 — Aprovar/Rejeitar do supervisor exige confirmação inline [autor]

- **Contexto:** aprovar consome crédito; rejeitar libera a reserva. São ações definitivas (só pendente muda; repetir a mesma decisão → 409).
- **Alternativas:** um toque já chama a API; modal de confirmação; desfazer depois do fato.
- **Escolha:** confirmação inline no card, no mesmo padrão do Substituir da T-23: o toque só mostra a ação + cliente + total; Cancelar volta ao normal; Confirmar executa (`ApprovalsPage.vue`). Só um pedido em confirmação por vez (A46).
- **Por quê:** ações definitivas. Um toque acidental na lista de pendentes mudaria crédito sem o supervisor reler o total.
- **Com mais tempo:** a confirmação cobre o escopo (um supervisor, S01). Histórico de decisões, desfazer e multi-supervisor estão fora do PRD §5.2.

## D18 — Rascunho pendente de envio fica travado; idempotência por chave [autor]

- **Contexto:** req. 9 parcial (sinal ruim). A mesma `Idempotency-Key` na API faz replay 200 se for o mesmo vendedor e o mesmo cliente, **sem comparar o resto do corpo** (T-16). Um rascunho editado e reenviado com a mesma chave gravaria um pedido e devolveria outro.
- **Alternativas:** cancelar o pendente e gerar chave nova; comparar hash do body na API; permitir editar e aceitar o replay silencioso.
- **Escolha:** enquanto `submitPending`, a UI trava adicionar/remover, quantidade, desconto e Repetir/Substituir (`order-draft.ts`, `OrderPage.vue`). Sem botão de cancelar pendente (A54). A chave nasce no primeiro item persistido e só muda se o rascunho for limpo ou substituído por um Repeat. Na API: mesma chave + mesmo vendedor + mesmo cliente → 200 com o pedido original; outro vendedor ou cliente → 409 `IDEMPOTENCY_KEY_CONFLICT`, sem dados do pedido existente.
- **Por quê:** a mesma chave nunca deve levar um corpo diferente. Cancelar pendente exigiria outra chave e abriria janela de duplicata se o primeiro POST ainda estivesse em voo.
- **Com mais tempo:** botão de cancelar pendente (com chave nova só depois de desistir de verdade), fila de vários pedidos e service worker — já no README como fora da V1. Hash do payload na API foi recusado na T-16 para não vazar o pedido original no 409.

## D19 — Processo: tarefas pequenas, um commit por task, merge sem squash [autor]

- **Contexto:** o autor precisa explicar cada trecho ao vivo; o histórico é entregável do desafio.
- **Alternativas:** commits grandes por fase; squash no merge; várias tarefas no mesmo PR.
- **Escolha:** tarefas de escopo fechado em `TASKS.md` (uma por commit, Conventional Commits, trailer `IA:`). PR com testes e validação manual colada. Merge **sem squash**. Problemas encontrados numa tarefa se resolvem nela.
- **Por quê:** mudanças pequenas e explicáveis; o `git log` mostra a evolução (F1 regras → F3 API → F4 telas → F8 docs) e a linha `IA:` em cada commit.
- **Com mais tempo:** T-31 (clone limpo + roteiro R1–R9) e os opcionais T-32–T-34. O processo em si não mudaria.

## D20 — Data civil do pedido no fuso do negócio [autor]

- **Contexto:** a T-14 gravava `pedidos.data` com `toISOString().slice(0, 10)` (UTC). Clientes do seed são do Ceará; depois das 21h em Fortaleza (UTC−3) o pedido ficava com a data do dia seguinte (T-14b / PR #17).
- **Alternativas:** gravar instante UTC e formatar na leitura; fuso da máquina do servidor; fuso do browser.
- **Escolha:** `businessDate(now, timeZone)` em `@yandeh/shared` (`Intl.DateTimeFormat('en-CA')`, relógio injetável). A API lê `BUSINESS_TIMEZONE` (default `America/Fortaleza`) e grava a data civil desse fuso. Sem guard contra fuso inválido (escopo da T-14b).
- **Por quê:** a data que o vendedor e o histórico mostram é a do negócio, não a do UTC. Fortaleza não tem horário de verão; o default cobre o seed.
- **Com mais tempo:** validar o fuso na subida da API e, se o cadastro crescesse para outros estados, fuso por cliente. O front já formata `YYYY-MM-DD` fatiando a string (A38), sem `new Date`.

## D21 — Banco isolado para os testes da API [autor]

- **Contexto:** `pnpm test` usava o mesmo Postgres de desenvolvimento (`yandeh`). Depois do roteiro R1–R9 (ou qualquer uso do app), o crédito do C001 já estava consumido e a suíte falhava; um `db:seed` idempotente (`ON CONFLICT DO NOTHING`) não restaura saldo.
- **Alternativas:** schema `test` no mesmo banco; `TEMPLATE yandeh` (copiaria o estado sujo); truncate+seed no banco de dev (apagaria pedidos reais); exigir seed limpo na documentação.
- **Escolha:** `DATABASE_URL` com sufixo `_test` (default `yandeh_test`), ou `TEST_DATABASE_URL`. O `globalSetup` do Vitest cria o banco se não existir (conexão em `postgres`, fallback no banco de dev), migra e faz `TRUNCATE … CASCADE` + seed. Cada teste da API reseeda. Não usa `TEMPLATE` do banco de dev. `fileParallelism: false` e `maxWorkers: 1`.
- **Por quê:** é o caminho mais simples que deixa o banco de dev intacto, funciona no Docker do README, no fluxo local e se houver CI, e a suíte passa em qualquer ordem e repetidamente.
- **Com mais tempo:** um Postgres só de CI no workflow; containers de teste efêmeros. Para o desafio, um segundo banco no mesmo Postgres basta.
