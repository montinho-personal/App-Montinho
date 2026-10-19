# Auditoria inicial — `squad-app.zip` → Montinho Personal Trainer

Data: 19/10/2026. Base auditada: ZIP `squad-app` (Next.js 16, React 19, TypeScript, Tailwind 4, Supabase; 7 migrations; ~11,8 mil linhas em `src/`).

Legenda de risco: **Crítico** (vazamento/perda de dados ou acesso indevido), **Alto** (comportamento errado em produção), **Médio** (qualidade/UX), **Baixo** (cosmético).

## 1. Identidade e autorização

| # | Problema | Arquivos | Risco | Decisão / correção |
|---|---|---|---|---|
| 1.1 | Páginas do aluno usavam `const ALUNO_ID = "aline"`: qualquer usuário logado via os dados da mesma aluna. | `src/app/(aluno)/aluno/page.tsx`, `treino/[treinoId]/page.tsx`, `evolucao/page.tsx`, `perfil/page.tsx`, `dieta/page.tsx` | Crítico | Removido. Identidade resolvida no servidor por `getSessao()` (`src/lib/auth/session.ts`): `auth.uid()` → `profiles.role` → `alunos.id`. Páginas usam `requireAlunoPage()` / `requireTreinadorPage()`; APIs usam `requireAlunoApi()` / `requireTreinadorApi()` / `requireAcessoAlunoApi(alunoId)`. |
| 1.2 | `src/lib/db.ts` usava a **service role** (ignora RLS) em todas as leituras; a segurança dependia só do `proxy.ts`. | `src/lib/db.ts`, `src/lib/api-auth.ts`, todas as rotas em `src/app/api/*` | Crítico | Todas as leituras/escritas passam a usar cliente autenticado (`src/lib/supabase/rls.ts`). Service role fica apenas em `POST /api/alunos` (convite em `auth.users`), com checagem explícita de treinador e registro em `intervencoes`. |
| 1.3 | Sem Supabase, o `proxy.ts` liberava **todas** as rotas privadas (“dev mode pré-credenciais”), inclusive em produção. | `src/proxy.ts`, `src/app/page.tsx` | Crítico | Modo explícito em `src/lib/env.ts`: `live` / `demo` (exige `NEXT_PUBLIC_DEMO_MODE=true`, bloqueado em produção Vercel sem `DEMO_ALLOW_PRODUCTION`) / `nao_configurado` (nada abre; página `/configuracao-pendente`). Demo tem identidade por cookie escolhida em `/login` e banner permanente. |
| 1.4 | `PUT /api/treinos/[id]/exercicios` pulava a autenticação quando em mock. | rota removida | Crítico | Rota removida; substituída por `PUT /api/alunos/[id]/plano` (treinador, validado). |
| 1.5 | Funções `is_treinador()` / `aluno_id_atual()` (SECURITY DEFINER) sem `search_path` fixo. | `0001_initial_schema.sql` | Alto | Recriadas com `set search_path = public` na 0009. |
| 1.6 | Aluno tinha policy de INSERT/UPDATE no `logbook` legado. | `0001` | Médio | Policies removidas na 0009 (aluno escreve apenas em sessões próprias). |
| 1.7 | Aluno não conseguia marcar `ultimo_treino_em` (sem policy) → painel do treinador ficava desatualizado. | — | Médio | RPC `marcar_ultimo_treino(uuid)` SECURITY DEFINER que valida o dono. |

## 2. Histórico e persistência

| # | Problema | Arquivos | Risco | Decisão / correção |
|---|---|---|---|---|
| 2.1 | Salvar treino fazia `DELETE` de todos os exercícios + `INSERT`; `logbook.exercicio_id` tem `ON DELETE CASCADE` → **todo histórico de cargas era apagado a cada salvamento**. | `src/lib/db.ts#saveExerciciosTreino`, `src/app/api/alunos/[id]/treinos/route.ts` | Crítico | `salvarPlano()` (`src/lib/data/programas.ts`): update por `id` estável, insert dos novos, `removido_em` (soft delete) nos retirados. Nenhum `DELETE` em `exercicios`. |
| 2.2 | `upsert` do logbook com `onConflict: "aluno_id,exercicio_id,data,serie"` **sem constraint única** correspondente → erro ou duplicação; modelo assumia uma sessão por exercício/dia. | `src/app/api/logbook/route.ts` | Crítico | Novo modelo `training_sessions` / `session_exercises` / `session_sets` com idempotência por `client_key` (UNIQUE `(aluno_id, client_key)` e `(session_id, client_key)`). Mesmo exercício duas vezes no dia = duas sessões. Logbook legado migrado para sessões (0009 §8) **sem apagar** a tabela; coluna `logbook.session_set_id` rastreia a origem. |
| 2.3 | Sem snapshot de prescrição: alterar o plano alterava o passado. | — | Alto | `programa_versoes` (append-only, sem policy de update/delete) com snapshot completo a cada salvamento + `diff_resumo`. Sessões guardam `snapshot` da prescrição no momento. |
| 2.4 | `globalThis.__squadMock` usado como “persistência” do montador. | `src/lib/db.ts` | Alto | Só existe `src/lib/mock/store.ts`, usado exclusivamente em modo demo (identificado na UI). |
| 2.5 | Registro de série no aluno disparava `fetch` no `onBlur` sem fila nem reenvio; falha de rede perdia a série. | `ExercicioCard.tsx` | Alto | Fila local idempotente em `localStorage` (`src/lib/sync/fila.ts`) com estados pendente/enviando/confirmado, reenvio automático ao voltar a conexão, reconciliação com o servidor. |
| 2.6 | `DELETE /api/treinos/[id]` apagava treino + exercícios (cascade). | rota | Alto | Removido. Só existe `PATCH {ativo:false}` (arquivar). |

