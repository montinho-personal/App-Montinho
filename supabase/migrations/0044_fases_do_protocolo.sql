-- ============================================================================
-- 0044 — Fase do protocolo (adaptação, intensificação, consolidação) escolhida
-- pelo personal no montador, e as medalhas de fase. A fase do dia fica
-- registrada no snapshot da sessão (training_sessions.snapshot->>'fase').
-- Aditiva e idempotente.
-- ============================================================================
alter table programas add column if not exists fase text;
alter table programas drop constraint if exists programas_fase_check;
alter table programas add constraint programas_fase_check check (fase is null or fase in ('adaptacao','intensificacao','consolidacao'));
alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_8','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao'));
