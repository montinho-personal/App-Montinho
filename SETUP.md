# 🔧 SETUP — banco de dados e publicação (Montinho Personal Trainer)

Guia técnico para sair do **modo demonstração** e colocar o app no ar com dados
reais. Cada serviço aqui é **uma conta sua** (GitHub, Supabase, Vercel) — tudo
com plano gratuito suficiente pra começar.

> Não é técnico? Tudo bem. Abra o **Claude Code** nesta pasta e vá pedindo:
> "me guia no passo X do SETUP.md". Ele acompanha você.

A ordem recomendada: **Supabase → GitHub → Vercel**.

> **Estado atual (19/10/2026): já está no ar.** Supabase `app-montinho`
> (ref `bixfqkisvzrpxbiscqdd`, São Paulo) com as migrations 0001→0015 aplicadas;
> código em `main` no GitHub (`montinho-personal/App-Montinho`); Vercel
> `app-montinho` publicado em <https://app-montinho.vercel.app> com
> `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_APP_URL`.
> **Faltam só três coisas que exigem a sua conta** — veja a seção
> "Pendências de ativação" no fim deste arquivo. O passo a passo abaixo fica
> como referência para recriar tudo do zero.

---

## Parte A — Banco de dados (Supabase)

### A1. Criar o projeto
1. Crie uma conta em <https://supabase.com> (pode entrar com o GitHub).
2. Clique **New project**. Dê um nome (ex: `montinho-app`), escolha uma região
   próxima (ex: *South America (São Paulo)*) e defina uma senha de banco.
3. Aguarde ~2 minutos até o projeto ficar pronto.

### A2. Criar as tabelas
1. No menu lateral do Supabase, abra **SQL Editor**.
2. Abra a pasta `supabase/migrations/` deste projeto. Você verá vários arquivos
   `.sql` numerados (`0001_...`, `0002_...`, etc.).
3. **Na ordem numérica** (0001 → 0015), abra cada arquivo, copie todo o conteúdo, cole no SQL
   Editor e clique **Run**. Faça um de cada vez, do menor número ao maior.
   A 0008 só cria valores de enum; a 0009 cria sessões, versões e memória e
   migra o logbook antigo sem apagar nada (rode fora do horário de uso se já houver dados);
   a 0010 endurece as funções (search_path fixo, trigger de cadastro fora da API);
   a 0011–0012 preparam a biblioteca inteligente (equipamentos, metadados, equivalências, favoritos)
   e a 0013 carrega o catálogo de 150 exercícios (pode rodar de novo sem duplicar nada).
   A 0014 permite contar drop set, rest-pause e myo-reps no volume.
   A 0015 cria o lembrete de treino em aberto (notificação push); depois dela, siga
   `scripts/sql/agendar-lembretes.sql` (chave do agendador + chaves VAPID na Vercel).
   Em produção a 0013 foi aplicada em 4 partes (`0013a`…`0013d`), com o mesmo conteúdo.

   > O catálogo vive em `src/lib/biblioteca/catalogo.ts`. Se alguém mudar esse arquivo, a 0013 é
   > regenerada com `node --experimental-strip-types scripts/gerar-sql-catalogo.mts` (suba
   > `CATALOGO_VERSAO` para atualizar itens que você não editou; os editados por você nunca são sobrescritos).
4. Se algum der erro de "já existe", pode seguir — significa que aquela parte já
   foi criada.

