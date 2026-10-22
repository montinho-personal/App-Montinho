-- ============================================================================
-- 0054 — Modo Visitante, fase 3: o visitante monta os próprios treinos.
--
-- O visitante com acesso em dia cria e edita SÓ treinos com autoria 'proprio'
-- dele mesmo, e os exercícios desses treinos. Treinos do personal (autoria
-- 'personal') continuam só leitura para ele, e o aluno da consultoria não
-- ganha nenhuma escrita nova. Sem DELETE: treino sai com ativo=false e
-- exercício com removido_em (histórico preservado).
-- ============================================================================

create or replace function public.visitante_em_dia()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.alunos a
    left join public.acessos_visitante v on v.aluno_id = a.id
    where a.profile_id = auth.uid()
      and a.modalidade = 'visitante'
      and (v.fim is null or v.fim > now())
  );
$$;

create policy visitante_cria_treino_proprio on treinos for insert
  with check (autoria = 'proprio' and aluno_id = public.aluno_id_atual() and public.visitante_em_dia());
create policy visitante_edita_treino_proprio on treinos for update
  using (autoria = 'proprio' and aluno_id = public.aluno_id_atual() and public.visitante_em_dia())
  with check (autoria = 'proprio' and aluno_id = public.aluno_id_atual() and public.visitante_em_dia());

create policy visitante_cria_exercicio_proprio on exercicios for insert
  with check (public.visitante_em_dia() and exists (
    select 1 from treinos t where t.id = exercicios.treino_id and t.autoria = 'proprio' and t.aluno_id = public.aluno_id_atual()));
create policy visitante_edita_exercicio_proprio on exercicios for update
  using (public.visitante_em_dia() and exists (
    select 1 from treinos t where t.id = exercicios.treino_id and t.autoria = 'proprio' and t.aluno_id = public.aluno_id_atual()))
  with check (public.visitante_em_dia() and exists (
    select 1 from treinos t where t.id = exercicios.treino_id and t.autoria = 'proprio' and t.aluno_id = public.aluno_id_atual()));
