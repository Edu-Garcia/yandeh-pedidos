# AI_LOG — Uso de IA

> Ferramentas: Cursor (agente) e assistente de IA para leitura do desafio e planejamento.
> **Preencher com honestidade.** Itens marcados _[RASCUNHO — revisar]_ foram pré-preenchidos pela IA e devem ser confirmados/ajustados pelo autor.
> Log bruto de prompts: privado em `.ai-private/PROMPTS.md` (não versionado; avaliar se/quais partes anexar).

---

## Momento 1 — Leitura do desafio, levantamento de ambiguidades e PRD _[RASCUNHO — revisar]_

- **O que pedi:** que a IA lesse o PDF do desafio e o `seed.json`, criasse um `PRD.md` e me fizesse perguntas de definição (com trade-offs de cada opção e sempre uma opção livre).
- **O que a IA respondeu:** listou imperfeições do seed (C004 sem tabela, EAN duplicado P009/P023, inativos P021/P022 no histórico, preços históricos diferentes dos atuais, clientes sem crédito), fez duas rodadas de perguntas (backend, UI, monorepo, escopo, desconto/alçada, banco/ORM, fallback de tabela, EAN, embalagem, crédito, mínimo, aprovação, arredondamento) e explicou a diferença de geração de código do Prisma vs Drizzle.
- **O que aceitei / alterei / descartei:** _(preencher — ex.: escolhi Fastify em vez de ... porque ...)_
- **Por quê:** _(preencher)_

## Momento 2 — _(título)_

- **O que pedi:**
- **O que a IA respondeu:**
- **O que aceitei / alterei / descartei:**
- **Por quê:**

## Momento 3 — _(caso em que a IA errou ou sugeriu algo inadequado)_

- **O que pedi:**
- **O que a IA respondeu (o erro):**
- **Como percebi / verifiquei:**
- **O que fiz:**

## Momento 4 — _(opcional)_

- **O que pedi:**
- **O que a IA respondeu:**
- **O que aceitei / alterei / descartei:**
- **Por quê:**

## Momento 5 — _(opcional)_

- **O que pedi:**
- **O que a IA respondeu:**
- **O que aceitei / alterei / descartei:**
- **Por quê:**

---

## Mapa de autoria

Legenda: **Eu escrevi** · **IA gerou, eu revisei/alterei** · **IA gerou, aceitei como veio**

| Parte                                      | Autoria       | Observações                                                 |
| ------------------------------------------ | ------------- | ----------------------------------------------------------- |
| Modelagem (schema, entidades)              | _(preencher)_ |                                                             |
| Regras de negócio (`packages/shared`)      | _(preencher)_ |                                                             |
| API (rotas, validação, transações)         | _(preencher)_ |                                                             |
| Telas (Vue)                                | _(preencher)_ |                                                             |
| Testes                                     | _(preencher)_ |                                                             |
| Documentação (PRD, DECISIONS, ASSUMPTIONS) | _(preencher)_ | Rascunho inicial gerado por IA a partir das minhas decisões |
| Scaffold / Docker / configuração           | _(preencher)_ | Gerado por IA (agente) a partir das minhas decisões         |
