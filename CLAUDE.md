@AGENTS.md

# Contexto do projeto (para o Claude)

App web do **Montinho Personal Trainer**: app do aluno (mobile-first) + painel do treinador. Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 + Supabase. O dono não programa: seja didático, faça mudanças pequenas e seguras e rode `npm run lint && npm run typecheck && npm test` antes de concluir.

## Regras inegociáveis
- **Nunca** apagar exercícios/treinos com histórico: use `removido_em` / `ativo=false` (ver `src/lib/data/programas.ts`).
- **Nunca** usar a service role (`src/lib/supabase/admin.ts`) em leituras normais; páginas e APIs usam `src/lib/supabase/rls.ts` + `src/lib/auth/session.ts`.
- Identidade do aluno vem de `requireAlunoPage()/requireAlunoApi()` — jamais de constante ou parâmetro de URL sem `podeAcessarAluno`.
- Modo demo só com `NEXT_PUBLIC_DEMO_MODE=true` (`src/lib/env.ts`); dados demo vivem em `src/lib/mock/store.ts`.
- Volume semanal = séries válidas × frequência por letra (`src/lib/volume/calcular.ts`); técnicas avançadas pela regra declarada em `src/lib/volume/tecnicas.ts` (fontes em VOLUME-TECNICAS.md). Rótulos neutros; nada de “ideal/sobrecarga” automático.
- Memória de prescrições guarda só estrutura desidentificada (`src/lib/memoria/similaridade.ts#desidentificar`).
- Entrada de API sempre validada com zod (`src/lib/validacao/schemas.ts`).

## Onde fica cada coisa
- Marca: `src/config/brand.ts` + `public/brand/*` (logo oficial do site; trocar por vetor original quando houver).
- Banco: `supabase/migrations/` (aditivas; novas vão em `0021_…`). Produção: projeto `app-montinho` (ref `bixfqkisvzrpxbiscqdd`), app em <https://app-montinho.vercel.app>. Teste local: `npm run db:test`.
- Documentação: README, SETUP, GUIA-MONTINHO, ARQUITETURA, AUDITORIA-INICIAL, CHECKLIST-TESTES, ROADMAP.

## Ao editar
- Português correto, com acentos. Horários/datas/kg/cm no padrão do Brasil.
- Removeu uma tela? Remova os links em `src/app/(treinador)/layout.tsx` (NAV) e `src/app/(aluno)/layout.tsx` (TABS).
- Depois de mudar banco: atualizar `src/lib/supabase/types*.ts`, `scripts/sql/test-rls.sql` e rodar `npm run db:test`.