## 3. Qualidade técnica

| # | Problema | Arquivos | Risco | Decisão / correção |
|---|---|---|---|---|
| 3.1 | Nenhuma validação de entrada no servidor (`body.x` direto no banco). | todas as rotas | Alto | Schemas zod em `src/lib/validacao/schemas.ts` + `lerJson()`; respostas 400 em PT-BR. |
| 3.2 | Nenhum teste automatizado. | — | Alto | 52 testes vitest (volume, grupos, memória, relatórios, fila, autorização) + 6 cenários SQL de RLS/migração executáveis em Postgres local (`scripts/db-local-test.sh`). |
| 3.3 | `tsconfig` com `noImplicitAny: false`; muitos `as never`. | `tsconfig.json`, páginas | Médio | Tipos novos (`types-sessoes.ts`), módulos tipados; `as never` restante apenas em componentes legados de fotos/medidas (não críticos). |
| 3.4 | Enum `grupo_muscular` misturava **pernas** (quadríceps+posteriores) e ignorava subdivisão de ombro. | `0003`, `grupos.ts`, `periodizacao.ts` | Alto (cálculo errado de volume) | 0008 adiciona `quadriceps`, `posteriores`, `adutores`, `abdutores`, `ombro_*`, `trapezio`, `lombar`, `nao_classificado`; `pernas` preservado como legado “a classificar”. |
| 3.5 | `detectarGrupo(nome)` por regex classificava em definitivo e silenciosamente; `RailVolume` rotulava “ideal/pesado/sobrecarga” com MEV/MRV como verdade. | `grupos.ts`, `RailVolume.tsx` | Alto | Precedência biblioteca > correção salva > manual > heurística com **confiança**; metas por aluno com rótulos neutros; referências marcadas como heurísticas. |
| 3.6 | Marca: SVGs “SQUAD” roxos; `brand.ts` genérico. | `public/brand/*`, `src/config/brand.ts` | Médio | Logotipo oficial do site (variantes), dourado `#ba9e50`, DM Sans. Nenhum “SQUAD” restante no código (`grep` limpo). |
| 3.7 | Textos com nomes de outras pessoas (“Pedro”, “Vitor”) e metáforas de produto antigo. | várias telas | Baixo | Revisado para Montinho. |
| 3.8 | `maximumScale: 1` no viewport impedia zoom (acessibilidade). | `layout.tsx` | Médio | Removido; foco visível, alvos 44 px, `prefers-reduced-motion`. |
| 3.9 | Lint com regras do React Compiler acusava `setState` em efeitos e impurezas. | componentes novos | Baixo | Corrigido (`useSyncExternalStore`, updaters puros). `npm run lint` limpo. |

## 4. O que foi preservado

- Stack completa (Next 16 App Router, React 19, TS, Tailwind 4, Supabase) e estrutura de pastas.
- Migrations 0001–0007 intactas (apenas acrescidas por 0008/0009).
- Componentes de UI (`Card`, `Badge`, `Tabs`, `Heatmap`, `VideoPlayer`, comparadores de fotos/medidas, check-in diário, calculadora de macros, biblioteca, templates, prescrição) — ajustados à marca e ao novo tipo de grupo.
- `src/lib/series.ts` (séries iguais / série a série), `restricoes.ts` (alertas por lesão) e `periodizacao.ts` (referências, agora rotuladas como heurísticas).
- Dados fictícios do demo (ampliados com sessões, programa, versões e memória).

## 5. Itens fora de escopo desta etapa (registrados no ROADMAP)

- Pagamentos (InfinityPay/Asaas), formulários públicos, importações e `conhecimento`: mantidos como estavam, sem revisão funcional.
- Chat (`mensagens`): leitura mantida; sem UI de envio (navegação do aluno não expõe “Mensagens” até existir).
- Notificações push/lembretes: não implementados (opt-in previsto em `alunos.preferencias`).
