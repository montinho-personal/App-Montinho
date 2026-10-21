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
- **Tudo que for compartilhável** (cards, imagens, Stories, WhatsApp) leva o logo oficial completo `public/brand/logo.svg` (M + “MONTINHO / PERSONAL TRAINER” embaixo), bem visível — nunca só o “M” nem texto no lugar do logo.
- Banco: `supabase/migrations/` (aditivas; novas vão em `0040_…`; a `0034_alternativas_ocultas` ainda não foi aplicada em produção; `0035` = trava de `profiles.role` + foto; `0036` = Chalalá no celular; `0037` = medalhas “Além do necessário”; `0038` = “Vai que tá fácil” por aluno; `0039` = agachamento sumô no step, cadastro do personal). Produção: projeto `app-montinho` (ref `bixfqkisvzrpxbiscqdd`), app em <https://app-montinho.vercel.app>. Teste local: `npm run db:test`.
- Chalalá no celular (Web Push): regras de envio no banco (`0036`: Bom Dia, pós-treino, silêncio, limites, chave geral `notificacao_config.chalala_ativo`), textos em `src/lib/push/chalala.ts`, envio em `src/app/api/cron/lembretes` (pg_cron a cada 5 min). No treino: `src/lib/chalala/treino.ts` (máx. 2 recados por treino). Frase da confiança “É impossível dar errado!” (textos do Montinho, não alterar sem pedir): `src/lib/chalala/confianca.ts` (1º treino, cansado, treino curto, volta, ficha nova, parcial; máx. 1/dia e 3/semana; nunca com dor). Bordão do desafio “Vai que tá fácil!”: `src/lib/chalala/facil.ts` (antes da última série, só se as anteriores saíram fáceis).
- Documentação: README, SETUP, GUIA-MONTINHO, ARQUITETURA, AUDITORIA-INICIAL, CHECKLIST-TESTES, ROADMAP.

## Ao editar
- Português correto, com acentos. Horários/datas/kg/cm no padrão do Brasil.
- Removeu uma tela? Remova os links em `src/app/(treinador)/layout.tsx` (NAV) e `src/app/(aluno)/layout.tsx` (TABS).
- Depois de mudar banco: atualizar `src/lib/supabase/types*.ts`, `scripts/sql/test-rls.sql` e rodar `npm run db:test`.
