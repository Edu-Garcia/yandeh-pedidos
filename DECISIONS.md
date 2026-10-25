# Decisões

Formato: contexto · alternativas consideradas · escolha · por quê · o que faria diferente com mais tempo.
Decisões marcadas **[autor]** foram tomadas pelo candidato (com os motivos dele); a IA apresentou opções e trade-offs.

---

## D1 — Stack: Vue 3 + Node.js/TypeScript + PostgreSQL [autor]

- **Contexto:** o desafio recomenda a stack do time.
- **Alternativas:** outra stack (exigiria justificativa).
- **Escolha:** Vue 3, Node.js + TypeScript, PostgreSQL.
- **Por quê:** é a stack recomendada e usada pelo time; reduz atrito na avaliação e na conversa.
- **Com mais tempo:** _a preencher._

## D2 — Backend: Fastify [autor]

- **Contexto:** API pequena de escopo fechado, num teste técnico com prazo curto.
- **Alternativas:** Express (tipagem fraca, erros assíncronos tratados manualmente); NestJS (boilerplate e "mágica" de DI/decorators difícil de explicar ao vivo).
- **Escolha:** Fastify + Zod.
- **Por quê:** rápido e flexível; validação por schema e boa tipagem (Zod/TypeBox) facilitam testes (`app.inject`) e estrutura. Express/NestJS são mais pesados/complexos sem necessidade para o escopo.
- **Com mais tempo:** _a preencher._

## D3 — Acesso a dados: Drizzle ORM + drizzle-kit [autor]

- **Contexto:** precisa de tipagem forte, migrações e SQL fino (ex.: `SELECT ... FOR UPDATE` na reserva de crédito).
- **Alternativas:** Prisma (exige `prisma generate`, imagem Docker mais pesada, problemas de engine/OpenSSL no Alpine, particularidades em monorepo pnpm, menos flexível para SQL fino); Knex/SQL puro (tipagem manual e boilerplate).
- **Escolha:** Drizzle ORM com migrações via drizzle-kit.
- **Por quê:** schema em TypeScript com tipos inferidos pelo compilador, sem etapa de geração de código; próximo do SQL.
- **Com mais tempo:** _a preencher._

## D4 — UI: Tailwind CSS [autor]

- **Contexto:** app mobile-first para uso em campo.
- **Alternativas:** PrimeVue (visual genérico de admin); Vuetify (pesado e opinativo).
- **Escolha:** Tailwind CSS v4.
- **Por quê:** liberdade visual total, layout livre, combina com a skill `frontend-design`.
- **Com mais tempo:** _a preencher._

## D5 — Monorepo pnpm com `packages/shared` para regras de negócio [autor]

- **Contexto:** as mesmas regras precisam dar feedback imediato na UI (inclusive offline) e ser autoritativas na API.
- **Alternativas:** regras só no backend (UI sem feedback offline); duplicar no front e no back (divergência); repositórios separados.
- **Escolha:** pnpm workspaces com `apps/web`, `apps/api` e `packages/shared` (funções puras: preço, embalagem, alçada, totais, mínimo, crédito).
- **Por quê:** regras separadas e reutilizadas nos dois lados; coerente com sistemas multi-repo/microsserviços que compartilham regras, skills e docs. Custo aceito: Docker/build um pouco mais complexos.
- **Com mais tempo:** _a preencher._

## D6 — Escopo: 1–6 + crédito (7) + histórico/repetir (8) + offline parcial (9) [autor]

- **Contexto:** 4–6 h de esforço; avaliação foca em decisões.
- **Alternativas:** só obrigatórios; offline completo.
- **Escolha:** obrigatórios + 7 + 8 + V1 de 9 (rascunho persistido localmente + envio com retentativa e chave de idempotência). Sync offline completo documentado como trabalho futuro.
- **Por quê:** crédito e histórico agregam valor real com pouco custo; offline completo é caro (catálogo local, conflitos), mas o cenário de sinal ruim justifica ao menos não perder o pedido nem duplicá-lo.
- **Com mais tempo:** _a preencher._

## D7 — Desconto percentual por item; alçada pelo MAIOR desconto de item [autor]

- **Contexto:** enunciado não define se desconto é por item ou por pedido, nem como medir a alçada.
- **Alternativas:** desconto no total; média ponderada dos descontos; acúmulo item + pedido.
- **Escolha:** % por item (padrão do histórico do seed); sem desconto no pedido e sem acúmulo; se algum item tiver desconto > alçada → "Aguardando aprovação".
- **Por quê:** conservador e simples; um desconto alto não se esconde num item barato (como aconteceria na média ponderada).
- **Com mais tempo:** _a preencher._

## D8 — Dinheiro em centavos inteiros, arredondamento por linha [autor]

- **Contexto:** ponto flutuante gera erros (0,1 + 0,2).
- **Alternativas:** decimal.js / numeric no banco; arredondar só no total.
- **Escolha:** inteiros em centavos; desconto arredondado (half-up) por linha; total = soma das linhas.
- **Por quê:** determinístico, fácil de testar, bate com o que se imprime por linha.
- **Com mais tempo:** _a preencher._

## D9 — Quantidade em unidades com campos interligados Unidades e Lote [Decisão do autor]

- **Contexto:** `preco_unidade` é por unidade; `fator_embalagem` dá unidades por embalagem; alguns produtos só em múltiplos.
- **Alternativas:** guardar quantidade em embalagens; campo livre com validação; seletor de modo (unidade ou embalagem) por item (versão anterior, substituída).
- **Escolha:** cada item tem dois campos interligados, **Unidades** e **Lote** (CX ou FD; produtos `UN` fator 1 mostram só Unidades). Lote → `Unidades = lote × fator`; Unidades múltiplo do fator → Lote = `unidades / fator`, senão Lote vazio. Com `venda_somente_multiplo = true`, Unidades fica somente leitura e só muda pelo Lote. Banco continua guardando só unidades. Comportamento no repetir pedido: ver D13.
- **Por quê:** o vendedor pode pensar em unidades ou em lotes sem trocar de modo; os dois valores nunca divergem; a regra "só por lote" é garantida pela própria UI em vez de um erro depois do fato; histórico do seed está em unidades.
- **Com mais tempo:** _a preencher._

## D10 — Crédito: bloqueio, reserva por pendentes, supervisor [autor]

- **Contexto:** req. 7 e fluxo de aprovação.
- **Alternativas:** apenas avisar; não reservar crédito de pendentes.
- **Escolha:** bloqueia envio se total líquido > disponível; "Aguardando aprovação" reserva crédito; rejeição libera; tela simples para S01 aprovar/rejeitar.
- **Por quê:** evita que pedidos pendentes estourem o limite quando aprovados.
- **Com mais tempo:** _a preencher._

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
