-- 0122 — Visitante com acesso vencido não registra cardio nem mobilidade
-- (achado da auditoria de 29/10/2026). Antes, só training_sessions tinha a
-- trava pode_registrar() (0052); cardio_registros, cardio_inicios e
-- mobilidade_sessoes aceitavam gravação depois dos 30 dias. Restritivas:
-- somam-se (E) às políticas de cada tabela; personal e consultoria seguem iguais.
drop policy if exists cardio_reg_pode_registrar on cardio_registros;
create policy cardio_reg_pode_registrar on cardio_registros as restrictive for insert with check (public.pode_registrar());
drop policy if exists cardio_ini_pode_registrar on cardio_inicios;
create policy cardio_ini_pode_registrar on cardio_inicios as restrictive for insert with check (public.pode_registrar());
drop policy if exists mob_pode_registrar on mobilidade_sessoes;
create policy mob_pode_registrar on mobilidade_sessoes as restrictive for insert with check (public.pode_registrar());
