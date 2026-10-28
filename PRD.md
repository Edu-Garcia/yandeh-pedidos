# PRD — Módulo de Montagem de Pedidos (Força de Vendas)

> Desafio Técnico Fullstack Pleno — Yandeh.
> Status: **rascunho v1** (gerado com apoio de IA a partir do enunciado e do `seed.json`, revisado pelo autor).

> Legenda: **[Decisão do autor]** = definida pelo candidato nas rodadas de perguntas; **[Assunção]** = interpretação documentada em `ASSUMPTIONS.md`; **[Enunciado]** = texto do desafio.

## Sumário

1. Contexto · 2. Objetivo · 3. Personas · 4. Glossário · 5. Escopo · 6. Regras de negócio · 7. Fluxos e telas · 8. API · 9. Modelo de dados · 10. Requisitos não funcionais · 11. Critérios de aceite · 12. Riscos e perguntas em aberto · 13. Plano de entrega

---

## 1. Contexto

Vendedores externos visitam pequenos varejistas (mercadinhos, minimercados, conveniências), consultam o catálogo e fecham o pedido no local, **muitas vezes com internet ruim** [Enunciado]. Os dados de referência vêm de `seed.json` (vendedores, supervisor, clientes, produtos, tabelas de preço e histórico), que deve ser usado **como está**, com imperfeições de dados reais.

## 2. Objetivo

Permitir que o vendedor monte e envie um pedido correto (preço da tabela do cliente, embalagem, desconto dentro da alçada, pedido mínimo e crédito) de forma rápida no celular, com regras validadas tanto na interface (feedback imediato) quanto na API (fonte da verdade).

**Métricas de sucesso (para a avaliação):** regras de negócio cobertas por testes; `docker compose up` sobe tudo; decisões justificadas.

## 3. Personas

| Persona                                                                        | Necessidade                                                                    | Dor                                                         |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| **Vendedor externo** (V01 Carlos — alçada 5%, V02 Renata — 7%, V03 Paulo — 3%) | Montar pedido rápido no cliente, ver preço certo, saber na hora se pode enviar | Sinal ruim, catálogo grande, regras de embalagem e desconto |
| **Supervisor** (S01 Marta Fernandes)                                           | Aprovar ou rejeitar pedidos com desconto acima da alçada                       | Pedidos parados aguardando decisão                          |

## 4. Glossário de domínio

| Termo                  | Definição                                                                                               | No seed                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Carteira               | Conjunto fixo de clientes de um vendedor                                                                | `clientes[].vendedor_id`                                  |
| Tabela de preço        | Lista de preço por produto; cada cliente aponta para uma                                                | `tabelas_preco` (TP01 Padrão, TP02 Volume, TP03 Interior) |
| Preço unitário         | Preço de **uma unidade** (não da embalagem)                                                             | `preco_unidade`                                           |
| Unidade de venda       | Rótulo da embalagem: `UN`, `CX` (caixa) ou `FD` (fardo)                                                 | `unidade_venda`                                           |
| Fator de embalagem     | Unidades por embalagem                                                                                  | `fator_embalagem`                                         |
| Venda somente múltiplo | Quantidade (em unidades) deve ser múltipla do fator                                                     | `venda_somente_multiplo`                                  |
| Alçada de desconto     | % máximo de desconto que o vendedor concede sem aprovação                                               | `alcada_desconto_percentual`                              |
| Pedido mínimo          | R$ 300,00 sobre o valor líquido                                                                         | [Enunciado] + [Decisão do autor]                          |
| Crédito disponível     | `limite_credito − credito_utilizado − reservado`                                                        | `limite_credito`, `credito_utilizado`                     |
| Reservado              | Soma dos pedidos "Aguardando aprovação" do cliente                                                      | [Decisão do autor]                                        |
| Status                 | `Enviado`, `Aguardando aprovação`, `Aprovado`, `Rejeitado` (novos); `Faturado`, `Cancelado` (histórico) | `pedidos_historico[].status`                              |

## 5. Escopo

### 5.1 Dentro do escopo

