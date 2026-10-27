-- ============================================================================
-- 0105 — Pedidos do Montinho em 28/10/2026:
--  1) Troféus de cardio “Fôlego Extra” (150% dos minutos prescritos na semana)
--     e “Dobro de Fôlego” (200%): aceitos em conquistas_aluno (regras no app,
--     src/lib/cardio/regras.ts). Contam no ranking como os outros de cardio.
--  2) Protocolo livre do VISITANTE: salvar_meu_protocolo_livre() — o próprio
--     visitante, com o acesso em dia, liga/desliga o protocolo livre e grava a
--     faixa de séries por semana de cada músculo (programas.metas_volume +
--     estilo 'livre_metas', 0100). Cria o programa se ele ainda não tiver.
--     Aluno da consultoria NÃO usa: quem define é o personal.
-- ============================================================================
alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','missao_cumprida','cada_quilo_conta','terceiro_especial','voltei_pro_jogo','ponto_de_partida','olhar_de_aguia','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_5','semanas_consistentes_6','semanas_consistentes_8','semanas_consistentes_10','semanas_consistentes_12','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','protocolo_completo','desafio_concluido','treino_samurai','strava_conectado','compartilhou_primeiro','diario_de_bordo','vitrine_de_trofeus','inspiracao_galera','trouxe_amigo','criador_desafios','campeao_desafio','palavra_cumprida','desafiante_nato',
  'cardio_1','cardio_2','cardio_3','cardio_10','cardio_25','cardio_50','cardio_100','cardio_250','cardio_500','cardio_1000','cardio_uma_hora','cardio_semana_ritmo','cardio_meta_semana','cardio_4_semanas','cardio_voltei','cardio_folego_extra','cardio_dobro'));

create or replace function public.salvar_meu_protocolo_livre(p_metas jsonb, p_ligado boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aluno uuid;
  v_metas jsonb := '{}'::jsonb;
  k text; v jsonb; v_min int; v_max int;
  v_prog uuid;
begin
  if auth.uid() is null then raise exception 'não autorizado'; end if;
  select id into v_aluno from alunos where profile_id = auth.uid() and modalidade = 'visitante' and status = 'ativo';
  if v_aluno is null or not public.visitante_em_dia() then raise exception 'Só o visitante com o acesso em dia monta o próprio protocolo livre.'; end if;
  if p_metas is null or jsonb_typeof(p_metas) <> 'object' then raise exception 'metas inválidas'; end if;
  for k, v in select * from jsonb_each(p_metas) loop
    if k not in ('peito','costas','ombros','ombro_anterior','ombro_lateral','ombro_posterior','trapezio','biceps','triceps','antebraco','quadriceps','posteriores','gluteo','adutores','abdutores','panturrilha','abdomen','core','lombar') then continue; end if;
    v_min := coalesce((v->>'min')::int, 0); v_max := coalesce((v->>'max')::int, 0);
    if v_min < 0 or v_max > 60 or v_max < v_min or v_max = 0 then continue; end if;
    v_metas := v_metas || jsonb_build_object(k, jsonb_build_object('min', v_min, 'max', v_max));
  end loop;
  if p_ligado and v_metas = '{}'::jsonb then raise exception 'Coloque a faixa de séries de pelo menos um músculo.'; end if;
  select id into v_prog from programas where aluno_id = v_aluno and ativo;
  if v_prog is null then
    insert into programas (aluno_id, nome, metas_volume, estilo, ativo)
    values (v_aluno, 'Meu protocolo livre', v_metas, case when p_ligado then 'livre_metas' else 'fichas' end, true);
  else
    update programas set metas_volume = v_metas, estilo = case when p_ligado then 'livre_metas' else 'fichas' end where id = v_prog;
  end if;
end $$;
revoke all on function public.salvar_meu_protocolo_livre(jsonb, boolean) from public, anon;
grant execute on function public.salvar_meu_protocolo_livre(jsonb, boolean) to authenticated;
