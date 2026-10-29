-- 0121 — Troféus de feriado (pedido do Montinho, 29/10/2026).
-- Musculação e cardio no feriado ganham troféus separados com o NOME do
-- feriado (“Finados Pago”, “Finados de Fôlego”) e +1 se fizer os dois
-- (“Finados Completo”). Repetem a cada feriado: referência = '<feriado>:<ano>'.
-- Regras no app: src/lib/conquistas/feriados.ts. Aqui: códigos aceitos,
-- calendário (para o aviso no celular) e o aviso do dia (categoria 'feriado').

-- Parte 1: códigos aceitos.
alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','missao_cumprida','cada_quilo_conta','terceiro_especial','voltei_pro_jogo','ponto_de_partida','olhar_de_aguia','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_5','semanas_consistentes_6','semanas_consistentes_8','semanas_consistentes_10','semanas_consistentes_12','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','protocolo_completo','desafio_concluido','treino_samurai','strava_conectado','compartilhou_primeiro','diario_de_bordo','vitrine_de_trofeus','inspiracao_galera','trouxe_amigo','criador_desafios','campeao_desafio','palavra_cumprida','desafiante_nato',
  'cardio_1','cardio_2','cardio_3','cardio_10','cardio_25','cardio_50','cardio_100','cardio_250','cardio_500','cardio_1000','cardio_uma_hora','cardio_semana_ritmo','cardio_meta_semana','cardio_4_semanas','cardio_voltei','cardio_folego_extra','cardio_dobro','dois_folegos','combo_completo','dose_dupla','combo_3','combo_5','combo_7','combo_10','combo_30','series_500','series_1000',
  'acompanhamento_3_meses','acompanhamento_6_meses','acompanhamento_1_ano','retomada_30','quiz_1','quiz_10','quiz_30','quiz_50','semana_compartilhada','cards_10','cards_20','cards_30','trofeus_compartilhados_10','trofeus_compartilhados_20','trofeus_compartilhados_30','trofeus_compartilhados_50','cardio_madrugada','cardio_4h','cardio_meia_noite','cardio_10km','cardio_escada_1h',
  'mobilidade_superiores','mobilidade_inferiores','mobilidade_completa','mobilidade_7_superiores','mobilidade_7_inferiores',
  'feriado_musculacao','feriado_cardio','feriado_combo'));

-- Parte 2: calendário (espelho de feriadosDoAno; Carnaval = segunda e terça).
create table if not exists feriados (
  data date primary key,
  slug text not null,
  nome text not null,
  emoji text not null
);
alter table feriados enable row level security;
drop policy if exists feriados_ler on feriados;
create policy feriados_ler on feriados for select to authenticated using (true);
grant select on feriados to authenticated;
insert into feriados (data, slug, nome, emoji) values
('2026-11-02','finados','Finados','🕯️'),
  ('2026-11-15','republica','Proclamação da República','🏛️'),
  ('2026-11-20','consciencia_negra','Consciência Negra','✊🏿'),
  ('2026-12-25','natal','Natal','🎄'),
  ('2027-01-01','ano_novo','Ano Novo','🎆'),
  ('2027-02-08','carnaval','Carnaval','🎭'),
  ('2027-02-09','carnaval','Carnaval','🎭'),
  ('2027-03-26','sexta_santa','Sexta-feira Santa','🕊️'),
  ('2027-04-21','tiradentes','Tiradentes','🇧🇷'),
  ('2027-05-01','dia_do_trabalho','Dia do Trabalho','🛠️'),
  ('2027-05-27','corpus_christi','Corpus Christi','⛪'),
  ('2027-09-07','independencia','Independência','🇧🇷'),
  ('2027-10-12','aparecida','Nossa Senhora Aparecida','🙏'),
  ('2027-11-02','finados','Finados','🕯️'),
  ('2027-11-15','republica','Proclamação da República','🏛️'),
  ('2027-11-20','consciencia_negra','Consciência Negra','✊🏿'),
  ('2027-12-25','natal','Natal','🎄'),
  ('2028-01-01','ano_novo','Ano Novo','🎆'),
  ('2028-02-28','carnaval','Carnaval','🎭'),
  ('2028-02-29','carnaval','Carnaval','🎭'),
  ('2028-04-14','sexta_santa','Sexta-feira Santa','🕊️'),
  ('2028-04-21','tiradentes','Tiradentes','🇧🇷'),
  ('2028-05-01','dia_do_trabalho','Dia do Trabalho','🛠️'),
  ('2028-06-15','corpus_christi','Corpus Christi','⛪'),
  ('2028-09-07','independencia','Independência','🇧🇷'),
  ('2028-10-12','aparecida','Nossa Senhora Aparecida','🙏'),
  ('2028-11-02','finados','Finados','🕯️'),
  ('2028-11-15','republica','Proclamação da República','🏛️'),
  ('2028-11-20','consciencia_negra','Consciência Negra','✊🏿'),
  ('2028-12-25','natal','Natal','🎄'),
  ('2029-01-01','ano_novo','Ano Novo','🎆'),
  ('2029-02-12','carnaval','Carnaval','🎭'),
  ('2029-02-13','carnaval','Carnaval','🎭'),
  ('2029-03-30','sexta_santa','Sexta-feira Santa','🕊️'),
  ('2029-04-21','tiradentes','Tiradentes','🇧🇷'),
  ('2029-05-01','dia_do_trabalho','Dia do Trabalho','🛠️'),
  ('2029-05-31','corpus_christi','Corpus Christi','⛪'),
  ('2029-09-07','independencia','Independência','🇧🇷'),
  ('2029-10-12','aparecida','Nossa Senhora Aparecida','🙏'),
  ('2029-11-02','finados','Finados','🕯️'),
  ('2029-11-15','republica','Proclamação da República','🏛️'),
  ('2029-11-20','consciencia_negra','Consciência Negra','✊🏿'),
  ('2029-12-25','natal','Natal','🎄'),
  ('2030-01-01','ano_novo','Ano Novo','🎆'),
  ('2030-03-04','carnaval','Carnaval','🎭'),
  ('2030-03-05','carnaval','Carnaval','🎭'),
  ('2030-04-19','sexta_santa','Sexta-feira Santa','🕊️'),
  ('2030-04-21','tiradentes','Tiradentes','🇧🇷'),
  ('2030-05-01','dia_do_trabalho','Dia do Trabalho','🛠️'),
  ('2030-06-20','corpus_christi','Corpus Christi','⛪'),
  ('2030-09-07','independencia','Independência','🇧🇷'),
  ('2030-10-12','aparecida','Nossa Senhora Aparecida','🙏'),
  ('2030-11-02','finados','Finados','🕯️'),
  ('2030-11-15','republica','Proclamação da República','🏛️'),
  ('2030-11-20','consciencia_negra','Consciência Negra','✊🏿'),
  ('2030-12-25','natal','Natal','🎄')