| #   | Requisito [Enunciado]                                             | Classificação                                | Entrega                                |
| --- | ----------------------------------------------------------------- | -------------------------------------------- | -------------------------------------- |
| 1   | Vendedor vê só sua carteira (login simulado)                      | Obrigatório                                  | ✅                                     |
| 2   | Buscar produto por nome ou EAN com preço da tabela do cliente     | Obrigatório                                  | ✅                                     |
| 3   | Montar pedido: adicionar/remover, quantidade, desconto, embalagem | Obrigatório                                  | ✅                                     |
| 4   | Totais e bloqueio de envio quando regras não atendidas            | Obrigatório                                  | ✅                                     |
| 5   | Enviar: dentro da alçada "Enviado", fora "Aguardando aprovação"   | Obrigatório                                  | ✅                                     |
| 6   | Testes automatizados das regras                                   | Obrigatório                                  | ✅                                     |
| 7   | Respeitar limite de crédito                                       | Desejável                                    | ✅ [Decisão do autor]                  |
| 8   | Histórico + "repetir pedido"                                      | Desejável                                    | ✅ [Decisão do autor]                  |
| 9   | Pedido sem conexão + sincronização                                | Opcional                                     | ⚠️ **Parcial (V1)** [Decisão do autor] |
| —   | Tela simples do supervisor para aprovar/rejeitar                  | Extra necessário p/ fechar o fluxo do req. 5 | ✅ [Decisão do autor]                  |

**Req. 9 — V1 parcial:** o rascunho do pedido é persistido em **localStorage** (`yandeh.orderDraft`) e sobrevive a recarregar/perder sinal; o envio usa **retentativa com chave de idempotência** (`Idempotency-Key`), então reenviar nunca duplica pedido. Enquanto o envio está pendente, o rascunho fica travado para edição (a mesma chave não leva corpo diferente). IndexedDB, catálogo/preços offline completos e sincronização bidirecional ficam como trabalho futuro (T-34 / tempo/complexidade).

### 5.2 Fora do escopo

Autenticação real; cadastro/edição de clientes, produtos e tabelas; faturamento; desconto no total do pedido; desconto cumulativo; impostos/frete; sincronização offline completa (catálogo offline, resolução de conflitos); notificações; multi-supervisor.

## 6. Regras de negócio

Todas implementadas como **funções puras** em `packages/shared` (usadas pelo front e pela API), com **dinheiro em centavos inteiros**. Conversão do seed: `centavos = round(reais × 100)`.

### RN01 — Carteira [Enunciado]

Vendedor `V` só lista/usa clientes com `cliente.vendedor_id = V`. A API rejeita (403/404) pedido para cliente de outra carteira.
_Exemplo:_ V01 vê C001–C004; V02 vê C005–C007; V03 vê C008–C010.

### RN02 — Tabela de preço efetiva [Decisão do autor]

Tabela vazia ou nula → TP01. `tabela = trim(cliente.tabela_preco_id)` se houver texto; id nulo, `''` ou só espaços usa `'TP01'` com fallback. Quando o fallback é usado, a UI exibe aviso claro ("Cliente sem tabela — usando Tabela Padrão").
_Exemplo:_ C004 (Mercearia Dona Lúcia) não tem tabela → TP01. Trade-off aceito: risco de preço errado.

> **Nota:** Num cenário real, refinaria essa regra com o PO; no teste técnico não há esse canal, então fica registrada aqui e em `DECISIONS.md` (D11, "Com mais tempo").

### RN03 — Produto vendável

Vendável ⇔ `ativo = true` **e** existe preço na tabela efetiva do cliente. Inativos não aparecem na busca. Preço **0 é válido** (não é ausência); `unitPriceFor` só devolve `null` quando o produto não está na tabela. Sem guards extras contra seed corrompido — o `seed.json` é usado como está [Decisão do autor].
_Exemplo:_ P021 e P022 são inativos; TP03 não tem P021 (inativo de qualquer forma).

### RN04 — Busca [Enunciado + Decisão do autor]

