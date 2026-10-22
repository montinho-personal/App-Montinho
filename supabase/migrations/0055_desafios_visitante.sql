-- ============================================================================
-- 0055 — Modo Visitante, fases 4/5: desafios com missão e medalha.
--
--  • campanhas.meta_treinos   quantos treinos concluídos dentro do período
--                             (inicio..fim) completam o desafio
--  • visitante lê a campanha em que entrou (nome, regras, datas, meta)
--  • medalha 'desafio_concluido' (referência = id da campanha; uma por desafio)
-- Tudo aditivo.
-- ============================================================================

alter table campanhas add column if not exists meta_treinos int check (meta_treinos is null or meta_treinos between 1 and 100);

create policy campanhas_visitante_le on campanhas for select
  using (exists (select 1 from acessos_visitante v where v.campanha_id = campanhas.id and v.aluno_id = public.aluno_id_atual()));

alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_8','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','desafio_concluido'));
