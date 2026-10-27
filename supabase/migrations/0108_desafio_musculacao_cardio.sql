-- ============================================================================
-- 0108 — Desafios: escolher o que conta (pedido do Montinho em 28/10/2026).
-- Nos desafios de contar treinos (mais_treinos, corrida, meta_fixa, semanas,
-- dupla) o criador escolhe: só musculação (padrão, como antes), só cardio,
-- ou os dois (o dia vale até 2: 1 musculação + 1 cardio). A conta é feita no
-- app (src/lib/desafios/regras.ts); aqui só a coluna e os cardios no placar.
-- Cardio = registro de 10+ min (não “não realizado”, não removido), extra de
-- cardio concluído ou atividade do Strava de 10+ min. Idempotente.
-- ============================================================================
alter table desafios add column if not exists atividades text not null default 'musculacao';
alter table desafios drop constraint if exists desafios_atividades_check;
alter table desafios add constraint desafios_atividades_check check (atividades in ('musculacao', 'cardio', 'ambos'));

-- Mudou o formato da resposta (coluna cardios): recria a função.
drop function if exists public.dados_desafio(uuid);
create function public.dados_desafio(p_desafio uuid)
returns table (aluno_id uuid, nome text, status text, eu boolean, criador boolean, treinos timestamptz[], series jsonb, recordes timestamptz[], cardios timestamptz[])
language sql stable security definer set search_path = public as $$
  with d as (
    select x.*, (x.inicio::timestamp at time zone 'America/Sao_Paulo') as ini_ts, ((x.fim + 1)::timestamp at time zone 'America/Sao_Paulo') as fim_ts,
           ((x.inicio - case when x.tipo = 'evolucao' then 28 else 0 end)::timestamp at time zone 'America/Sao_Paulo') as base_ts
      from desafios x where x.id = p_desafio and (public.is_treinador() or public.participa_do_desafio(x.id))
  )
  select dp.aluno_id,
         case when public.is_treinador() then coalesce(p.nome, 'Aluno') else public.nome_curto(p.nome) end,
         dp.status, dp.aluno_id = public.aluno_id_atual(), dp.aluno_id = d.criador_aluno_id,
         coalesce((select array_agg(s.iniciado_em order by s.iniciado_em) from training_sessions s
                    where s.aluno_id = dp.aluno_id and s.status = 'concluida' and s.series_concluidas > 0
                      and s.iniciado_em >= d.ini_ts and s.iniciado_em < d.fim_ts), '{}'),
         case when d.tipo in ('volume', 'evolucao', 'musculo', 'treino_desafio') then
           coalesce((select jsonb_agg(jsonb_build_object('em', s.iniciado_em, 'b', se.biblioteca_id, 'g', se.grupo_muscular, 'c', ss.carga_kg, 'r', ss.reps))
                       from training_sessions s join session_exercises se on se.session_id = s.id join session_sets ss on ss.session_exercise_id = se.id
                      where s.aluno_id = dp.aluno_id and s.status = 'concluida'
                        and s.iniciado_em >= d.base_ts and s.iniciado_em < d.fim_ts
                        and ss.tipo in ('valida', 'dropset', 'rest_pause', 'cluster')), '[]'::jsonb)
         else '[]'::jsonb end,
         case when d.tipo = 'recordes' then
           coalesce((select array_agg(c.conquistado_em) from conquistas_aluno c
                      where c.aluno_id = dp.aluno_id and c.codigo = 'recorde' and c.conquistado_em >= d.ini_ts and c.conquistado_em < d.fim_ts), '{}')
         else '{}'::timestamptz[] end,
         case when d.atividades in ('cardio', 'ambos') then
           coalesce((select array_agg(x.em order by x.em) from (
               select r.realizado_em as em from cardio_registros r
                where r.aluno_id = dp.aluno_id and r.removido_em is null and r.status <> 'nao_realizado' and r.duracao_min >= 10
                  and r.realizado_em >= d.ini_ts and r.realizado_em < d.fim_ts
               union all
               select s.iniciado_em from training_sessions s
                where s.aluno_id = dp.aluno_id and s.modo = 'extra' and s.status = 'concluida'
                  and coalesce(s.snapshot->'extra'->>'modalidade', '') like 'cardio%'
                  and s.iniciado_em >= d.ini_ts and s.iniciado_em < d.fim_ts
               union all
               select cs.inicio from cardios_strava cs
                where cs.aluno_id = dp.aluno_id and cs.duracao_seg >= 600
                  and cs.inicio >= d.ini_ts and cs.inicio < d.fim_ts
             ) x), '{}')
         else '{}'::timestamptz[] end
    from d join desafio_participantes dp on dp.desafio_id = d.id
    join alunos a on a.id = dp.aluno_id left join profiles p on p.id = a.profile_id;
$$;
revoke all on function public.dados_desafio(uuid) from public, anon;
grant execute on function public.dados_desafio(uuid) to authenticated;
