# Checklist de testes — Montinho Personal Trainer

Data: 19/10/2026. Ambiente: container Linux, Node 22, Next 16.2, PostgreSQL 16 local (stub do Supabase), Chromium via Playwright. Projeto Supabase real `app-montinho` criado e migrado (0001→0010) e app publicado na Vercel no fim da sessão; os cenários que exigem login real com dois alunos continuam marcados como **NÃO EXECUTADO** até existir a primeira conta de treinador.

## Comandos de qualidade

| Verificação | Status | Evidência |
|---|---|---|
| `npm run lint` | PASSOU | 0 erros, 0 avisos (regras React Compiler incluídas) |
| `npx tsc --noEmit` | PASSOU | sem erros |
| `npm run build` | PASSOU | 44 rotas compiladas; rotas autenticadas marcadas `force-dynamic` |
| `npm test` (vitest) | PASSOU | 10 arquivos · **93 testes** |
| `npm run db:test` (Postgres local) | PASSOU | migrations 0001→0015 em transação única; seed legado; `TODOS OS TESTES PASSARAM` (T1–T9) |

## Testes automatizados por tema

| Tema | Arquivo | Cenários |
|---|---|---|
| Volume semanal | `src/lib/volume/calcular.test.ts` (24) | treino único; ABC 3x; ABC 5x (A/B repetidos); PPL 6x; Upper/Lower 4x com prioridade de glúteo; sem grupo → não classificado; composto (direto × secundário separado); aquecimento; pirâmide; rest-pause/drop set; alteração de calendário (ABC 3x → ABCAB 5x); rotativo 5x (média e microciclo); dia desativado; negativos/nulos/NaN; meta sem séries; superset; legado “pernas”; programado × realizado; heurística com confiança; persistência da correção manual (precedência); biblioteca legada sinaliza revisão; volume ponderado pelos pesos da biblioteca; desligar pesos; aviso de meta “ombros” com deltoides separados |
| Autorização | `src/lib/auth/guards.test.ts` (4) | aluno A ≠ aluno B; storage por pasta; redirecionamento por papel; cookie de demo só com personas conhecidas |
| Memória | `src/lib/memoria/similaridade.test.ts` (9) | divisão por objetivo/frequência com explicação; texto PT-BR “4 dias, glúteos, upper/lower, academia”; não recomenda equipamento ausente; não recomenda movimento restrito; desidentificação (sem nome/observações/cargas); sem IA e acervo vazio; dedupe + feedback explícito sem alegar superioridade; hash estável; metadados |
| Relatórios | `src/lib/relatorios/calcular.test.ts` (9) | e1RM Epley e faixa de validade; denominador por frequência; resumo 30 dias (aderência, tendência, conquistas reais); dados insuficientes → estado vazio; recorde só com histórico anterior; marcas por nome normalizado; calendário/tonelagem; semana flexível e próxima letra; alertas com evidência/janela/ação |
| Aderência | `src/lib/aderencia/calcular.test.ts` (12), `central.test.ts` (5) | meta 3 conclui 2; meta 4 conclui 4; extra não infla; pausa ≥ 4 dias exclui semana; semana sem prescrição sem divisão por zero; remanejada; troca de programa no meio da semana usa meta da segunda; sessão duplicada conta uma vez; sequência não quebra em pausa; sinais observáveis sem rótulos |
| Datas | `src/lib/format.test.ts` (3) | data de calendário sem fuso; instante no horário de Brasília (evita divergência servidor × navegador) |
| Conquistas | `src/lib/conquistas/regras.test.ts` (14), `mensal.test.ts` (2) | primeiro treino (parcial não conta); 10/25 sem extras; idempotência código+referência; 1ª meta e 4 semanas (pausa não quebra, falta quebra); “Eu voltei” ≥ 14 dias; recorde só com 2+ registros comparáveis e sem dor; mensagem por fato (meta cumprida agora, extra, parcial, primeiro treino); card mensal com período incompleto rotulado |
| Chalalá — cards | `src/lib/chalala/card.test.ts` (18), `compartilhar.test.ts` (5), `metricas.test.ts` (2) | 9:16, 4:5, 1:1 cabem; B só com meta real atingida; D sem dias de afastamento; nome só se ativado; métrica sem dado não aparece; nomes longos/acentos/números grandes; transparente; foto “cover”; share ok/cancelado/sem suporte/erro; métricas agregadas sem divisão por zero |
| Chalalá — SQL | `scripts/sql/test-rls.sql` T13 | conquista não duplica; aluno não grava para outro nem assina reconhecimento; aluno B não vê A; eventos isolados; visita pública sem aluno |
| Chalalá — e2e (demo) | roteiro Playwright | conclusão real, editor por teclado, PNGs com dimensões exatas, alfa real, foto local, nome longo, desfazer/restaurar, share nativo ok/cancelado/fallback, reabrir sem duplicar, card mensal sem números, página pública, reconhecimento do personal visto pelo aluno, falha de rede no resumo |
| Treino possível hoje | `src/lib/treino/possivel.test.ts` (8) | cabe inteiro; sem autorização; ordem de remoção (adiável do fim, essencial nunca); prioridade muscular preservada; descansos não encurtados; essenciais não cabem → inviável; volume mínimo 40%; superset sai inteiro |
| Treino extra | `src/lib/treino/extra.test.ts` (11), `aderencia/calcular.test.ts` | autorizado / sem autorização; limite de séries; limite semanal; mesmo grupo < 48 h; sem resposta de recuperação → aprovação; dor agora ou recente; dia e tempo; aprovação manual; semana já cumprida; aprovação consciente do personal (exceto dor agora); extra de atividade aparece como extra e não conta na meta |
| Extras — SQL | `scripts/sql/test-rls.sql` T14 | aluno não se autoaprova, não pede extra de outro, não altera regras; pedido não duplica; aluno B isolado; prioridade inválida recusada |
| Flexibilidade — e2e (demo) | roteiro Playwright (21 verificações) | 20 min inviável com motivo; versão reduzida e sessão só com os mantidos; servidor recusa versão inviável (409); extra liberado/não recomendado/dor; pedido → aprovação do personal → aluno liberado com resposta; registro de 32 min no calendário como extra; novo extra; prioridade no montador |
| Evolução invisível | `src/lib/relatorios/invisivel.test.ts` (5) | todo item tem dado, interpretação e critério; período anterior incompleto não compara; reps na mesma carga exigem 2+ registros; força estimada com ressalva e 4+ sessões; retomada; sem dados → nada |
| Relatório detalhado | `src/lib/relatorios/detalhe.test.ts` (3) | tempo real × planejado só com 2+ sessões e tolerância de 15%; descanso só com 10+ intervalos ao vivo; extras/reduzidas/check-ins/interrupções |
| Sugestões de acompanhamento | `src/lib/aderencia/central.test.ts` (+5) | ausência real com rascunho; pausa sem alerta; treino aberto = registro; plano alterado como possível causa; regras ajustáveis |
| Etapa 7 — e2e (demo) | roteiro Playwright | evolução invisível com Dado/Interpretação; 4 seções novas; Central em cartões no celular; regra ajustada aplicada; perfil do aluno no personal; sugestão abre reconhecimento preenchido; rolagem do painel no celular (título visível, volta ao topo, sem rolagem horizontal) |
| Fila offline | `src/lib/sync/fila.test.ts` (9) | client_key única; última edição vence sem duplicar; finalizar por último; erro transitório mantém ordem e reenvia; erro definitivo descarta; reenvio idempotente; **operação enfileirada durante o envio não se perde** (bug encontrado no e2e e corrigido); reconciliação; storage corrompido |
| Catálogo | `src/lib/biblioteca/catalogo.test.ts` (9) | exatamente 150 com slugs únicos; nenhum nome/sinônimo em dois exercícios; todos os grupos obrigatórios (deltoides separados); metadados completos; pesos válidos sem o músculo principal; substituições existentes e nunca para si; classificações de referência; nenhum vídeo inventado; todo nome da biblioteca antiga (ZIP) e da demo é reconhecido (cardio fora) |
| Busca | `src/lib/biblioteca/busca.test.ts` (10) | “pulley” → puxadas; “rosca scott” → variações; “leg” → leg press sem flexora/extensora; parcial e sem acento; sinônimos; grupo/equipamento/padrão; filtros (grupo com e sem secundários, equipamento, tipo, favoritos, sem mídia); favoritos/uso sobem sem trazer irrelevantes; equipamento em texto livre |
| Substituição | `src/lib/biblioteca/substituicao.test.ts` (6) | supino reto → halteres e máquina; mesmo músculo não basta; equipamento ausente descarta com motivo; restrição de joelho rebaixa e alerta; avançado para iniciante alerta; aprovada no topo e rejeitada nunca aparece |
| Preferências | `src/lib/memoria/preferencias.test.ts` (2) | só itens salvos e não excluídos; acervo vazio não alega aprendizado |
| Técnicas no volume | `src/lib/volume/tecnicas.test.ts` (11) | drop set moderado (3 + 1); teto por série; clássica não soma; alta = 1 por drop; rest-pause assumido com aviso; myo-reps em todas as séries; aquecimento fora e técnica limitada às séries válidas; cluster/superset/bi-set/pirâmide/isometria = 1; secundário acompanha; ajuste por RIR; descrição para o aluno |
| RLS / migração (SQL) | `scripts/sql/test-rls.sql` (8 blocos) | T1 logbook legado migrado sem perda (duplicata preservada); T2 aluno A só lê os próprios treinos/sessões/séries/fotos; T3 aluno não cria sessão para B, não cria template, não escreve no logbook, não lê/escreve memória, não altera plano, não apaga versões; T4 sessão própria idempotente (reenvio rejeitado; dois treinos iguais no mesmo dia permitidos); T5 aluno B isolado de A; T6 treinador vê tudo, versões imutáveis, memória acessível; T7 catálogo com 150 itens e ≥300 sugestões, sem nomes duplicados, reaplicar a 0013 é idempotente e não altera prescrições, aluno lê a biblioteca mas não escreve nem vê equivalências/favoritos, favoritos de um treinador invisíveis ao outro; T8 0014 aceita myo-reps, limita drops/mini-séries, recusa técnica desconhecida e não altera prescrições antigas |

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


