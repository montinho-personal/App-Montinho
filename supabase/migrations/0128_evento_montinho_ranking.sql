-- 0128 — “Você sabia?” do Montinho no Ranking (pedido do Montinho, 30/10/2026:
-- “quero que isso seja rastreável”): evento interno `montinho_ranking_aberto`
-- (toque em “Ver 👀”), gravado pelo próprio aluno como os outros eventos;
-- o personal vê quem tocou em /treinador/ranking. Aditiva: mesmos tipos + 1.
alter table eventos_chalala drop constraint if exists eventos_chalala_tipo_check;
alter table eventos_chalala add constraint eventos_chalala_tipo_check check (tipo in ('conclusao_vista','editor_aberto','modelo_escolhido','card_gerado','download','compartilhar_nativo','compartilhar_cancelado','visita_link','vitrine_vista','explicacao_aberta','colecao_vista','conhecimento_aberto','quiz_respondido','sugestao_vista','sugestao_aberta','descoberta_salva','descoberta_compartilhada','chalala_workout_started','chalala_progression_shown','chalala_reps_evolution_shown','chalala_record_unlocked','chalala_advanced_technique_shown','chalala_workout_completed','chalala_push_permission_granted','chalala_push_permission_revoked','chalala_vai_que_ta_facil','missao_vista','missao_clicada','montinho_ranking_aberto'));
