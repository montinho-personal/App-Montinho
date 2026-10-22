/*
 * Leads do App Montinho (Modo Visitante) entram no CRM sozinhos.
 *
 * O app (projeto app-montinho) entrega cada novidade por webhook (cron a cada
 * 5 min) para a RPC abaixo, com o token no cabeçalho X-Montinho-Token. A
 * função confere o token, acha ou cria o contato (mesmo e-mail ou telefone =
 * mesma pessoa), abre um lead com a fonte "App Montinho" e registra cada
 * novidade como atividade. Tocou no WhatsApp ou concluiu um desafio → tarefa
 * de contato para hoje.
 *
 * Nada aqui decide venda ou perda: "virou aluno" e "sem interesse" no app
 * viram anotação; ganhar/perder o lead continua decisão humana no CRM.
 * O token fica numa tabela sem nenhuma política (só a função lê). É o mesmo
 * de crm_config.token no app; foi copiado banco a banco, nunca para o código.
 *
 * Banco do CRM: projeto vsldhkkeijmeculaukee (repositório site-montinho).
 * Aplicado em 22/10/2026. Endereço configurado no app (crm_config.webhook_url):
 *   https://vsldhkkeijmeculaukee.supabase.co/rest/v1/rpc/receber_app_montinho?apikey=<chave publishable do CRM>
 */
insert into public.crm_sources (code, nome, categoria, custo_rastreado, ordem) values
  ('app_montinho','App Montinho (visitante)','other',false,95)
on conflict (code) do nothing;

create table if not exists public.crm_app_montinho_chave (
  id int primary key default 1 check (id = 1),
  token text not null,
  updated_at timestamptz not null default now()
);
alter table public.crm_app_montinho_chave enable row level security;
revoke all on public.crm_app_montinho_chave from anon, authenticated;

-- Aluno do app ↔ contato/lead do CRM (para as novidades seguintes caírem no mesmo lead).
create table if not exists public.crm_app_montinho_vinculos (
  aluno_id uuid primary key,
  contact_id uuid not null,      -- sem FK de propósito: a função confere se o contato ainda existe
  lead_id uuid,
  ultimo_evento text,
  atualizado_em timestamptz not null default now()
);
alter table public.crm_app_montinho_vinculos enable row level security;
revoke all on public.crm_app_montinho_vinculos from anon;

