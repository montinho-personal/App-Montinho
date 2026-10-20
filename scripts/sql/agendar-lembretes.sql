-- ============================================================================
-- Agendador do lembrete de treino em aberto (rodar UMA vez no SQL Editor do
-- Supabase, depois da migration 0015). NÃO commitar a chave verdadeira.
--   1) Gere uma chave aleatória (ex.: 32 bytes em base64url).
--   2) Na Vercel, defina LEMBRETE_CHAVE = <chave> (tipo "sensitive").
--   3) Troque <CHAVE> abaixo e rode. O banco guarda só o hash (sha256).
-- Também na Vercel: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e
-- VAPID_SUBJECT (gerar com: npx web-push generate-vapid-keys).
-- Já aplicado em produção (app-montinho) em 20/10/2026.
-- ============================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

insert into config_privada (chave, valor)
values ('lembrete_chave_sha256', encode(extensions.digest('<CHAVE>', 'sha256'), 'hex'))
on conflict (chave) do update set valor = excluded.valor;

select cron.unschedule('montinho-lembrete-treino-aberto')
where exists (select 1 from cron.job where jobname = 'montinho-lembrete-treino-aberto');

select cron.schedule(
  'montinho-lembrete-treino-aberto',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := 'https://app-montinho.vercel.app/api/cron/lembretes',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-montinho-chave', '<CHAVE>'),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $job$
);