> Atalho pra quem usa terminal: com a [Supabase CLI](https://supabase.com/docs/guides/local-development)
> instalada, dá pra rodar tudo com `supabase db push`. Mas o método de copiar e
> colar acima funciona pra todo mundo.

### A3. Pegar as chaves
No Supabase, vá em **Project Settings → API** e copie:
- **Project URL** (algo como `https://xxxx.supabase.co`)
- **anon public** key
- **service_role** key (essa é secreta — trate como senha)

### A4. Configurar o app localmente
1. Na raiz do projeto, copie o arquivo de exemplo:

   ```bash
   cp .env.example .env.local
   ```

2. Abra `.env.local` e preencha com as chaves do passo A3:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...   # anon public
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...        # service_role (secreta)
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_DEMO_MODE=false
   ```

3. Pare o app (`Ctrl + C`) e suba de novo (`npm run dev`).
   Agora ele usa o **banco real** em vez dos dados de exemplo. (Opcional: `scripts/seed-demo.sql` cria dados fictícios num projeto de teste — nunca em produção.)

### A5. Criar o primeiro treinador (você)
O app diferencia **treinador** de **aluno** por um campo `role` na tabela
`profiles`.

1. No app, crie uma conta normalmente pela tela de **login/cadastro**
   (<http://localhost:3000/login>).
2. No Supabase, vá em **Table Editor → profiles**, ache a sua linha e mude o
   campo **role** para `treinador`. Salve.
3. Recarregue o app — agora você entra como treinador e pode cadastrar alunos.

> Os alunos que você cadastrar pelo painel já nascem com `role = aluno`.

---

## Parte B — Guardar o código no GitHub

### B1. Criar o repositório
1. Crie uma conta em <https://github.com> (se ainda não tiver).
2. Clique **New repository**. Nome ex: `montinho-app`. Deixe **Private**. Não marque
   nenhuma opção de "inicializar com README". Clique **Create**.

### B2. Subir o código
No Terminal, dentro desta pasta:

```bash
git init
git add .
git commit -m "primeiro commit do meu app"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/montinho-app.git
git push -u origin main
```

(Troque `SEU-USUARIO/montinho-app` pelo endereço do seu repositório.)

> ✅ O arquivo `.gitignore` já garante que `.env.local` e suas senhas **não**
> sejam enviados ao GitHub. Confira: depois do push, o `.env.local` NÃO deve
> aparecer no GitHub. Se aparecer, pare e peça ajuda ao Claude.

---

## Parte C — Publicar (Vercel)

### C1. Importar o projeto
1. Crie uma conta em <https://vercel.com> e conecte seu GitHub.
2. Clique **Add New → Project** e selecione o repositório `montinho-app`.
3. A Vercel detecta Next.js sozinha — não precisa mudar configuração de build.

### C2. Variáveis de ambiente
Antes de clicar Deploy, abra **Environment Variables** e adicione as mesmas
chaves do seu `.env.local`:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | sua Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sua anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | sua service_role key |
| `NEXT_PUBLIC_APP_URL` | a URL final da Vercel (ex: `https://montinho-app.vercel.app`) |

> Não defina `NEXT_PUBLIC_DEMO_MODE=true` na Vercel: produção deve rodar só com dados reais.

> Dica: você pode fazer o primeiro deploy, ver qual URL a Vercel gerou, e então
> voltar e preencher `NEXT_PUBLIC_APP_URL` com ela.

### C3. Deploy
Clique **Deploy**. Em ~2 minutos seu app está no ar. A cada `git push` novo, a
Vercel atualiza sozinha.

### C4. Apontar para o Supabase em produção
No Supabase, vá em **Authentication → URL Configuration** e adicione a URL da
Vercel em **Site URL** e **Redirect URLs**, para o login funcionar no domínio
publicado.

---

## ✅ Checklist final

- [ ] Tabelas criadas no Supabase (Parte A2)
- [ ] `.env.local` preenchido e app rodando com banco real (A4)
- [ ] Seu usuário com `role = treinador` (A5)
- [ ] Código no GitHub, sem `.env.local` exposto (Parte B)
- [ ] App publicado na Vercel com as variáveis de ambiente (Parte C)
- [ ] URL da Vercel liberada no Supabase Auth (C4)

Travou em algum item? Copie ele aqui no Claude Code e peça pra te guiar. 🚀

---

## Pendências de ativação (só você consegue fazer)

O ambiente já existe; estes três passos usam chaves ou telas da sua conta.

1. **Chave `service_role` na Vercel** (necessária só para o botão *+ Novo aluno*,
   que envia o convite por e-mail; o resto do app funciona sem ela).
   - Supabase → projeto `app-montinho` → **Project Settings → API Keys** → copie **service_role**.
   - Vercel → projeto `app-montinho` → **Settings → Environment Variables** → *Add*:
     nome `SUPABASE_SERVICE_ROLE_KEY`, valor colado, ambiente **Production** → *Save*.
   - Vercel → **Deployments** → menu `⋯` do último deploy → **Redeploy**.
2. **Liberar a URL do app no login do Supabase** (sem isso o link por e-mail volta para `localhost`).
   - Supabase → **Authentication → URL Configuration**:
     **Site URL** = `https://app-montinho.vercel.app`;
     **Redirect URLs** → *Add URL* = `https://app-montinho.vercel.app/**` → *Save*.
3. **Sua conta de treinador.**
   - Abra <https://app-montinho.vercel.app/login>, digite seu e-mail e clique
     **receber link no e-mail**. Abra o link **uma vez só, no mesmo navegador**
     em que pediu (cada link vale 1 hora; um link já usado mostra "Esse link não vale mais").
   - Supabase → **Table Editor → profiles** → sua linha → campo **role** = `treinador` → *Save*.
   - Recarregue o app: você cai no painel do treinador. Em **Ajustes → Definir ou
     trocar senha** crie uma senha para entrar sem depender do link.
   - Esqueceu a senha? Na tela de entrada, **esqueci a senha** envia um e-mail que
     leva direto à tela de nova senha.

4. **(Opcional) Links que funcionam em qualquer aparelho.** Por padrão o link do
   e-mail só completa o login no navegador que o pediu. Para abrir no celular um
   link pedido no computador, troque os modelos de e-mail do Supabase:
   **Authentication → Email Templates**, em *Magic Link* e *Confirm signup*
   substitua `{{ .ConfirmationURL }}` por
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink`
   e, em *Reset Password*, por
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery`.

> Observação técnica: na Vercel, a *Deployment Protection* ficou ligada só para
> **previews**; a produção é pública (os alunos entram pelo login do app).
> No Supabase, a 0009 foi aplicada em duas partes (a remoção das políticas de
> escrita do aluno no `logbook` virou `alter policy … (false)`, mesmo efeito),
> por limitação do conector; nada muda para o app.
