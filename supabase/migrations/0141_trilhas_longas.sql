-- ============================================================================
-- 0141 — Trilhas longas (pedido do Montinho, 04/11/2026: “continuar sempre
-- motivando”, o veterano continua ganhando troféu). Só ACEITA os códigos novos:
-- treinos 75/100/150/200/300/365/500, semanas seguidas 16/20/26/39/52,
-- séries 2.000/5.000, acompanhamento 9/18/24 meses e monitoramento 52.
-- Regras no app (src/lib/conquistas/regras.ts, volume-series.ts,
-- acompanhamento.ts, monitoramento.ts); contam no ranking como os outros
-- (nenhum entra no FORA_DO_RANKING). Gravados à parte (CODIGOS_TRILHAS).
-- ============================================================================
alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','missao_cumprida','cada_quilo_conta','terceiro_especial','voltei_pro_jogo','ponto_de_partida','olhar_de_aguia','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_5','semanas_consistentes_6','semanas_consistentes_8','semanas_consistentes_10','semanas_consistentes_12','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','protocolo_completo','desafio_concluido','treino_samurai','strava_conectado','compartilhou_primeiro','diario_de_bordo','vitrine_de_trofeus','inspiracao_galera','trouxe_amigo','criador_desafios','campeao_desafio','palavra_cumprida','desafiante_nato',
  'cardio_1','cardio_2','cardio_3','cardio_10','cardio_25','cardio_50','cardio_100','cardio_250','cardio_500','cardio_1000','cardio_uma_hora','cardio_semana_ritmo','cardio_meta_semana','cardio_4_semanas','cardio_voltei','cardio_folego_extra','cardio_dobro','dois_folegos','combo_completo','dose_dupla','combo_3','combo_5','combo_7','combo_10','combo_30','series_500','series_1000',
  'acompanhamento_3_meses','acompanhamento_6_meses','acompanhamento_1_ano','retomada_30','quiz_1','quiz_10','quiz_30','quiz_50','semana_compartilhada','cards_10','cards_20','cards_30','trofeus_compartilhados_10','trofeus_compartilhados_20','trofeus_compartilhados_30','trofeus_compartilhados_50','cardio_madrugada','cardio_4h','cardio_meia_noite','cardio_10km','cardio_escada_1h',
  'mobilidade_superiores','mobilidade_inferiores','mobilidade_completa','mobilidade_7_superiores','mobilidade_7_inferiores',
  'feriado_musculacao','feriado_cardio','feriado_combo',
  'monitoramento_4','monitoramento_8','monitoramento_12','monitoramento_26',
  'semanas_completas_5','semanas_completas_10','semanas_completas_25','semanas_completas_50','semana_perfeita','semana_perfeita_5','semana_perfeita_10',
  'primeiro_wod','primeiro_benchmark','superando_recorde','primeira_hyrox','primeiro_funcional','atleta_versatil','semana_multimodalidade','evolucao_sem_fronteiras',
  'topo_ranking','topo_5_dias','topo_10_dias','topo_30_dias',
  'passou_montinho',
  'treinos_75','treinos_100','treinos_150','treinos_200','treinos_300','treinos_365','treinos_500',
  'semanas_consistentes_16','semanas_consistentes_20','semanas_consistentes_26','semanas_consistentes_39','semanas_consistentes_52',
  'series_2000','series_5000','acompanhamento_9_meses','acompanhamento_18_meses','acompanhamento_2_anos','monitoramento_52'));