## Biblioteca inteligente (20/10/2026)

| Item | Status | Evidência |
|---|---|---|
| 150 exercícios em produção | PASSOU | SQL no projeto `app-montinho`: 150 itens `origem='catalogo'`, 351 equivalências, 0 nomes duplicados |
| Pendência de mídia | PENDENTE | 0 de 150 com vídeo verificado (nenhum link inventado) |
| e2e demo — biblioteca | PASSOU | busca “pulley”, “rosca scott”, “leg”, “smith”; favoritar; aprovar/rejeitar/desfazer; filtro ombro posterior = 4 |
| e2e demo — montador | PASSOU | seletor com Enter; alternativas respeitam restrição do aluno; coluna “Pond.” com vírgula decimal |
| e2e demo — aluno | PASSOU | “Como executar” com até 3 dicas; vídeo não verificado não aparece |
| e2e demo — APIs | PASSOU | aluno recebe 403 em favoritos/equivalências/criar; nome duplicado → 409; equivalência consigo → 400 |
| Login real com treinador em produção | NÃO EXECUTADO | requer sua senha; só o build e as tabelas foram verificados |

## Técnicas avançadas no volume (20/10/2026)

| Item | Status | Evidência |
|---|---|---|
| Migration 0014 em produção | PASSOU | colunas `tecnica_extras`/`tecnica_series` e check com `myo_reps` conferidos no banco |
| e2e demo — montador | PASSOU | tríceps 6 → drop set (1 drop assumido) 6,5* → 2 drops 7* → Clássica 6 / Alta 8 / Moderada 7; myo-reps 8*; aviso explicando a regra; sem erros no console; celular ok |
| Pesquisa (estudos, treinadores, apps) | FEITA | VOLUME-TECNICAS.md, com o que não foi verificado marcado |