Por trecho da descrição (case/acento-insensível — [Assunção]) ou EAN exato. EAN duplicado: **mostrar todos** e o vendedor escolhe.
_Exemplo:_ EAN `7891831978575` → P009 "Achocolatado em Pó 400g" e P023 "Achocolatado em Pó 400g Sachê".

### RN05 — Quantidade e embalagem [Decisão do autor]

- Quantidade é **sempre armazenada em unidades**.
- Na UI, cada item tem **dois campos interligados** [Decisão do autor]: **Unidades** e **Lote** (rótulo conforme a embalagem do produto: caixa `CX` ou fardo `FD`). Produtos `UN` com fator 1 mostram só **Unidades**.
- Digitar o **Lote** atualiza automaticamente `Unidades = lote × fator_embalagem`.
- Digitar **Unidades**: se for múltiplo do fator, o Lote mostra `unidades / fator`; se não for, o Lote fica **vazio** e vale só Unidades.
- Se `venda_somente_multiplo = true`: o campo Unidades fica **somente leitura** (aparência desabilitada) e só muda pelo Lote; `unidades % fator_embalagem = 0`.
- Se `false` (ex.: CX com venda unitária): os dois campos são editáveis.
- Quantidade inteira ≥ 1.
- Motivo (autor): o vendedor pode pensar em unidades ou em lotes sem trocar de modo; os dois valores nunca divergem; e a regra "só por lote" é garantida pela própria UI, em vez de um erro depois do fato.

_Exemplos:_ P006 Macarrão (FD 20, só múltiplo): Lote 2 fardos → Unidades 40 ✅; Unidades somente leitura (30 un não é digitável). P004 Óleo (CX 20, não só múltiplo): 7 un → Lote vazio ✅; 20 un → Lote 1 CX ✅. P010 Leite (CX 12, só múltiplo): Lote 2 CX → 24 un ✅; Unidades somente leitura.

### RN06 — Desconto [Decisão do autor]

Percentual **por item**, `0 ≤ d ≤ 100` (padrão do histórico do seed). Sem desconto no total, sem acúmulo.

### RN07 — Totais e arredondamento [Decisão do autor]

Por linha, em centavos:

```
bruto_linha    = unidades × preco_unidade_centavos
desconto_linha = round(bruto_linha × d / 100)        // arredondamento half-up por linha
liquido_linha  = bruto_linha − desconto_linha
total_bruto    = Σ bruto_linha ; total_desconto = Σ desconto_linha ; total_liquido = Σ liquido_linha
```

_Exemplo (histórico PH001, P006):_ 40 × 329 = 13.160; 2% → 263,2 → **263**; líquido **12.897** (R$ 128,97).

### RN08 — Pedido mínimo [Enunciado + Decisão do autor]

Envio bloqueado se `total_liquido < 30.000` (R$ 300,00) — avaliado **após descontos**.

### RN09 — Crédito [Req. 7 + Decisão do autor]

```
reservado  = Σ total_liquido dos pedidos do cliente em "Aguardando aprovação"
disponivel = limite_credito − credito_utilizado − reservado
bloqueia se total_liquido > disponivel
```

Na API, a verificação + inserção ocorre em transação com `SELECT ... FOR UPDATE` no cliente (evita dois envios simultâneos estourarem o limite).
_Exemplos:_ C001: 5.000 − 1.200 = **R$ 3.800**. C002: 12.000 − 11.650 = **R$ 350** → pedido de R$ 400 bloqueado. C006: **R$ 100** → nenhum pedido ≥ mínimo cabe (sempre bloqueado). C010: **R$ 0**.
**[Decisão do autor]** O `credito_utilizado` do seed **já inclui** os pedidos do histórico; eles não são somados de novo. Só os pedidos **novos** criados no sistema alteram o crédito: "Aguardando aprovação" reserva, "Enviado"/"Aprovado" soma o `total_liquido` ao `credito_utilizado`, "Rejeitado" libera a reserva.

### RN10 — Alçada e status [Enunciado + Decisão do autor]

