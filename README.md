# Squad App — app white-label de acompanhamento para personal trainer

Plataforma com **dois apps em um**:

- **App do aluno** (mobile-first): treino do dia com marcação de séries e timer
  de descanso, dieta, evolução (fotos e medidas) e check-in diário.
- **Painel do treinador**: cadastro e gestão de alunos, **prescrição** e montador
  de treino, **templates** de treino, biblioteca de exercícios e
  acompanhamento da evolução.

Você recebeu o **código-fonte** para deixar com a sua marca (nome, cores, logo),
rodar no seu Supabase/Vercel e oferecer aos seus clientes.

## 👉 Comece por aqui

- **[MANUAL-CLAUDE.md](MANUAL-CLAUDE.md)** — guia passo a passo (sem precisar
  programar) para rodar, personalizar e editar o app conversando com o Claude.
- **[SETUP.md](SETUP.md)** — guia técnico para conectar seu banco (Supabase),
  GitHub e publicar na Vercel.

## Rodar agora (modo demonstração)

```bash
npm install
npm run dev
```

Abra <http://localhost:3000> (painel do treinador) e
<http://localhost:3000/aluno> (app do aluno). Já funciona com dados de exemplo,
sem precisar configurar nada.

## Personalizar a marca

Tudo num arquivo: **`src/config/brand.ts`** (nome, cores, logo, contatos).
Veja o passo 3 do [MANUAL-CLAUDE.md](MANUAL-CLAUDE.md).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Supabase** — banco, autenticação e storage (opcional; sem ele o app roda em
  modo demonstração)
- **Vercel** — hospedagem

## Estrutura

```
src/
├── config/brand.ts          # 🎨 identidade visual (edite aqui)
├── app/
│   ├── (public)/login        # login/cadastro
│   ├── (aluno)/aluno         # app do aluno (treino, dieta, evolução, perfil)
│   ├── (treinador)/treinador # painel (alunos, prescrição, templates, biblioteca)
│   └── api/                  # rotas de dados
├── components/               # UI, layout, montador de treino
└── lib/                      # supabase, dados mock (demo), helpers

supabase/migrations/          # SQL do banco (rodar no Supabase — ver SETUP.md)
```

---

App derivado e enxuto, pensado como base para você construir o seu. Qualquer
mudança, é só pedir ao Claude — ele conhece este projeto.
