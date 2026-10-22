-- ============================================================================
-- 0061 — Modo Visitante, fase 9 (testes): ajustes de segurança apontados pelo
-- verificador do Supabase.
--  • pode_registrar() e visitante_em_dia() só para quem está logado. O
--    “revoke … from anon” da 0052/0054 não bastava: a permissão vinha do
--    PUBLIC. Elas não devolvem dado nenhum (para visitante sem login, falso),
--    mas não precisam ficar abertas. As regras de banco que as usam valem só
--    para gravação de usuário logado.
--  • em_silencio() e bom_dia_devido() (Chalalá, 0036) com search_path fixo
--    (funções puras de horário; nada muda no resultado).
-- ============================================================================
revoke execute on function public.pode_registrar() from public, anon;
grant execute on function public.pode_registrar() to authenticated, service_role;
revoke execute on function public.visitante_em_dia() from public, anon;
grant execute on function public.visitante_em_dia() to authenticated, service_role;

alter function public.em_silencio(time, time, time) set search_path = public, pg_temp;
alter function public.bom_dia_devido(timestamp, time, time, time) set search_path = public, pg_temp;
