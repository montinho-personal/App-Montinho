-- ============================================================================
-- 0058 — Modo Visitante, fase 8: painel de leads e sincronização com o CRM.
--
--  • leads_status   situação comercial de cada visitante (o personal muda à mão)
--  • crm_config     endereço de recebimento (webhook) do CRM do personal + token
--  • crm_fila       novidades a entregar ao CRM (o agendador entrega a cada
--                   5 min; até 5 tentativas). Gatilhos no banco enfileiram:
--                   lead novo, questionário respondido, tocou no WhatsApp,
--                   concluiu desafio, mudou de status e virou aluno.
--  • crm_pendentes / crm_resultado   usadas só pelo agendador (chave privada),
--                   como as do Chalalá — o app não usa a service role.
-- Só o treinador lê/escreve status, configuração e fila. Tudo aditivo.
-- ============================================================================

create table if not exists leads_status (
  aluno_id uuid primary key references alunos(id) on delete cascade,
  status text not null default 'novo' check (status in ('novo', 'em_conversa', 'interessado', 'sem_interesse', 'virou_aluno')),
  anotacao text check (char_length(anotacao) <= 2000),
  atualizado_por uuid references profiles(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_config (
  id int primary key default 1 check (id = 1),
  webhook_url text check (webhook_url is null or (webhook_url ~ '^https://' and char_length(webhook_url) <= 500)),
  ativo boolean not null default false,
  token text not null default encode(extensions.gen_random_bytes(18), 'hex'),
  updated_at timestamptz not null default now()
);
insert into crm_config (id) values (1) on conflict (id) do nothing;

create table if not exists crm_fila (
  id bigserial primary key,
  aluno_id uuid references alunos(id) on delete cascade,
  evento text not null check (evento in ('lead_novo', 'onboarding_concluido', 'whatsapp_clicado', 'desafio_concluido', 'status_alterado', 'virou_aluno', 'teste')),
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz,
  tentativas int not null default 0,
  codigo int,
  ultimo_erro text
);
create index if not exists idx_crm_fila_pendentes on crm_fila(criado_em) where enviado_em is null;

alter table leads_status enable row level security;
alter table crm_config enable row level security;
alter table crm_fila enable row level security;
create policy leads_status_treinador on leads_status for all using (public.is_treinador()) with check (public.is_treinador());
create policy crm_config_treinador on crm_config for all using (public.is_treinador()) with check (public.is_treinador());
create policy crm_fila_treinador_le on crm_fila for select using (public.is_treinador());

-- Enfileira só quando a sincronização está ligada e só para visitantes.
create or replace function public.crm_enfileirar(p_aluno uuid, p_evento text, p_dados jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from crm_config where id = 1 and ativo and webhook_url is not null) then return; end if;
  if p_evento <> 'virou_aluno' and not exists (select 1 from alunos where id = p_aluno and modalidade = 'visitante') then return; end if;
  insert into crm_fila (aluno_id, evento, dados) values (p_aluno, p_evento, coalesce(p_dados, '{}'::jsonb));
end $$;
revoke all on function public.crm_enfileirar(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.crm_gatilho()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Um IF por tabela: cada uma tem colunas diferentes em NEW/OLD.
  if tg_table_name = 'acessos_visitante' then
    if tg_op = 'INSERT' then perform public.crm_enfileirar(new.aluno_id, 'lead_novo'); end if;
  elsif tg_table_name = 'perfil_visitante' then
    if new.onboarding_concluido_em is not null and (tg_op = 'INSERT' or old.onboarding_concluido_em is null) then
      perform public.crm_enfileirar(new.aluno_id, 'onboarding_concluido');
    end if;
  elsif tg_table_name = 'cta_eventos' then
    if new.tipo = 'clicado' then perform public.crm_enfileirar(new.aluno_id, 'whatsapp_clicado', jsonb_build_object('convite', new.cta, 'tela', new.tela)); end if;
  elsif tg_table_name = 'conquistas_aluno' then
    if new.codigo = 'desafio_concluido' then perform public.crm_enfileirar(new.aluno_id, 'desafio_concluido', jsonb_build_object('campanha_id', new.referencia)); end if;
  elsif tg_table_name = 'leads_status' then
    if tg_op = 'INSERT' or old.status is distinct from new.status then perform public.crm_enfileirar(new.aluno_id, 'status_alterado', jsonb_build_object('status', new.status)); end if;
  elsif tg_table_name = 'alunos' then
    if old.modalidade = 'visitante' and new.modalidade = 'consultoria' then perform public.crm_enfileirar(new.id, 'virou_aluno'); end if;
  end if;
  return new;
end $$;
revoke all on function public.crm_gatilho() from public, anon, authenticated;

create trigger crm_acesso_novo after insert on acessos_visitante for each row execute function public.crm_gatilho();
create trigger crm_onboarding after insert or update of onboarding_concluido_em on perfil_visitante for each row execute function public.crm_gatilho();
create trigger crm_cta after insert on cta_eventos for each row execute function public.crm_gatilho();
create trigger crm_desafio after insert on conquistas_aluno for each row execute function public.crm_gatilho();
create trigger crm_status after insert or update of status on leads_status for each row execute function public.crm_gatilho();
create trigger crm_conversao after update of modalidade on alunos for each row execute function public.crm_gatilho();

-- Agendador: o que entregar agora (com os dados atuais do lead) e o resultado.
create or replace function public.crm_pendentes(p_chave text)
returns table (id bigint, url text, token text, payload jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  return query
  select f.id, c.webhook_url, c.token,
    jsonb_build_object(
      'evento', f.evento,
      'quando', f.criado_em,
      'detalhes', f.dados,
      'lead', case when a.id is null then null else jsonb_build_object(
        'id', a.id,
        'nome', p.nome,
        'email', p.email,
        'telefone', a.telefone,
        'modalidade', a.modalidade,
        'status', coalesce(l.status, 'novo'),
        'anotacao', l.anotacao,
        'convite', cv.codigo,
        'origem', cv.origem,
        'desafio', k.nome,
        'cadastro_em', a.created_at,
        'acesso_ate', v.fim,
        'objetivo', pv.objetivo,
        'experiencia', pv.experiencia,
        'frequencia_semanal', pv.frequencia_semanal,
        'local_treino', pv.local_treino,
        'quer_desafios', pv.interesse_desafios,
        'treinos_feitos', (select count(*) from training_sessions s where s.aluno_id = a.id and s.status <> 'em_andamento' and s.series_concluidas > 0),
        'ultimo_treino', (select max(s.iniciado_em) from training_sessions s where s.aluno_id = a.id and s.series_concluidas > 0)
      ) end
    )
  from crm_fila f
  join crm_config c on c.id = 1 and c.ativo and c.webhook_url is not null
  left join alunos a on a.id = f.aluno_id
  left join profiles p on p.id = a.profile_id
  left join leads_status l on l.aluno_id = a.id
  left join acessos_visitante v on v.aluno_id = a.id
  left join convites cv on cv.id = v.convite_id
  left join campanhas k on k.id = v.campanha_id
  left join perfil_visitante pv on pv.aluno_id = a.id
  where f.enviado_em is null and f.tentativas < 5
  order by f.criado_em
  limit 50;
end $$;
revoke all on function public.crm_pendentes(text) from public, authenticated;
grant execute on function public.crm_pendentes(text) to anon;

create or replace function public.crm_resultado(p_chave text, p_id bigint, p_ok boolean, p_codigo int, p_erro text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  update crm_fila
     set tentativas = tentativas + 1,
         codigo = p_codigo,
         ultimo_erro = case when p_ok then null else left(p_erro, 300) end,
         enviado_em = case when p_ok then now() else null end
   where id = p_id;
end $$;
revoke all on function public.crm_resultado(text, bigint, boolean, int, text) from public, authenticated;
grant execute on function public.crm_resultado(text, bigint, boolean, int, text) to anon;
