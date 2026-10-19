-- ============================================================================
-- Montinho — Equipamentos adicionais da biblioteca (Migration 0011)
-- ============================================================================
-- Só adiciona valores ao enum `equipamento` (valores novos não podem ser
-- usados na mesma transação em que são criados; a 0012/0013 os usa).
-- ============================================================================

alter type equipamento add value if not exists 'barra_fixa';
alter type equipamento add value if not exists 'paralelas';
alter type equipamento add value if not exists 'anilha';
alter type equipamento add value if not exists 'barra_w';
alter type equipamento add value if not exists 'trx';
alter type equipamento add value if not exists 'bola';
alter type equipamento add value if not exists 'roda';
alter type equipamento add value if not exists 'caneleira';
