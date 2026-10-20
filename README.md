# Montinho Personal Trainer — app web

> “Não é só sobre começar. É sobre conseguir continuar.”

Aplicação web responsiva com dois lados:

- **App do aluno** (celular): próximo treino, execução com registro de carga/reps em poucos toques, última carga como referência, timer de descanso, pedido de adaptação, evolução em duas camadas.
- **Painel do Montinho** (computador/tablet): montador de treinos A–H com **Tabela de Volume Semanal em tempo real**, memória de prescrições (busca estruturada, sem IA obrigatória), relatórios detalhados, alertas com evidência e registro de intervenções.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth + Storage) · Vercel.

## Documentação

| Arquivo | Para quê |
|---|---|
| [GUIA-MONTINHO.md](GUIA-MONTINHO.md) | como usar: entrar, cadastrar aluno, montar treino, ler a tabela de volume, memória, relatórios |
| [SETUP.md](SETUP.md) | conectar Supabase, GitHub e Vercel |
| [ARQUITETURA.md](ARQUITETURA.md) | banco, fluxos de sessão/versão, autorização, memória, relatórios, LGPD |
| [AUDITORIA-INICIAL.md](AUDITORIA-INICIAL.md) | o que estava errado no código original e a decisão tomada |
| [CHECKLIST-TESTES.md](CHECKLIST-TESTES.md) | cenários PASSOU / NÃO EXECUTADO com evidência |
| [ROADMAP.md](ROADMAP.md) | entregue, parcial, pendências e próximos passos |

## Rodar localmente

```bash
npm install
cp .env.example .env.local
# Para demonstração (sem banco): deixe NEXT_PUBLIC_DEMO_MODE=true
npm run dev
```

Abra <http://localhost:3000>. Em demo, a tela de entrada mostra personas fictícias (Montinho / alunos). Com Supabase configurado (SETUP.md), o login é real e o modo demo fica desligado.

## Qualidade

```bash
npm run lint        # ESLint (regras Next + React Compiler)
npm run typecheck   # TypeScript
npm run build       # build de produção
npm test            # 82 testes unitários (volume, biblioteca, busca, substituição, memória, relatórios, fila, autorização)
PGHOST=localhost PGPORT=5432 PGUSER=postgres npm run db:test   # migrations + RLS em Postgres local
```

## Publicar

**Já publicado:** <https://app-montinho.vercel.app> (Vercel, branch `main`) ligado ao
Supabase `app-montinho` (ref `bixfqkisvzrpxbiscqdd`, migrations 0001→0013). Pendências
que dependem da conta do dono (chave `service_role`, URL no Auth, primeiro treinador):
SETUP.md → "Pendências de ativação".

Para recriar do zero:

1. Supabase: rodar `supabase/migrations/0001…0013` na ordem (SQL Editor ou `supabase db push`).
2. Vercel: importar o repositório e definir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`. **Não** defina `NEXT_PUBLIC_DEMO_MODE` em produção.
3. Supabase Auth → URL Configuration: adicionar a URL da Vercel.
4. Criar sua conta pelo app e mudar `profiles.role` para `treinador`.

## Estrutura

```
src/
├── app/(public)       login, configuração pendente
├── app/(aluno)        início, treinar, treino ativo, evolução, perfil, dieta
├── app/(treinador)    visão geral, alunos, montador, memória, biblioteca, templates, prescrição, ajustes
├── app/api            sessões, plano, memória, adaptações, intervenções, auth, exportar…
├── components         ui, layout, montador (TabelaVolume, ExemplosSemelhantes), relatórios
├── config/brand.ts    identidade visual (única fonte)
└── lib
    ├── auth/          sessão e guards
    ├── data/          programas, sessões, memória, acompanhamento (live | demo)
    ├── volume/        motor da tabela de volume + referências heurísticas
    ├── memoria/       similaridade estruturada
    ├── relatorios/    fórmulas de evolução
    ├── sync/          fila local idempotente
    ├── validacao/     schemas zod
    └── mock/          dados fictícios do modo demo
supabase/migrations/   0001–0013 (0013 = catálogo de 150 exercícios)
scripts/               testes de RLS em Postgres local, seed fictício
docs/screenshots/      evidências visuais
```
