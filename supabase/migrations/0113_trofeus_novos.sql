-- ============================================================================
-- 0113 — Troféus novos (pedido do Montinho em 29/10/2026). Regras no app:
--   • Acompanhamento: acompanhamento_3_meses / _6_meses / _1_ano (meses de
--     30 dias desde o 1º treino no app, com treino em cada um);
--   • Retomada: retomada_30 (voltou depois de 30+ dias; repete; fora do ranking);
--   • Autoconhecimento: quiz_1, quiz_10, quiz_30, quiz_50 (respostas certas);
--   • Compartilhar: semana_compartilhada (semana 100% com o card de cada treino
--     compartilhado), cards_10/20/30, trofeus_compartilhados_10/20/30/50;
--   • Cardio: cardio_madrugada (antes das 5h), cardio_4h (até 4h00),
--     cardio_meia_noite (depois da meia-noite), cardio_10km, cardio_escada_1h.
-- Os de horário só valem com o cardio COMEÇADO no app: o cronômetro grava o
-- início em cardio_inicios com a hora do SERVIDOR (o celular não escolhe), e o
-- registro do cardio leva esse início (cardio_registros.iniciado_em, preenchido
-- pelo banco a partir do inicio_id — nunca pelo aplicativo). Idempotente.
-- ============================================================================
alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','missao_cumprida','cada_quilo_conta','terceiro_especial','voltei_pro_jogo','ponto_de_partida','olhar_de_aguia','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_5','semanas_consistentes_6','semanas_consistentes_8','semanas_consistentes_10','semanas_consistentes_12','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','protocolo_completo','desafio_concluido','treino_samurai','strava_conectado','compartilhou_primeiro','diario_de_bordo','vitrine_de_trofeus','inspiracao_galera','trouxe_amigo','criador_desafios','campeao_desafio','palavra_cumprida','desafiante_nato',
  'cardio_1','cardio_2','cardio_3','cardio_10','cardio_25','cardio_50','cardio_100','cardio_250','cardio_500','cardio_1000','cardio_uma_hora','cardio_semana_ritmo','cardio_meta_semana','cardio_4_semanas','cardio_voltei','cardio_folego_extra','cardio_dobro','dois_folegos','combo_completo','dose_dupla','combo_3','combo_5','combo_7','combo_10','combo_30','series_500','series_1000',
  'acompanhamento_3_meses','acompanhamento_6_meses','acompanhamento_1_ano','retomada_30','quiz_1','quiz_10','quiz_30','quiz_50','semana_compartilhada','cards_10','cards_20','cards_30','trofeus_compartilhados_10','trofeus_compartilhados_20','trofeus_compartilhados_30','trofeus_compartilhados_50','cardio_madrugada','cardio_4h','cardio_meia_noite','cardio_10km','cardio_escada_1h'));

