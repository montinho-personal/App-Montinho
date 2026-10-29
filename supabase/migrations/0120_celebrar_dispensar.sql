-- ============================================================================
-- 0120 — “Dispensar” no Celebrar conquistas (pedido do Montinho, 29/10/2026):
-- conquistas antigas que ele não quer mais celebrar saem da lista “Falta
-- celebrar” sem apagar nada (o troféu do aluno continua). Usa a mesma tabela
-- de estados do acompanhamento (0096): origem 'celebrar', chave
-- 'celebrar:<id da conquista>', estado 'dispensado'. Só o personal grava.
-- ============================================================================
alter table acompanhamento_alertas drop constraint if exists acompanhamento_alertas_origem_check;
alter table acompanhamento_alertas add constraint acompanhamento_alertas_origem_check check (origem in ('pulso', 'aderencia', 'cardio', 'celebrar'));
