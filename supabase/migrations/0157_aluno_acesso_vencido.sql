-- 0157 — Aluno da consultoria com o acesso vencido (pedido do Montinho, 13/11/2026):
-- continua entrando e vendo o app, mas não registra treino, cardio nem mobilidade
-- até renovar. O dia do vencimento ainda vale (dia de Brasília); sem data = nunca vence.
-- O personal continua podendo registrar (aula presencial). Visitante: igual a antes.
create or replace function public.pode_registrar()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.is_treinador()
    or exists (
      select 1 from public.alunos a
      left join public.acessos_visitante v on v.aluno_id = a.id
      where a.profile_id = auth.uid()
        and (
          (coalesce(a.modalidade, 'consultoria') = 'consultoria' and (a.acesso_ate is null or a.acesso_ate >= (now() at time zone 'America/Sao_Paulo')::date))
          or (coalesce(a.modalidade, 'consultoria') <> 'consultoria' and (v.fim is null or v.fim > now()))
        )
    );
$function$;
