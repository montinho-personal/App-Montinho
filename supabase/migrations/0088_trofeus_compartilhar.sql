-- ============================================================================
-- 0088 — Troféus de compartilhamento (aprovados pelo Montinho em 24/10/2026):
-- 📣 Espalhando o Chalalá, 📸 Diário de Bordo, 🏆 Vitrine de Troféus,
-- 🔥 Inspiração da Galera e 🤝 Trouxe um Amigo. As regras ficam no app
-- (src/lib/conquistas/compartilhar.ts); aqui o banco aceita os códigos e o
-- aluno lê só os PRÓPRIOS eventos de compartilhamento + as visitas ao link
-- dele (código opaco c:<12 hex> = md5(aluno_id || ':chalala'), sem revelar
-- quem visitou).
-- ============================================================================
alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','missao_cumprida','cada_quilo_conta','terceiro_especial','voltei_pro_jogo','ponto_de_partida','olhar_de_aguia','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_5','semanas_consistentes_6','semanas_consistentes_8','semanas_consistentes_10','semanas_consistentes_12','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','protocolo_completo','desafio_concluido','treino_samurai','strava_conectado','compartilhou_primeiro','diario_de_bordo','vitrine_de_trofeus','inspiracao_galera','trouxe_amigo'));

create or replace function public.meus_eventos_compartilhar()
returns table (tipo text, origem text, modelo text, ref text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select e.tipo, e.origem, e.modelo, e.ref, e.created_at
    from eventos_chalala e
   where public.aluno_id_atual() is not null
     and e.aluno_id = public.aluno_id_atual()
     and e.tipo in ('compartilhar_nativo', 'download', 'descoberta_compartilhada')
  union all
  select e.tipo, null, null, e.ref, e.created_at
    from eventos_chalala e
   where public.aluno_id_atual() is not null
     and e.tipo = 'visita_link'
     and e.ref = 'c:' || substr(md5(public.aluno_id_atual()::text || ':chalala'), 1, 12)
  order by 5
  limit 2000
$$;
revoke all on function public.meus_eventos_compartilhar() from public, anon;
grant execute on function public.meus_eventos_compartilhar() to authenticated;