`maior_desconto = max(d dos itens)`. Se `maior_desconto > alcada_vendedor` → **"Aguardando aprovação"** (reserva crédito); senão → **"Enviado"**. Conservador e simples: um desconto alto não "se esconde" num item barato.
_Exemplo:_ V01 (5%) com itens a 0%, 2% e 6% → Aguardando aprovação. V02 (7%) com 7% → Enviado (`>` estrito, não `≥`).

### RN11 — Aprovação do supervisor [Decisão do autor]

S01 vê pedidos "Aguardando aprovação" de seus vendedores; **Aprovar** → "Aprovado" (reserva vira crédito utilizado); **Rejeitar** → "Rejeitado" (libera a reserva). Na aprovação, o crédito é revalidado.

### RN12 — Repetir pedido [Req. 8 + Decisão do autor]

Reconstrói os itens no carrinho para **revisão** (nunca envia direto). Ignora produtos inativos/sem preço e **informa** o vendedor. Usa o **preço atual** da tabela do cliente (não o histórico). Mantém a **quantidade** do histórico (sujeita às regras de múltiplo/embalagem), mas **não mantém o desconto**: todos os itens voltam com desconto 0%, e o vendedor negocia de novo se quiser [Decisão do autor]. Motivo: desconto não é sempre critério de compra e varia conforme época e negociação. Histórico mostra pedidos cancelados com o status, e repetir é permitido.

**Lote no repetir pedido [Decisão do autor]:** o banco guarda só unidades, então o repetir compara as unidades do histórico com o fator de embalagem **atual**:

- Produto **não** `venda_somente_multiplo` e unidades que não fecham lote: vem com as **mesmas unidades** e o **Lote vazio**, com uma mensagem informando.
- Produto `venda_somente_multiplo = true` e unidades do histórico que não são múltiplas do fator atual: o sistema deduz que o fator mudou e **arredonda o lote para cima**: `lote = ceil(unidades_hist / fator_atual)`, `unidades = lote × fator_atual`, com a mensagem "A quantidade de unidades por lote mudou para X; a quantidade foi ajustada para N lote(s) (M unidades)". Ex.: histórico 30 un, fator atual 12 → 3 lotes = 36 un.
- Trade-off: arredondar para cima aumenta o valor do pedido (crédito, mínimo e alçada são recalculados normalmente), mas o vendedor revisa o carrinho antes de enviar. Num cenário real, refinaria com o PO (arredondar para cima, para baixo ou para o mais próximo).
- As quantidades do histórico do seed fecham todos os seus lotes; é uma salvaguarda para mudanças no catálogo.

> **Nota:** Num cenário real, refinaria essa regra com o PO; no teste técnico não há esse canal, então fica registrada aqui e em `DECISIONS.md` (D12, "Com mais tempo").

_Exemplo:_ repetir PH001 (C001) → P022 é removido com aviso; P001 vem a R$ 26,90 (TP01 atual), não R$ 25,90; P006 volta com 0% de desconto (era 2%).

### RN13 — Idempotência de envio [Req. 9 parcial]

O front gera um UUID por rascunho e envia em `Idempotency-Key`. A API grava a chave (única); reenvio com a mesma chave, o mesmo vendedor e o mesmo cliente retorna o pedido já criado (200) em vez de duplicar — **sem comparar o resto do corpo**. Mesma chave com outro vendedor ou cliente → 409 `IDEMPOTENCY_KEY_CONFLICT`. Por isso, rascunho **pendente de envio fica travado** para edição; não há cancelar pendente [Decisão do autor].

### Exemplo completo (C001 / V01 / TP01)

| Item                 | Qtd (un) | Preço | Bruto      | Desc.     | Líquido    |
| -------------------- | -------- | ----- | ---------- | --------- | ---------- |
| P001 Arroz 5kg       | 10       | 26,90 | 269,00     | 0% → 0,00 | 269,00     |
| P006 Macarrão (2 FD) | 40       | 3,33  | 133,20     | 2% → 2,66 | 130,54     |
| P010 Leite (2 CX)    | 24       | 4,99  | 119,76     | 0% → 0,00 | 119,76     |
| **Total**            |          |       | **521,96** | **2,66**  | **519,30** |