on conflict (data) do nothing;

-- Parte 3: categoria do aviso no celular.
alter table notificacoes_envios drop constraint if exists notificacoes_envios_categoria_check;
alter table notificacoes_envios add constraint notificacoes_envios_categoria_check check (categoria in ('bom_dia', 'pos_treino', 'teste', 'desafio', 'cardio', 'mobilidade', 'feriado'));

-- Parte 4: aviso do feriado — no dia, 8h–11h59 no fuso da pessoa, 1 por pessoa
-- por feriado, aluno ativo (visitante só em dia), com push ligado, motivacionais
-- e chave geral, fora do silêncio, sem treino em andamento, 3 h longe de outra
-- notificação. Leva os troféus que a pessoa já ganhou neste feriado.
create or replace function public.feriado_notificacoes_devidas(p_chave text)
returns table (envio_id uuid, dados jsonb, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare
  cfg notificacao_config%rowtype;
  ids uuid[];
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  select * into cfg from notificacao_config where id = 1;
  update notificacoes_envios e set status = 'descartada', motivo = 'expirada' where e.categoria = 'feriado' and e.status = 'pendente' and e.expira_em < now();
  if not coalesce(cfg.chalala_ativo, false) then return; end if;

  with base as (
    select a.id as aluno_id, a.profile_id, a.modalidade as tipo_aluno,
           coalesce(np.fuso, 'America/Sao_Paulo') as fuso,
           coalesce(np.motivacionais, true) as motivacionais,
           split_part(coalesce(nullif(btrim(p.nome), ''), ''), ' ', 1) as primeiro_nome
      from alunos a
      join profiles p on p.id = a.profile_id
      left join notificacao_preferencias np on np.profile_id = a.profile_id
     where a.status = 'ativo'
       and exists (select 1 from push_inscricoes d where d.profile_id = a.profile_id and d.ativo)
  ),
  devidos as (
    select b.*, f.slug, f.nome as feriado, f.emoji, f.data as dia
      from base b
      join feriados f on f.data = (now() at time zone b.fuso)::date
     where b.motivacionais
       and extract(hour from (now() at time zone b.fuso)) between 8 and 11
       and (b.tipo_aluno <> 'visitante' or exists (select 1 from acessos_visitante v where v.aluno_id = b.aluno_id and (v.fim is null or v.fim > now())))
       and not exists (select 1 from training_sessions t where t.aluno_id = b.aluno_id and t.status = 'em_andamento')
       and not exists (select 1 from notificacoes_envios e where e.profile_id = b.profile_id
             and e.status in ('enviada', 'enviando') and e.tentativa_em > now() - interval '3 hours')
       and not public.em_silencio((now() at time zone b.fuso)::time,
             coalesce((select np.silencio_inicio from notificacao_preferencias np where np.profile_id = b.profile_id), '22:00'),
             coalesce((select np.silencio_fim from notificacao_preferencias np where np.profile_id = b.profile_id), '05:00'))
  )
  insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
  select d.profile_id, 'feriado', 'feriado:' || d.aluno_id || ':' || d.slug || ':' || extract(year from d.dia), now(), now() + interval '4 hours',
         jsonb_build_object(
           'nome', d.primeiro_nome, 'feriado', d.feriado, 'slug', d.slug, 'emoji', d.emoji,
           'ganhos', (select coalesce(jsonb_agg(c.codigo), '[]'::jsonb) from conquistas_aluno c
                       where c.aluno_id = d.aluno_id and c.codigo like 'feriado%' and c.referencia = d.slug || ':' || extract(year from d.dia)))
    from devidos d
  on conflict (dedupe) do nothing;

  select array_agg(e.id) into ids
    from notificacoes_envios e
   where e.categoria = 'feriado' and e.status = 'pendente' and e.agendada_para <= now();
  if ids is null then return; end if;
  update notificacoes_envios e set status = 'enviando', tentativa_em = now() where e.id = any(ids) and e.status = 'pendente';
  return query
  select e.id, e.dados, d.endpoint, d.p256dh, d.auth
    from notificacoes_envios e join push_inscricoes d on d.profile_id = e.profile_id and d.ativo
   where e.id = any(ids) and e.status = 'enviando';
end $$;
revoke all on function public.feriado_notificacoes_devidas(text) from public, authenticated;
grant execute on function public.feriado_notificacoes_devidas(text) to anon;
