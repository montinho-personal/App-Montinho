# Auditoria — Montinho Consistência 2.0 (20/10/2026)

Antes de implementar, o que já existia no app (F = funcional, I = incompleto, A = ausente).

| Área | Estado | Onde / observação |
|---|---|---|
| Autenticação e papéis | F | `src/lib/auth/session.ts` (guards de página e API), RLS com `is_treinador()` e `aluno_id_atual()`; aluno só vê o próprio registro (testes SQL T2–T5). Modelo de **treinador único** (não há `alunos.treinador_id`): todo treinador vê todos os alunos. |
| Histórico de sessões e séries | F | `training_sessions`, `session_exercises`, `session_sets` com `client_key` idempotente; fila offline (`src/lib/sync/fila.ts`); versões imutáveis do plano (`programa_versoes`); soft delete de exercícios. |
| Retomar treino interrompido | F | rascunho local (`src/lib/sync/rascunho.ts`) + sessão no servidor. |
| Cronômetro de descanso | F (parcial) | `RestTimer` baseado em horário (sobrevive à tela bloqueada); usava só o descanso "plano" do exercício — o descanso por série não era usado na execução. |
| Montador | F | séries iguais ou série a série, descanso por exercício/série, técnicas, volume semanal em tempo real. |
| Cadência | I | coluna `exercicios.cadencia` existe, sem campo no montador. |
| Estimativa de duração | A | só média histórica na home do aluno; nenhum cálculo no montador. |
| Tempo-alvo | I | `programas.duracao_min` (“duração prevista”) sem comparação. |
| Ritmo durante o treino | A | sem tempo transcorrido/restante/previsão. |
| Meta semanal | I | derivada de `programas.frequencia`; barra “X de Y treinos” na home. |
| Índice de aderência | I | `src/lib/relatorios/calcular.ts` (período, tendência); sem semanas históricas, pausas, remanejamentos ou snapshot semanal. |
| Sequência de semanas | A | — |
| Calendário | I | só heatmap do passado (feito/abandonado). |
| Check-in | F | diário (energia, sono, dor, motivação) + feedback pós-treino; falta o “como você está hoje?” antes do treino. |
| Conquistas | I | calculadas na hora (recordes, consistência), sem persistência, sem histórico nem animação. |
| Feedback contextual | I | mensagem de retomada na home. |
| Treino por tempo disponível | A | flag `permite_versao_reduzida` sem uso. |
| Treino extra | A | — |
| Painel de aderência do personal | I | alertas por aluno na visão geral. |
| Mensagens | I | `intervencoes` (notas visíveis ao aluno) funcionam; tabela `mensagens` (chat) sem interface. |
| Notificações | F | push de treino em aberto (0015). |
| Código morto | — | `FinalizarTreinoButton.tsx` e `ExercicioCard.tsx` chamam rotas inexistentes e não são importados. |

## Decisões
- Implementar por cima do que existe: o motor de volume, a fila offline, o rascunho, as versões e os alertas são reaproveitados.
- Tudo o que vira número para o aluno ou para o treinador sai de dados persistidos (sessões, séries, metas, pausas), nunca de valores de exemplo.
- Modelo de treinador único mantido (é o caso do Montinho); limitação registrada no ROADMAP.
