# AGENTS.md — Instruções para agentes de IA (Cursor)

## Projeto

Desafio técnico Yandeh (Fullstack Pleno): módulo de montagem de pedidos para vendedores externos. Fonte da verdade do produto: `PRD.md`. Decisões: `DECISIONS.md`. Assunções: `ASSUMPTIONS.md`.

## Estrutura

- `apps/web` — Vue 3 + Vite + TS + Tailwind v4 + Vue Router + Pinia (mobile-first).
- `apps/api` — Fastify + Zod + Drizzle ORM (PostgreSQL). Schema em `src/db/schema.ts`, migrações em `drizzle/`, seed em `seed/seed.json` (**não editar o seed**).
- `packages/shared` — **regras de negócio puras** (preço, embalagem, alçada, totais, mínimo, crédito). Usadas pelo front (feedback) e pela API (autoridade). Nunca duplicar regra fora daqui.

## Comandos

```bash
pnpm install
pnpm test | pnpm typecheck | pnpm lint | pnpm format
pnpm --filter @yandeh/api db:generate   # nova migração após mudar schema
pnpm --filter @yandeh/api db:setup      # migra + seed (idempotente)
docker compose up --build               # sobe tudo
```

## Convenções

- Dinheiro em **centavos inteiros**; quantidades em **unidades**; arredondamento por linha (ver PRD §6).
- Código/identificadores em inglês; documentação e mensagens de UI em **pt-BR**.
- Regras novas: escrever o teste primeiro em `packages/shared` usando números reais do seed.
- API valida entrada com Zod e revalida regras com `@yandeh/shared`; erros de regra → 422 com `ValidationIssue[]`.
- Mudanças pequenas e explicáveis: o autor precisa explicar cada trecho ao vivo.

## Fluxo de trabalho (`TASKS.md`)

1. Pegar a próxima tarefa `[ ]` de `TASKS.md` com dependências concluídas e marcá-la `[~]`.
2. Grill (`grill-with-docs`): confrontar com PRD/ASSUMPTIONS/DECISIONS; resolver ou registrar ambiguidades.
3. Implementar (teste primeiro para regras em `packages/shared`).
4. Validar com os comandos da seção _Validação_ da tarefa e com a _Validação manual_ (artefato real).
5. Atualizar docs tocados e o status/progresso em `TASKS.md`.
6. Propor a mensagem de commit ao autor; **nunca** commitar sem aprovação.
7. Antes de abrir o PR, colar na descrição os comandos/saídas (ou screenshots) da validação manual como evidência.

## Commits (obrigatório)

- Formato [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/): `<tipo>(<escopo opcional>): <descrição>` com tipos `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `build`, `ci`, `style`, `perf`; descrição em pt-BR, no imperativo.
- Sem squash. Mensagem termina com **uma** linha: `IA: nenhuma` | `IA: parcial` | `IA: majoritária` (template `.gitmessage`).
- O agente **não** faz commit sem pedido explícito.

## Documentação viva

- Ao tomar/alterar decisão → atualizar `DECISIONS.md`; ambiguidade nova → `ASSUMPTIONS.md`; escopo/fora → `README.md` e `PRD.md`.
- Registrar cada prompt relevante do usuário (verbatim) e um resumo da resposta em `.ai-private/PROMPTS.md` (gitignored). Momentos significativos vão para `AI_LOG.md` (o autor revisa).

## Skills (`.cursor/skills/`)

- `frontend-design` (Anthropic) — ao criar telas.
- `grill-with-docs` (+ `grilling`, `domain-modeling`, Matt Pocock) — para interrogar o plano e atualizar docs/glossário.
