# Checklist de testes — Montinho Personal Trainer

Data: 19/10/2026. Ambiente: container Linux, Node 22, Next 16.2, PostgreSQL 16 local (stub do Supabase), Chromium via Playwright. Projeto Supabase real `app-montinho` criado e migrado (0001→0010) e app publicado na Vercel no fim da sessão; os cenários que exigem login real com dois alunos continuam marcados como **NÃO EXECUTADO** até existir a primeira conta de treinador.

## Comandos de qualidade

| Verificação | Status | Evidência |
|---|---|---|
| `npm run lint` | PASSOU | 0 erros, 0 avisos (regras React Compiler incluídas) |
| `npx tsc --noEmit` | PASSOU | sem erros |
| `npm run build` | PASSOU | 44 rotas compiladas; rotas autenticadas marcadas `force-dynamic` |
| `npm test` (vitest) | PASSOU | 5 arquivos · **52 testes** |
| `npm run db:test` (Postgres local) | PASSOU | migrations 0001→0010 em transação única; seed legado; `TODOS OS TESTES PASSARAM` (T1–T6) |

## Testes automatizados por tema

| Tema | Arquivo | Cenários |
|---|---|---|
| Volume semanal | `src/lib/volume/calcular.test.ts` (21) | treino único; ABC 3x; ABC 5x (A/B repetidos); PPL 6x; Upper/Lower 4x com prioridade de glúteo; sem grupo → não classificado; composto (direto × secundário separado); aquecimento; pirâmide; rest-pause/drop set; alteração de calendário (ABC 3x → ABCAB 5x); rotativo 5x (média e microciclo); dia desativado; negativos/nulos/NaN; meta sem séries; superset; legado “pernas”; programado × realizado; heurística com confiança; persistência da correção manual (precedência); biblioteca legada sinaliza revisão |
| Autorização | `src/lib/auth/guards.test.ts` (4) | aluno A ≠ aluno B; storage por pasta; redirecionamento por papel; cookie de demo só com personas conhecidas |
| Memória | `src/lib/memoria/similaridade.test.ts` (9) | divisão por objetivo/frequência com explicação; texto PT-BR “4 dias, glúteos, upper/lower, academia”; não recomenda equipamento ausente; não recomenda movimento restrito; desidentificação (sem nome/observações/cargas); sem IA e acervo vazio; dedupe + feedback explícito sem alegar superioridade; hash estável; metadados |
| Relatórios | `src/lib/relatorios/calcular.test.ts` (9) | e1RM Epley e faixa de validade; denominador por frequência; resumo 30 dias (aderência, tendência, conquistas reais); dados insuficientes → estado vazio; recorde só com histórico anterior; marcas por nome normalizado; calendário/tonelagem; semana flexível e próxima letra; alertas com evidência/janela/ação |
| Fila offline | `src/lib/sync/fila.test.ts` (9) | client_key única; última edição vence sem duplicar; finalizar por último; erro transitório mantém ordem e reenvia; erro definitivo descarta; reenvio idempotente; **operação enfileirada durante o envio não se perde** (bug encontrado no e2e e corrigido); reconciliação; storage corrompido |
| RLS / migração (SQL) | `scripts/sql/test-rls.sql` (6 blocos) | T1 logbook legado migrado sem perda (duplicata preservada); T2 aluno A só lê os próprios treinos/sessões/séries/fotos; T3 aluno não cria sessão para B, não cria template, não escreve no logbook, não lê/escreve memória, não altera plano, não apaga versões; T4 sessão própria idempotente (reenvio rejeitado; dois treinos iguais no mesmo dia permitidos); T5 aluno B isolado de A; T6 treinador vê tudo, versões imutáveis, memória acessível |

## Critérios de aceitação do Prompt Mestre (§12)

