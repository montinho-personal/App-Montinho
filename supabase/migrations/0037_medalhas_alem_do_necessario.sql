-- 0037 — Medalhas “Além do necessário”: treino curto (fiz_o_necessario,
-- nunca_deixei_pra_depois), treinos extras (fui_alem, milha_extra,
-- sempre_um_a_mais) e séries extras (uma_a_mais). Só amplia a lista de códigos.
alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_8','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais'));
