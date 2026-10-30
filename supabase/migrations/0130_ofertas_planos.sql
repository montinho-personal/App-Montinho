-- 0130 — Ofertas dos planos no app (pedido do Montinho, 30/10/2026).
-- Só botão para o WhatsApp (sem pagamento no app). O personal liga/desliga cada
-- oferta e marca quem pode fazer aula presencial (o Pacote Flexível é em
-- Alphaville). O visitante informa a cidade no cadastro.
alter table alunos add column if not exists cidade text check (cidade is null or char_length(cidade) <= 80);
alter table alunos add column if not exists pode_presencial boolean not null default true;

create table if not exists ofertas_config (
  id text primary key check (id in ('pacote_alunos', 'consultoria_visitantes', 'pacote_visitantes')),
  ativo boolean not null default true,
  -- Vantagem opcional que aparece junto da oferta (ex.: “1 aula a mais na renovação”).
  promo text check (promo is null or char_length(promo) <= 120),
  updated_at timestamptz not null default now()
);
insert into ofertas_config (id) values ('pacote_alunos'), ('consultoria_visitantes'), ('pacote_visitantes') on conflict (id) do nothing;

alter table ofertas_config enable row level security;
drop policy if exists ofertas_config_le on ofertas_config;
create policy ofertas_config_le on ofertas_config for select to authenticated using (true);
drop policy if exists ofertas_config_personal on ofertas_config;
create policy ofertas_config_personal on ofertas_config for update using ((select public.is_treinador())) with check ((select public.is_treinador()));