| # | Cenário | Status | Evidência / como executar |
|---|---|---|---|
| A | Upper/Lower 4x com prioridade de glúteos: tabela separa quadríceps/posterior/glúteos em tempo real | PASSOU | unit test “Upper/Lower 4x…”; e2e: preset “Upper/Lower 4x” → “4 sessões/sem · 84 séries válidas” recalculado sem salvar (`docs/screenshots/13-montador-abc5x.jpg`) |
| B | ABC 3x → A/B/C/A/B 5x recalcula sem dupla contagem | PASSOU | unit tests “ABC 5x” e “alteração de calendário”; e2e preset ABC 5x: 90 → 135 séries (A e B ×2) |
| C | Aluno registra 3 séries, encerra, volta e encontra registro e últimas cargas | PASSOU (demo) | e2e mobile: 3 séries → “Tudo salvo” → reload → “3 de 16 séries” → concluir → “Você realizou 3 de 16 séries propostas”; a tela mostra “Última vez (data): kg×reps” (`06`, `07`). Em Supabase real: NÃO EXECUTADO (sem credenciais) |
| D | Treinador troca exercício/séries: sessões passadas íntegras, versão anterior preservada | PASSOU | `salvarPlano` sem DELETE (soft delete) + `programa_versoes`; T6 prova imutabilidade; “Histórico do plano” na Evolução |
| E | 2 programas semelhantes + busca “4 dias, glúteos, upper/lower, academia” → sugestões explicadas, clonáveis, sem dados de alunos | PASSOU | unit tests de memória; e2e: “Já montei algo parecido?” retornou 3 exemplos com motivos (`14-montador-memoria.jpg`); desidentificação testada |
| F | Após 30 dias, evolução com resumo confiável e detalhes; sem dados → vazio | PASSOU (demo) | `08-aluno-evolucao.jpg` (16/21 sessões, 76 %, conquistas reais); teste “sem dados suficientes” |
| G | Aluno A não acessa dados de B por URL/API/arquivo; testes automatizados | PASSOU | e2e: `/treinador` → redirecionado; `GET /api/alunos/joao/plano` = **403**; `/exportar` = **403**; `/api/memoria` = **403**; SQL T2/T3/T5; `guards.test.ts`. Storage real: NÃO EXECUTADO (policy da 0002 testada só no stub) |
| H | Conexão instável: concluir séries não duplica nem perde; UI indica pendente/confirmado | PASSOU (unit + demo) | `fila.test.ts` (reenvio idempotente, item durante envio); UNIQUE no banco (T4); indicador “pendente de sincronização / Tudo salvo” (`06`). Teste manual com rede desligada em celular real: NÃO EXECUTADO |
| I | Sem chave de IA: templates e sugestões estruturadas continuam funcionando, sem simular LLM | PASSOU | `/api/memoria` responde `{motor:"busca_estruturada", ia:false}`; UI diz “sem IA” |
| J | Marca não exibe “SQUAD”; logo provisório/registro de pendência | PASSOU | `grep -r SQUAD src public` = 0; logo oficial do site; pendência do vetor original no ROADMAP |
| K | lint, tsc, build e testes executam | PASSOU | tabela acima |

## Jornadas visuais (Playwright)

Capturas em `docs/screenshots/`: login demo (01), início do aluno (02), Treinar (03), treino antes/ativo/séries/concluído (04–07), evolução (08), perfil (09), painel (10), ficha (11), montador desktop (12), após preset (13), memória no montador (14), salvo (15), acervo (16), evolução do treinador (17), montador no celular e painel de volume (18–19). Nenhum erro de console nas jornadas de aluno (mobile) e treinador (desktop).

## Não executado (com motivo)

- Login real (senha/magic link), convite de aluno por e-mail, storage de fotos e RLS **no Supabase**: sem credenciais nesta sessão. Caminho: SETUP.md → `scripts/seed-demo.sql` (opcional) → repetir cenários C, G, H com dois alunos reais.
- Deploy na Vercel: **EXECUTADO** — `https://app-montinho.vercel.app` responde a tela de login real (modo `live`, sem banner de demo); Security Advisor do Supabase após a 0010 só mantém avisos intencionais (`is_treinador`/`aluno_id_atual` são as funções das policies de RLS e `marcar_ultimo_treino` exige login e valida o dono). Falta a chave `service_role` (convite por e-mail) e a URL no Auth — SETUP.md, "Pendências de ativação".
- Teste em dispositivo físico com rede instável (modo avião): não há dispositivo. A fila local foi validada por unit test e pelo e2e em Chromium.