≥ R$ 300 ✅; crédito R$ 3.800 ✅; maior desconto 2% ≤ 5% → **Enviado**. Se o arroz tivesse 6% (16,14), líquido R$ 503,16 → **Aguardando aprovação**.

## 7. Fluxos e telas (mobile-first)

1. **Quem é você?** — escolher V01/V02/V03 ou Supervisor S01 (login simulado). Sem sessão, qualquer URL (existente ou não) redireciona para `/`. Com sessão, rota de outro papel ou URL inexistente mostra o mesmo 404 ("Página não encontrada") **sem mudar a URL** [Decisão do autor].
2. **Minha carteira** — clientes do vendedor com cidade/UF, **nome da tabela** efetiva (não o id `TP01`; badge "Padrão (fallback)" no C004) e crédito disponível (destaque quando insuficiente para o mínimo, ex.: C006, C010).
3. **Pedido do cliente** — busca (nome/EAN; scanner fica fora), resultados com **descrição, EAN e preço** (a UI nunca mostra o id do produto); carrinho com campos interligados Unidades e Lote (CX/FD; Unidades somente leitura quando só por lote), desconto %; painel fixo de totais; lista de bloqueios (mínimo, crédito, quantidade inválida) e aviso "precisará de aprovação"; botão **Enviar** desabilitado quando há bloqueio; indicador de rascunho salvo/offline; rascunho pendente de envio **travado** para edição.
4. **Histórico do cliente** — últimos pedidos (data, status, total) e "Repetir pedido". Avisos de item removido usam a **descrição**, nunca o id do produto.
5. **Aprovações (supervisor)** — lista de pendentes com vendedor, cliente, maior desconto vs alçada, total; **Aprovar/Rejeitar com confirmação inline** (ações definitivas) [Decisão do autor].

## 8. API (esboço)

| Método | Rota                                                | Descrição                                        |
| ------ | --------------------------------------------------- | ------------------------------------------------ |
| GET    | `/health`                                           | Saúde                                            |
| GET    | `/sellers`                                          | Vendedores (login simulado)                      |
| GET    | `/supervisors`                                      | Supervisores (login simulado)                    |
| GET    | `/sellers/:id/customers`                            | Carteira com crédito disponível e tabela efetiva |
| GET    | `/customers/:id/products?q=`                        | Busca por nome/EAN com preço da tabela efetiva   |
| GET    | `/customers/:id/orders`                             | Histórico                                        |
| POST   | `/customers/:id/orders/:orderId/repeat`             | Monta itens para revisão (não cria pedido)       |
| POST   | `/orders` (header `Idempotency-Key`, `X-Seller-Id`) | Valida no servidor e cria pedido                 |
| GET    | `/supervisor/orders?status=Aguardando aprovação`    | Pendentes                                        |
| POST   | `/supervisor/orders/:id/approve` · `/reject`        | Decisão                                          |

Identidade simulada por header: `X-Seller-Id` nas rotas do vendedor e `X-Supervisor-Id` nas rotas `/supervisor/*` **[Decisão do autor]**. Header inválido ou supervisor inexistente em `/supervisor/*` → o **mesmo 404 genérico do Fastify** para rota desconhecida (não revela que a rota existe) [Decisão do autor].

`pedidos.data` é a data civil no fuso do negócio (`BUSINESS_TIMEZONE`, default `America/Fortaleza`), não a fatia UTC de `toISOString()` [Decisão do autor].

Erros de regra: `422` com lista de `ValidationIssue` (mesmos códigos do `@yandeh/shared`) **[Decisão do autor]**:

| Código                 | Quando                                                       |
| ---------------------- | ------------------------------------------------------------ |
| `EMPTY_ORDER`          | Pedido sem itens                                             |
| `INVALID_QUANTITY`     | Quantidade não inteira, < 1 ou fora do múltiplo da embalagem |
| `INVALID_DISCOUNT`     | Desconto fora de 0–100%                                      |
| `PRODUCT_NOT_SELLABLE` | Produto inativo ou sem preço na tabela efetiva               |
| `BELOW_MINIMUM`        | Total líquido abaixo de R$ 300,00                            |
| `INSUFFICIENT_CREDIT`  | Total líquido acima do crédito disponível                    |

