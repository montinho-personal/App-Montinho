# 📱 Manual do seu App — como deixar com a sua cara (usando o Claude)

Bem-vindo! Você recebeu o **código-fonte completo** de um app de acompanhamento
para personal trainer. Ele tem **dois lados**:

- **App do aluno** (celular): vê o treino do dia, marca séries, registra dieta,
  fotos, medidas e check-in diário.
- **Painel do treinador** (computador): cadastra alunos, monta treinos
  (prescrição), salva templates, biblioteca de exercícios e acompanha a evolução.

Este manual é pra você — **mesmo sem saber programar** — conseguir botar o app
no ar com a SUA marca, e fazer mudanças conversando com o **Claude Code**.

> 💡 **A ideia é simples:** você não edita código na mão. Você abre o Claude
> Code dentro desta pasta e **pede em português** o que quer. Ele edita pra você.

---

## 🗺️ Roteiro (a ordem que recomendo)

1. [Instalar o que precisa](#1-instalar-o-que-precisa) (uma vez só)
2. [Rodar o app no seu computador](#2-rodar-o-app-no-seu-computador) (modo demonstração, já funciona)
3. [Deixar com a sua cara](#3-deixar-com-a-sua-cara-nome-cores-logo) — nome, cores e logo
4. [Pedir mudanças ao Claude](#4-pedindo-mudanças-ao-claude) — exemplos prontos
5. [Conectar seu banco de dados](#5-conectar-seu-banco-de-dados-supabase) (Supabase) — quando quiser dados reais
6. [Publicar na internet](#6-publicar-na-internet-github--vercel) (GitHub + Vercel)

Os passos 1 a 4 funcionam **sem internet e sem configurar nada** — o app já
abre com dados de exemplo (modo demonstração). Os passos 5 e 6 têm um guia
técnico separado em **[SETUP.md](SETUP.md)**.

---

## 1. Instalar o que precisa

Você só faz isso **uma vez** no seu computador.

1. **Node.js** (o motor que roda o app) — versão 20 ou maior.
   Baixe em <https://nodejs.org> (botão "LTS") e instale clicando "avançar".
2. **Claude Code** (seu assistente que edita o código).
   Siga as instruções em <https://claude.com/claude-code>.
3. (Opcional, recomendado) **VS Code** — um editor pra abrir a pasta:
   <https://code.visualstudio.com>.

Para conferir se o Node instalou, abra o **Terminal** (Mac) ou **Prompt de
Comando** (Windows) e digite:

```bash
node --version
```

Se aparecer algo como `v20.x.x` ou maior, está pronto.

---

## 2. Rodar o app no seu computador

1. Abra o Terminal **dentro desta pasta** (no VS Code: menu `Terminal → Novo Terminal`).
2. Instale as dependências (só na primeira vez):

   ```bash
   npm install
   ```

3. Suba o app:

   ```bash
   npm run dev
   ```

4. Abra no navegador: <http://localhost:3000>

Pronto — o app abre no **painel do treinador** com dados de exemplo. Para ver o
**app do aluno**, acesse <http://localhost:3000/aluno>.

> Para parar o app, volte ao Terminal e aperte `Ctrl + C`.

---

## 3. Deixar com a sua cara (nome, cores, logo)

Quase tudo da sua identidade fica em **um único arquivo**:

```
src/config/brand.ts
```

Abra ele e edite os campos. Não precisa entender o resto do código — só os
valores entre aspas e os códigos de cor (`#xxxxxx`).

### Nome
```ts
name: "Montinho",            // troque pelo nome curto (ex: "FELIPE TEAM")
fullName: "Montinho App",    // nome completo (ex: "Felipe Team — Consultoria")
tagline: "Treino, dieta e evolução no mesmo lugar.",
```

### Cores
A cor mais importante é a **accent** (botões e destaques). Troque o código
hexadecimal pela sua cor de marca:

```ts
accent:      "#7c3aed",   // sua cor principal
accentHover: "#8b5cf6",   // um tom mais claro (passar o mouse)
accentPress: "#6d28d9",   // um tom mais escuro (clicar)
```

> Não sabe o código da sua cor? Procure "color picker" no Google, escolha a cor
> e copie o valor que começa com `#`. Ou peça ao Claude (ver passo 4).

### Logo
Tem duas formas:

- **Sem imagem (mais fácil):** deixe `useText: true`. O app desenha o seu
  `name` como logotipo, com a sua cor. Fica ótimo e é o padrão.
- **Com a sua imagem:** salve sua logo em `public/brand/logo.svg` (e um ícone
  quadrado em `public/brand/mark.svg`), depois mude para `useText: false`.

```ts
logo: {
  useText: true,            // false = usa as imagens abaixo
  full: "/brand/logo.svg",
  mark: "/brand/mark.svg",
},
```

### Contatos
Preencha para aparecerem nas telas de perfil/ajuda (deixe `""` pra esconder):

```ts
contact: {
  whatsapp:  "5511999999999",
  email:     "contato@seudominio.com.br",
  instagram: "seu_perfil",
},
```

Salve o arquivo, volte ao navegador e dê F5 — a mudança aparece na hora.

---

## 4. Pedindo mudanças ao Claude

Esta é a parte mágica. Abra o **Claude Code** nesta pasta e escreva o que quer,
em português. Alguns pedidos prontos que funcionam bem:

**Identidade visual**
> "Troque a cor de destaque do app para verde-esmeralda e o nome para FELIPE TEAM."

> "Pega a paleta de cores do meu Instagram (vou colar um print) e aplica no app."

> "Coloquei minha logo em public/brand/logo.svg — faz o app usar ela no lugar do texto."

**Textos**
> "Muda a frase da tela de login para 'Sua evolução começa aqui'."

> "Troca a palavra 'aluno' por 'cliente' em todo o app."

**Funcionalidades (com cuidado)**
> "Adiciona um campo de 'objetivo' no cadastro do aluno (ex: emagrecimento, hipertrofia)."

> "Quero remover a aba de Biblioteca de exercícios do painel do treinador."

> "Cria uma tela simples de FAQ para os alunos com 5 perguntas e respostas."

**Quando algo dá erro**
> "Rodei `npm run dev` e apareceu esse erro: (cole o erro aqui). Conserta pra mim."

### Dicas de ouro pra conversar com o Claude
- **Peça uma coisa de cada vez.** Mudanças pequenas são mais fáceis de revisar.
- **Diga o que quer ver, não como fazer.** "Quero os botões arredondados" é
  melhor que tentar explicar CSS.
- **Depois de cada mudança, teste** com `npm run dev` e veja no navegador.
- **Se não gostou,** peça pra desfazer: "desfaz a última mudança".

---

## 5. Conectar seu banco de dados (Supabase)

Até aqui o app usa **dados de exemplo** (não salva nada de verdade). Quando
quiser que os dados dos seus alunos sejam reais e fiquem salvos, você vai criar
um banco gratuito no **Supabase** (a conta é sua).

O passo a passo técnico está em **[SETUP.md](SETUP.md) → seção Supabase**.
Se travar, copie o passo no Claude Code e peça ajuda:

> "Estou no passo do Supabase do SETUP.md e não sei pegar a chave anon. Me guia."

---

## 6. Publicar na internet (GitHub + Vercel)

Para seus alunos acessarem de qualquer lugar, o app precisa estar **publicado**.
Você vai usar:

- **GitHub** — guarda o código (a conta é sua).
- **Vercel** — coloca o app no ar de graça (a conta é sua).

O passo a passo está em **[SETUP.md](SETUP.md) → seção Deploy**. Resumão:
1. Suba esta pasta para um repositório no seu GitHub.
2. Na Vercel, clique "Import" e escolha esse repositório.
3. Cole as chaves do Supabase nas variáveis de ambiente.
4. Clique "Deploy". Em ~2 minutos você tem um link `https://...vercel.app`.

Pode pedir ao Claude pra te guiar passo a passo nessa parte também.

---

## ⚠️ Cuidados importantes

- **Nunca compartilhe o arquivo `.env.local`** nem suas chaves do Supabase. Eles
  são senhas. O `.gitignore` já evita que eles vão pro GitHub — não mexa nisso.
- **Faça uma cópia da pasta** antes de mudanças grandes, ou use Git (commits)
  para conseguir voltar atrás. Peça ao Claude: "faz um commit com a mensagem
  'antes de mexer no layout'".
- **Teste sempre** depois de mexer, com `npm run dev`.
- Em caso de dúvida, **pergunte ao Claude** — ele conhece este projeto.

---

## 🆘 Resolução rápida de problemas

| Problema | O que fazer |
|---|---|
| `npm: command not found` | Node.js não instalado. Volte ao passo 1. |
| App não abre em localhost:3000 | Confira se `npm run dev` está rodando no Terminal, sem erro. |
| Mudei a cor e não aconteceu nada | Salvou o arquivo `brand.ts`? Deu F5 no navegador? |
| Apareceu um erro vermelho no Terminal | Copie o erro inteiro e cole no Claude Code pedindo conserto. |
| Quero voltar tudo ao original | Se usou Git: "Claude, volta pro último commit". |

---

Feito com calma e pensado pra você. Qualquer mudança que imaginar, o Claude
consegue fazer — é só pedir. 💪
