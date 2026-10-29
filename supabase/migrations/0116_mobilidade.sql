-- ============================================================================
-- 0116 — Mobilidade e alongamento (pedido do Montinho em 29/10/2026).
-- Dois protocolos (superiores e inferiores, vídeos do canal; conteúdo em
-- src/lib/mobilidade/protocolos.ts). SÓ VALE COMEÇADO NO APP: o início e o fim
-- são gravados pelo SERVIDOR (o celular nunca escolhe a hora), e concluir
-- exige pelo menos 10 minutos depois do “Começar” (o protocolo tem ~22 min).
--   • mobilidade_sessoes: o aluno cria a própria (hora do servidor) e só
--     conclui/cancela pelas funções abaixo; o personal lê todas.
--   • troféus novos aceitos: mobilidade_superiores, mobilidade_inferiores,
--     mobilidade_completa, mobilidade_7_superiores, mobilidade_7_inferiores.
-- Idempotente.
-- ============================================================================
alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','missao_cumprida','cada_quilo_conta','terceiro_especial','voltei_pro_jogo','ponto_de_partida','olhar_de_aguia','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_5','semanas_consistentes_6','semanas_consistentes_8','semanas_consistentes_10','semanas_consistentes_12','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','protocolo_completo','desafio_concluido','treino_samurai','strava_conectado','compartilhou_primeiro','diario_de_bordo','vitrine_de_trofeus','inspiracao_galera','trouxe_amigo','criador_desafios','campeao_desafio','palavra_cumprida','desafiante_nato',
  'cardio_1','cardio_2','cardio_3','cardio_10','cardio_25','cardio_50','cardio_100','cardio_250','cardio_500','cardio_1000','cardio_uma_hora','cardio_semana_ritmo','cardio_meta_semana','cardio_4_semanas','cardio_voltei','cardio_folego_extra','cardio_dobro','dois_folegos','combo_completo','dose_dupla','combo_3','combo_5','combo_7','combo_10','combo_30','series_500','series_1000',
  'acompanhamento_3_meses','acompanhamento_6_meses','acompanhamento_1_ano','retomada_30','quiz_1','quiz_10','quiz_30','quiz_50','semana_compartilhada','cards_10','cards_20','cards_30','trofeus_compartilhados_10','trofeus_compartilhados_20','trofeus_compartilhados_30','trofeus_compartilhados_50','cardio_madrugada','cardio_4h','cardio_meia_noite','cardio_10km','cardio_escada_1h',
  'mobilidade_superiores','mobilidade_inferiores','mobilidade_completa','mobilidade_7_superiores','mobilidade_7_inferiores'));

create table if not exists mobilidade_sessoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  protocolo text not null check (protocolo in ('superiores','inferiores')),
  status text not null default 'em_andamento' check (status in ('em_andamento','concluida','cancelada')),
  iniciado_em timestamptz not null default now(),
  concluido_em timestamptz,
  nota_antes smallint check (nota_antes is null or nota_antes between 0 and 10),
  nota_depois smallint check (nota_depois is null or nota_depois between 0 and 10),
  exercicios_feitos smallint check (exercicios_feitos is null or exercicios_feitos between 0 and 50),
  created_at timestamptz not null default now()
);
create index if not exists mobilidade_sessoes_aluno on mobilidade_sessoes (aluno_id, iniciado_em desc);
alter table mobilidade_sessoes enable row level security;

-- Ao criar: hora do servidor, sempre “em andamento”, sem fim.
create or replace function public.mobilidade_inicio_servidor()
returns trigger language plpgsql set search_path = public as $$
begin
  new.iniciado_em := now();
  new.created_at := now();
  new.status := 'em_andamento';
  new.concluido_em := null;
  new.nota_depois := null;
  new.exercicios_feitos := null;
  return new;
end $$;
drop trigger if exists trg_mobilidade_inicio on mobilidade_sessoes;
create trigger trg_mobilidade_inicio before insert on mobilidade_sessoes for each row execute function public.mobilidade_inicio_servidor();

drop policy if exists mob_treinador_le on mobilidade_sessoes;
create policy mob_treinador_le on mobilidade_sessoes for select using ((select public.is_treinador()));
drop policy if exists mob_aluno_le on mobilidade_sessoes;
create policy mob_aluno_le on mobilidade_sessoes for select using (aluno_id = (select public.aluno_id_atual()));
drop policy if exists mob_aluno_cria on mobilidade_sessoes;
create policy mob_aluno_cria on mobilidade_sessoes for insert with check (aluno_id = (select public.aluno_id_atual()));
-- Sem UPDATE/DELETE direto: concluir e cancelar só pelas funções.
revoke update, delete on mobilidade_sessoes from anon, authenticated;

-- Concluir: só a própria sessão em andamento, 10+ min depois do começo (até 6 h).
create or replace function public.concluir_mobilidade(p_id uuid, p_nota_depois smallint, p_feitos smallint)
returns mobilidade_sessoes language plpgsql security definer set search_path = public as $$
declare v mobilidade_sessoes; v_min numeric;
begin
  select * into v from mobilidade_sessoes where id = p_id and aluno_id = public.aluno_id_atual() for update;
  if v.id is null then raise exception 'mobilidade: sessão não encontrada'; end if;
  if v.status <> 'em_andamento' then return v; end if;
  v_min := extract(epoch from (now() - v.iniciado_em)) / 60;
  if v_min < 10 then raise exception 'mobilidade: cedo demais (% min)', ceil(10 - v_min); end if;
  if v_min > 360 then raise exception 'mobilidade: sessão expirada'; end if;
  update mobilidade_sessoes
     set status = 'concluida', concluido_em = now(),
         nota_depois = case when p_nota_depois between 0 and 10 then p_nota_depois end,
         exercicios_feitos = case when p_feitos between 0 and 50 then p_feitos end
   where id = p_id
   returning * into v;
  return v;
end $$;
revoke all on function public.concluir_mobilidade(uuid, smallint, smallint) from public, anon;
grant execute on function public.concluir_mobilidade(uuid, smallint, smallint) to authenticated;

create or replace function public.cancelar_mobilidade(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update mobilidade_sessoes set status = 'cancelada'
   where id = p_id and aluno_id = public.aluno_id_atual() and status = 'em_andamento';
$$;
revoke all on function public.cancelar_mobilidade(uuid) from public, anon;
grant execute on function public.cancelar_mobilidade(uuid) to authenticated;
