@AGENTS.md

# Contexto do projeto (para o Claude)

Este é um app white-label de acompanhamento para personal trainer, com **dois
lados**: app do aluno (mobile-first) e painel do treinador. Stack: Next.js 16
(App Router) + React 19 + TypeScript + Tailwind 4 + Supabase.

O dono deste código provavelmente **não programa** — ele edita pedindo a você,
em português. Seja didático, faça mudanças pequenas e seguras, e sempre que
possível confirme o que vai mudar antes de mexer em muitos arquivos.

## Onde fica cada coisa
- **Identidade visual (nome, cores, logo, contatos):** `src/config/brand.ts`.
  É a fonte única. As cores são injetadas como variáveis CSS em runtime por
  `src/app/layout.tsx` — então mudar `brand.ts` re-tematiza o app inteiro.
  Para trocar a cor de destaque, edite `colors.accent` lá (NÃO mexa nos HEX de
  `globals.css`, que são só fallback).
- **Cor de destaque nas telas:** classes Tailwind `bg-accent`, `text-accent`,
  `border-accent` etc. (token `--color-accent`).
- **App do aluno:** `src/app/(aluno)/aluno/` (treino, dieta, evolução, perfil).
- **Painel do treinador:** `src/app/(treinador)/treinador/` (alunos, prescrição,
  templates, biblioteca, ajustes).
- **Dados:** Supabase via `src/lib/supabase/` e `src/lib/db.ts`. Sem variáveis
  de ambiente, o app roda em **modo demonstração** com dados de
  `src/lib/mock/` — útil pra testar visual sem banco.

## Regras ao editar
- Português correto, com acentuação e cedilha. HTML sempre com `<meta charset="UTF-8">`.
- Antes de remover uma feature, remova também os links de navegação
  (`src/components/layout/Sidebar.tsx` e `MobileTabBar.tsx`) e referências, e
  rode `npm run build` pra garantir que não quebrou.
- Mudou cor/marca? Confira que está em `brand.ts`, não hardcoded.
- Depois de mudanças, sugira rodar `npm run dev` e conferir em
  http://localhost:3000 (treinador) e /aluno (aluno).
- Guias para o dono: `MANUAL-CLAUDE.md` (uso) e `SETUP.md` (Supabase/Vercel/GitHub).