## Retomar treino após fechar o app (20/10/2026)

| Item | Status | Evidência |
|---|---|---|
| Unitário | PASSOU | `src/lib/sync/rascunho.test.ts` (6): guarda só o não concluído; restaura carga digitada, série extra, exercício aberto e descanso; série concluída nunca é sobrescrita; rascunho velho (>18 h) ou corrompido ignorado; finalizar limpa; abre no primeiro exercício pendente |
| e2e demo (celular) | PASSOU | concluiu 2 séries, digitou 22,5 kg × 12 sem concluir, adicionou série extra, fechou a aba; reabriu pelo início → “Continuar treino” → mesmo exercício aberto, valores e série extra de volta, descanso continuando (01:27), aviso “Você voltou de onde parou” |

## Conferência ao concluir o treino (20/10/2026)

| Item | Status | Evidência |
|---|---|---|
| Unitário | PASSOU | `src/lib/treino/pendencias.test.ts` (4): lista séries válidas sem ✓ e separa as já preenchidas; tudo marcado = sem aviso; aquecimento, “pular hoje” e “não consegui” não contam; texto em PT-BR |
| e2e demo (celular) | PASSOU | marcou 1 série, preencheu outra sem ✓, pulou um exercício → “Concluir treino” abre o aviso “Faltam marcar 15 séries” com “Ir marcar” por exercício (o pulado fica fora) → “Marcar a série preenchida e concluir” → “Você realizou 2 de 19 séries” |

## Lembrete de treino em aberto (20/10/2026)

| Item | Status | Evidência |
|---|---|---|
| SQL (T9) | PASSOU | lembra só o treino parado há 30 min (o com série há 5 min não); 1 vez por treino; chave errada recusada; aluno não lista lembretes nem grava inscrição em nome de outro; vê só os próprios aparelhos; inscrição recusada é desativada |
| Unitário | PASSOU | `src/lib/push/mensagem.test.ts` (2): título/corpo/link do treino; sem nome |
| Produção | APLICADO | migration 0015, hash da chave em `config_privada`, `pg_cron` a cada 5 min chamando `/api/cron/lembretes`; chaves VAPID e `LEMBRETE_CHAVE` na Vercel |
| Notificação no celular real | NÃO EXECUTADO | precisa de um aparelho com permissão concedida (ver GUIA) |
