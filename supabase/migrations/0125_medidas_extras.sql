-- 0125 — Medidas extras na avaliação (pedido do Montinho, 29/10/2026).
-- O laudo da avaliação tem mais medidas do que os campos fixos (braço esquerdo,
-- antebraço, pescoço, dobras cutâneas, IMC…). Ficam numa lista
-- [{nome, valor, unidade}] na mesma linha de `evolucao`, com as mesmas regras de
-- acesso (RLS) que já valem para a linha. Aditiva: nada existente muda.
alter table public.evolucao add column if not exists extras jsonb not null default '[]'::jsonb;

alter table public.evolucao drop constraint if exists evolucao_extras_lista;
alter table public.evolucao add constraint evolucao_extras_lista
  check (jsonb_typeof(extras) = 'array' and jsonb_array_length(extras) <= 60);
