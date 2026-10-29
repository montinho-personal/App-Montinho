-- ============================================================================
-- 0114 — Revisão do “Mito ou verdade?” (pedido do Montinho em 29/10/2026):
-- a pergunta que a pessoa errou volta depois de um tempo (3, 7 e 14 dias).
-- A 1ª resposta (resposta/acertou) continua sendo o histórico e é a que conta
-- para os troféus; a revisão fica nas colunas abaixo. Mesmas políticas de
-- conhecimento_aluno (o aluno só mexe na própria linha). Idempotente.
-- ============================================================================
alter table conhecimento_aluno add column if not exists revisoes integer not null default 0 check (revisoes >= 0);
alter table conhecimento_aluno add column if not exists revisao_em timestamptz;
alter table conhecimento_aluno add column if not exists revisao_resposta text check (revisao_resposta is null or length(revisao_resposta) <= 20);
alter table conhecimento_aluno add column if not exists revisao_acertou boolean;