create or replace function public.receber_app_montinho(jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  p jsonb := $1;
  lead jsonb := p->'lead';
  evento text := p->>'evento';
  token_recebido text := coalesce(current_setting('request.headers', true)::json->>'x-montinho-token', '');
  token_ok text;
  v_aluno uuid;
  v_contato uuid;
  v_lead uuid;
  v_nome text;
  v_email text;
  v_tel text;
  v_detalhe text;
  v_desc text;
  v_tipo text;
begin
  select token into token_ok from crm_app_montinho_chave where id = 1;
  if token_ok is null or length(token_recebido) < 20 or token_recebido <> token_ok then
    raise exception 'token inválido' using errcode = '28000';
  end if;
  if evento is null or evento !~ '^[a-z_]{3,40}$' then raise exception 'evento inválido' using errcode = '22023'; end if;
  -- Botão "Enviar teste" do app: confere a ligação sem criar nada.
  if evento = 'teste' then return jsonb_build_object('ok', true, 'teste', true); end if;
  if lead is null or jsonb_typeof(lead) <> 'object' then raise exception 'lead ausente' using errcode = '22023'; end if;

  v_aluno := (lead->>'id')::uuid;
  v_nome := left(nullif(btrim(lead->>'nome'), ''), 200);
  v_email := lower(left(nullif(btrim(lead->>'email'), ''), 200));
  v_tel := left(nullif(btrim(lead->>'telefone'), ''), 40);

  select contact_id, lead_id into v_contato, v_lead from crm_app_montinho_vinculos where aluno_id = v_aluno;
  if v_contato is not null and not exists (select 1 from crm_contacts where id = v_contato) then v_contato := null; v_lead := null; end if;

  if v_contato is null then
    -- Mesma pessoa já no CRM (veio do site, por exemplo)? Usa o contato dela.
    select c.id into v_contato from crm_contacts c
     where c.merged_into_contact_id is null and c.anonimizado = false
       and ((v_email is not null and c.email = v_email::citext)
         or (v_tel is not null and c.telefone_e164 = public.crm_normalize_phone(v_tel)))
     order by c.created_at limit 1;
    if v_contato is null then
      insert into crm_contacts (nome, telefone, email, como_conheceu, observacoes)
      values (coalesce(v_nome, 'Visitante do app'), v_tel, v_email, 'App Montinho (convite de visitante)',
              'Criado automaticamente pelo App Montinho.')
      returning id into v_contato;
    end if;
  end if;

  if v_lead is null or not exists (select 1 from crm_leads where id = v_lead) then
    -- Lead aberto da mesma pessoa já existe? Usa; senão abre um novo.
    select l.id into v_lead from crm_leads l where l.contact_id = v_contato and l.status = 'aberto' order by l.created_at desc limit 1;
    if v_lead is null then
      v_detalhe := concat_ws(' · ',
        'Convite ' || nullif(lead->>'convite', ''),
        'origem ' || nullif(lead->>'origem', ''),
        'desafio ' || nullif(lead->>'desafio', ''));
      insert into crm_leads (contact_id, interesse, source_code, source_detail, attribution_confidence, next_action, next_action_at)
      values (v_contato, left(nullif(lead->>'objetivo', ''), 200), 'app_montinho', nullif(v_detalhe, ''), 'high',
              'Visitante do app: acompanhar o período de teste', now() + interval '1 day')
      returning id into v_lead;
      insert into crm_activities (contact_id, lead_id, tipo, descricao, metadata)
      values (v_contato, v_lead, 'lead_created', 'Entrou pelo App Montinho (visitante).', jsonb_build_object('app', lead));
    end if;
  end if;

  insert into crm_app_montinho_vinculos (aluno_id, contact_id, lead_id, ultimo_evento, atualizado_em)
  values (v_aluno, v_contato, v_lead, evento, now())
  on conflict (aluno_id) do update set contact_id = excluded.contact_id, lead_id = excluded.lead_id,
    ultimo_evento = excluded.ultimo_evento, atualizado_em = now();

  -- Número que chegou depois (visitante antigo informou no app): completa o contato, sem sobrescrever.
  if v_tel is not null then
    update crm_contacts set telefone = v_tel where id = v_contato and nullif(btrim(telefone), '') is null;
  end if;

  if evento <> 'lead_novo' then
    v_tipo := case evento when 'whatsapp_clicado' then 'whatsapp_open' else 'note' end;
    v_desc := case evento
      when 'onboarding_concluido' then format('Respondeu as boas-vindas do app (objetivo: %s; %s treinos por semana; %s).',
        coalesce(lead->>'objetivo', '—'), coalesce(lead->>'frequencia_semanal', '—'), coalesce(lead->>'local_treino', '—'))
      when 'whatsapp_informado' then format('Informou o WhatsApp no app: %s.', coalesce(v_tel, '—'))
      when 'whatsapp_clicado' then format('Tocou no WhatsApp pelo app (convite %s).', coalesce(p->'detalhes'->>'convite', '—'))
      when 'desafio_concluido' then format('Concluiu o desafio%s no app (%s treinos feitos).', coalesce(' ' || nullif(lead->>'desafio', ''), ''), coalesce(lead->>'treinos_feitos', '0'))
      when 'status_alterado' then format('No painel de leads do app: status “%s”.', coalesce(p->'detalhes'->>'status', lead->>'status'))
      when 'virou_aluno' then 'No app: passou de visitante para aluno da consultoria. Marque o lead como ganho aqui no CRM.'
      else format('Novidade do app: %s.', evento) end;
    insert into crm_activities (contact_id, lead_id, tipo, descricao, metadata)
    values (v_contato, v_lead, v_tipo, v_desc, jsonb_build_object('evento', evento, 'detalhes', p->'detalhes', 'treinos_feitos', lead->'treinos_feitos'));
  end if;

  -- Sinal de compra: tarefa para hoje (uma aberta por lead basta).
  if evento in ('whatsapp_clicado', 'desafio_concluido')
     and not exists (select 1 from crm_tasks t where t.lead_id = v_lead and t.completed_at is null and t.origem = 'automacao' and t.tipo = 'follow_up') then
    insert into crm_tasks (contact_id, lead_id, tipo, titulo, due_at, priority, origem)
    values (v_contato, v_lead, 'follow_up',
      case evento when 'whatsapp_clicado' then 'Visitante do app tocou no WhatsApp — responder' else 'Visitante concluiu o desafio no app — parabenizar e oferecer a consultoria' end,
      now(), 'alta', 'automacao');
  end if;

  update crm_leads set updated_at = now() where id = v_lead;
  return jsonb_build_object('ok', true, 'contato', v_contato, 'lead', v_lead);
end $$;

revoke all on function public.receber_app_montinho(jsonb) from public;
grant execute on function public.receber_app_montinho(jsonb) to anon, authenticated;
