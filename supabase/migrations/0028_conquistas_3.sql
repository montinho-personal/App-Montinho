-- ============================================================================
-- 0028 — Conquistas 3.0: 4 novas medalhas únicas, versão do critério,
-- evidência, origem e estado de leitura. ADITIVA: nenhuma conquista antiga é
-- apagada ou alterada (as existentes ficam com criterio_versao = 1).
-- * O aluno só pode marcar “vista” (vista_em) nas próprias conquistas:
--   privilégio de UPDATE por coluna + política de RLS.
-- * Novos eventos agregados (sem conteúdo privado): vitrine e explicações.
-- ============================================================================

alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in (
  'primeiro_treino','primeira_meta_semanal','primeiro_mes','treinos_10','treinos_25','treinos_50',
  'semanas_consistentes_4','semanas_consistentes_8','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei',
  'criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente'
));

alter table conquistas_aluno add column if not exists criterio_versao smallint not null default 1 check (criterio_versao between 1 and 99);
alter table conquistas_aluno add column if not exists evidencia jsonb not null default '{}'::jsonb;
alter table conquistas_aluno add column if not exists origem text not null default 'app' check (origem in ('app','importado'));
alter table conquistas_aluno add column if not exists vista_em timestamptz;

-- Marcar como vista: só a coluna vista_em, só nas próprias conquistas.
revoke update on conquistas_aluno from anon, authenticated;
grant update (vista_em) on conquistas_aluno to authenticated;
drop policy if exists conquistas_aluno_marca_vista on conquistas_aluno;
create policy conquistas_aluno_marca_vista on conquistas_aluno for update
  using (aluno_id = (select public.aluno_id_atual()))
  with check (aluno_id = (select public.aluno_id_atual()));

alter table eventos_chalala drop constraint if exists eventos_chalala_tipo_check;
alter table eventos_chalala add constraint eventos_chalala_tipo_check check (tipo in (
  'conclusao_vista','editor_aberto','modelo_escolhido','card_gerado','download','compartilhar_nativo','compartilhar_cancelado','visita_link',
  'vitrine_vista','explicacao_aberta','colecao_vista'
));
