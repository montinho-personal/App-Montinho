-- ============================================================================
-- 0084 — Troféu “Treino do Samurai” (pedido do Montinho em 23/10/2026): treino
-- de musculação começado entre 3h00 e 4h30 da manhã (horário de Brasília),
-- concluído e com séries. A regra fica no app (src/lib/conquistas/regras.ts,
-- LIMITES_SAMURAI), pelo horário em que a sessão começou (servidor). Aqui só
-- o banco passa a aceitar o código. Conta no ranking como os outros troféus.
-- ============================================================================
alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','missao_cumprida','cada_quilo_conta','terceiro_especial','voltei_pro_jogo','ponto_de_partida','olhar_de_aguia','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_5','semanas_consistentes_6','semanas_consistentes_8','semanas_consistentes_10','semanas_consistentes_12','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','protocolo_completo','desafio_concluido','treino_samurai'));
