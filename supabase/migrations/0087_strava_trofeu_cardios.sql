-- ============================================================================
-- 0087 — Strava, parte 2 (pedido do Montinho em 24/10/2026):
-- • Troféu “Relógio no Pulso” (strava_conectado): conectar o Strava. A regra
--   fica no app (regras.ts); aqui o banco só passa a aceitar o código.
-- • cardios_strava: corridas, bikes, caminhadas… que o aluno registra no
--   Strava (fora do treino de musculação do app). O aluno lê/grava os dele;
--   o personal lê de todos. Não contam na meta semanal de musculação.
-- • strava_conexoes.cardios_sync_em: última busca de cardios (no máximo 1/h).
-- ============================================================================
alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','missao_cumprida','cada_quilo_conta','terceiro_especial','voltei_pro_jogo','ponto_de_partida','olhar_de_aguia','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_5','semanas_consistentes_6','semanas_consistentes_8','semanas_consistentes_10','semanas_consistentes_12','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','protocolo_completo','desafio_concluido','treino_samurai','strava_conectado'));

alter table strava_conexoes add column if not exists cardios_sync_em timestamptz;

create table if not exists cardios_strava (
  atividade_id bigint primary key,
  aluno_id uuid not null references alunos(id) on delete cascade,
  tipo text not null,
  nome text,
  inicio timestamptz not null,
  duracao_seg integer not null check (duracao_seg >= 0),
  distancia_m integer,
  fc_media numeric(5,1),
  fc_max numeric(5,1),
  elevacao_m integer,
  importado_em timestamptz not null default now()
);
create index if not exists cardios_strava_aluno on cardios_strava (aluno_id, inicio desc);
alter table cardios_strava enable row level security;
drop policy if exists cardios_aluno on cardios_strava;
create policy cardios_aluno on cardios_strava for all
  using (aluno_id = (select public.aluno_id_atual()))
  with check (aluno_id = (select public.aluno_id_atual()));
drop policy if exists cardios_treinador_le on cardios_strava;
create policy cardios_treinador_le on cardios_strava for select using ((select public.is_treinador()));
