-- ============================================================================
-- 0074 — Nível de dor no pedido de treino extra (Montinho, 23/10/2026):
-- 'dor_leve' e 'dor_moderada' (faz com precaução); 'dor' = dor forte (não faz).
-- ============================================================================
alter table solicitacoes_extra drop constraint if exists solicitacoes_extra_recuperacao_check;
alter table solicitacoes_extra add constraint solicitacoes_extra_recuperacao_check
  check (recuperacao is null or recuperacao in ('bem', 'cansado', 'dor_leve', 'dor_moderada', 'dor', 'prefiro_nao'));