-- Início do cardio no app ---------------------------------------------------
create table if not exists cardio_inicios (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  modalidade text,
  iniciado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists cardio_inicios_aluno on cardio_inicios (aluno_id, iniciado_em desc);
alter table cardio_inicios enable row level security;

-- A hora é sempre a do servidor e não muda depois.
create or replace function public.cardio_inicio_hora_servidor()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.iniciado_em := now();
    new.created_at := now();
  else
    new.iniciado_em := old.iniciado_em;
    new.aluno_id := old.aluno_id;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists trg_cardio_inicio_hora on cardio_inicios;
create trigger trg_cardio_inicio_hora before insert or update on cardio_inicios for each row execute function public.cardio_inicio_hora_servidor();

drop policy if exists cardio_ini_treinador on cardio_inicios;
create policy cardio_ini_treinador on cardio_inicios for select using ((select public.is_treinador()));
drop policy if exists cardio_ini_aluno_le on cardio_inicios;
create policy cardio_ini_aluno_le on cardio_inicios for select using (aluno_id = (select public.aluno_id_atual()));
drop policy if exists cardio_ini_aluno_grava on cardio_inicios;
create policy cardio_ini_aluno_grava on cardio_inicios for insert with check (aluno_id = (select public.aluno_id_atual()));
-- Sem UPDATE/DELETE: o início fica como foi gravado.

alter table cardio_registros add column if not exists inicio_id uuid references cardio_inicios(id) on delete set null;
alter table cardio_registros add column if not exists iniciado_em timestamptz;
create unique index if not exists cardio_registros_inicio_unico on cardio_registros (inicio_id) where inicio_id is not null;

-- iniciado_em vem SEMPRE do início gravado (do mesmo aluno, até 6 h antes do
-- registro); sem início válido, fica vazio. Na correção, o início não muda.
create or replace function public.cardio_registro_inicio()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ini timestamptz;
begin
  if tg_op = 'UPDATE' then
    new.inicio_id := old.inicio_id;
    new.iniciado_em := old.iniciado_em;
    return new;
  end if;
  new.iniciado_em := null;
  if new.inicio_id is not null then
    select i.iniciado_em into v_ini from cardio_inicios i
     where i.id = new.inicio_id and i.aluno_id = new.aluno_id and i.iniciado_em <= now() and i.iniciado_em > now() - interval '6 hours';
    if v_ini is null then
      new.inicio_id := null;
    else
      new.iniciado_em := v_ini;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.cardio_registro_inicio() from public, anon, authenticated;
drop trigger if exists trg_cardio_registro_inicio on cardio_registros;
create trigger trg_cardio_registro_inicio before insert or update on cardio_registros for each row execute function public.cardio_registro_inicio();

-- Ranking: retomada_30 fica fora, como o eu_voltei ---------------------------
create or replace function public.ranking_trofeus_v2()
returns table (posicao int, nome text, trofeus int, eu boolean, visitante boolean, aderencia_semana int, mesmo_total_acima boolean)
language sql
stable
security definer
set search_path = public
as $$
  with quem as (
    select public.is_treinador() as treinador, (select id from alunos where profile_id = auth.uid()) as meu
  ),
  contagem as (
    select k.aluno_id, count(*)::int as n, max(k.primeira) as chegou_em
    from (
      select c.aluno_id, c.codigo, min(c.conquistado_em) as primeira
      from conquistas_aluno c
      where c.codigo not in ('recorde', 'eu_voltei', 'desafio_concluido', 'cardio_voltei', 'cardio_500', 'cardio_1000', 'retomada_30')
      group by c.aluno_id, c.codigo
    ) k
    group by k.aluno_id
  ),
  base as (
    select a.id, a.modalidade, coalesce(nullif(btrim(p.nome), ''), 'Aluno') as nome_completo, k.n, k.chegou_em,
           d.pct_semana, coalesce(d.carimbos, 0) as carimbos, coalesce(d.semanas_seguidas, 0) as seguidas, d.pct_4sem
    from alunos a
    join contagem k on k.aluno_id = a.id
    left join profiles p on p.id = a.profile_id
    left join ranking_desempate d on d.aluno_id = a.id
    cross join quem
    where auth.uid() is not null
      and (quem.treinador or quem.meu is not null)
      and a.status = 'ativo'
      and k.n > 0
      and (a.ranking_visivel or a.id = quem.meu or quem.treinador)
  ),
  ordenado as (
    select b.*,
           rank() over (order by b.n desc, coalesce(b.pct_semana, -1) desc, b.carimbos desc, b.seguidas desc, coalesce(b.pct_4sem, -1) desc, b.chegou_em asc) as pos,
           lag(b.n) over (order by b.n desc, coalesce(b.pct_semana, -1) desc, b.carimbos desc, b.seguidas desc, coalesce(b.pct_4sem, -1) desc, b.chegou_em asc) as n_acima
    from base b
  )
  select o.pos::int,
         case when (select treinador from quem) then o.nome_completo
              else split_part(o.nome_completo, ' ', 1)
                   || coalesce(' ' || nullif(left(regexp_replace(o.nome_completo, '^.*\s', ''), 1), left(split_part(o.nome_completo, ' ', 1), 1)) || '.', '')
         end,
         o.n,
         o.id = (select meu from quem),
         o.modalidade = 'visitante',
         case when (select treinador from quem) or o.id = (select meu from quem) then o.pct_semana::int end,
         coalesce(o.n_acima = o.n, false)
  from ordenado o
  order by 1, 2;
$$;
revoke all on function public.ranking_trofeus_v2() from public, anon;
grant execute on function public.ranking_trofeus_v2() to authenticated;
