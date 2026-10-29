-- 0123 — Missão de Hoje (Fase 1, 29/10/2026): 2 tipos de evento interno para
-- medir, de forma agregada e sem dado pessoal fora do app, quem VIU a missão no
-- Início e quem TOCOU no botão dela (também de quem não aceitou os cookies do
-- GA4). `modelo` guarda só a variante (normal|primeiro|retomada|descanso|pausa).
-- Aditiva: mesmos tipos de antes + os 2 novos.
alter table eventos_chalala drop constraint if exists eventos_chalala_tipo_check;
alter table eventos_chalala add constraint eventos_chalala_tipo_check check (tipo in ('conclusao_vista','editor_aberto','modelo_escolhido','card_gerado','download','compartilhar_nativo','compartilhar_cancelado','visita_link','vitrine_vista','explicacao_aberta','colecao_vista','conhecimento_aberto','quiz_respondido','sugestao_vista','sugestao_aberta','descoberta_salva','descoberta_compartilhada','chalala_workout_started','chalala_progression_shown','chalala_reps_evolution_shown','chalala_record_unlocked','chalala_advanced_technique_shown','chalala_workout_completed','chalala_push_permission_granted','chalala_push_permission_revoked','chalala_vai_que_ta_facil','missao_vista','missao_clicada'));
