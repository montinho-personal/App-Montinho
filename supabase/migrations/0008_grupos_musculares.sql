-- ============================================================================
-- Montinho Personal Trainer — Grupos musculares separados (Migration 0008)
-- ============================================================================
-- Separa quadríceps, posteriores de coxa, glúteos e panturrilhas e prepara a
-- subdivisão de ombro. O valor legado 'pernas' CONTINUA existindo para não
-- perder dados antigos: a aplicação mostra "a classificar" até revisão.
--
-- IMPORTANTE: valores novos de enum não podem ser USADOS na mesma transação
-- em que foram criados (regra do PostgreSQL). Por isso esta migration só
-- adiciona valores; a 0009 usa esses valores.
-- ============================================================================

alter type grupo_muscular add value if not exists 'quadriceps';
alter type grupo_muscular add value if not exists 'posteriores';
alter type grupo_muscular add value if not exists 'adutores';
alter type grupo_muscular add value if not exists 'abdutores';
alter type grupo_muscular add value if not exists 'ombro_anterior';
alter type grupo_muscular add value if not exists 'ombro_lateral';
alter type grupo_muscular add value if not exists 'ombro_posterior';
alter type grupo_muscular add value if not exists 'trapezio';
alter type grupo_muscular add value if not exists 'lombar';
alter type grupo_muscular add value if not exists 'nao_classificado';

-- Programas com mais de 5 dias (ex.: PPL 6x, ABCDEF).
alter type treino_letra add value if not exists 'F';
alter type treino_letra add value if not exists 'G';
alter type treino_letra add value if not exists 'H';