A alçada **não** é erro: acima dela o pedido vai para "Aguardando aprovação".

## 9. Modelo de dados (esboço — Drizzle/PostgreSQL)

`supervisores`, `vendedores`, `tabelas_preco`, `tabelas_preco_itens (tabela, produto, preco_unidade_centavos)`, `clientes (… limite_credito_centavos, credito_utilizado_centavos, tabela_preco_id NULL)`, `produtos (ean NÃO único)`, `pedidos (status, data civil no fuso do negócio, idempotency_key UNIQUE)`, `pedidos_itens (quantidade em unidades, preco_unidade_centavos congelado, desconto_percentual)`. Histórico do seed entra em `pedidos`. Ver `apps/api/src/db/schema.ts`.

## 10. Requisitos não funcionais

- `docker compose up` sobe Postgres, API (migração + seed idempotentes) e Web.
- Testes de regra (Vitest) em `packages/shared` e testes de rota na API.
- Conectividade ruim: rascunho local, retentativa, idempotência; payloads pequenos.
- Mobile-first, alvos de toque grandes, valores em BRL (`Intl.NumberFormat('pt-BR')`).
- Regras validadas duas vezes: UI (feedback) e API (autoridade).

## 11. Critérios de aceite

- **R1:** dado V01 logado, a carteira mostra exatamente C001–C004; pedido para C005 via API retorna erro.
- **R2:** buscar "achocolatado" ou `7891831978575` retorna P009 e P023 com preços da tabela do cliente; P021/P022 nunca aparecem; C004 mostra preços TP01 com aviso.
- **R3:** P006: Lote 2 FD → 40 un, Unidades somente leitura; P004: 7 un → Lote vazio, 20 un → 1 CX; remover item atualiza totais; desconto 0–100.
- **R4:** totais conforme RN07; enviar bloqueado com líquido < R$ 300 ou acima do crédito, com mensagem do motivo.
- **R5:** maior desconto ≤ alçada → "Enviado"; > alçada → "Aguardando aprovação"; supervisor aprova/rejeita.
- **R6:** testes cobrem RN02, RN05, RN07–RN10, RN12, RN13 com números do seed.
- **R7:** C002 com pedido de R$ 400 bloqueado; pendente reserva crédito; rejeição libera.
- **R8:** repetir PH001 remove P022 com aviso, usa preço atual e zera os descontos (o item P006, que tinha 2%, volta com 0%); nada é enviado automaticamente.
- **R9 (parcial):** recarregar a página mantém o rascunho; reenviar com a mesma chave não duplica.

## 12. Riscos e perguntas em aberto

- Fallback TP01 para C004 pode cobrar preço errado (alternativa: bloquear venda). Refinaria com o PO num cenário real.
- Repetir pedido zera descontos; a regra ideal (manter, sugerir ou zerar) seria refinada com o PO num cenário real.
- Preços do histórico diferem das tabelas atuais (repetir usa o atual).
- C006 e C010 nunca conseguem enviar (crédito < mínimo) — esperado?
- Cancelados no histórico: exibidos com status, repetir permitido.
- Offline completo (catálogo e preço desatualizados, conflitos) adiado.
- **Decidido [Decisão do autor]:** o histórico guarda só unidades (sem snapshot de `fator_embalagem` nem modo de entrada); o lote é derivado com o fator atual. Se o fator mudou, o repetir ajusta conforme RN12 (ver `DECISIONS.md` D13). Num cenário real, refinaria com o PO.

## 13. Plano de entrega

A divisão em tarefas pequenas (uma por commit), com dependências, critérios de aceite e ordem de corte de escopo, está em [`TASKS.md`](TASKS.md). Não há estimativas de tempo: com IA acelerando a implementação, elas não refletem dados reais.
