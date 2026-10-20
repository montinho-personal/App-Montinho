# Arquitetura — Montinho Personal Trainer

Aplicação web responsiva (Next.js 16 App Router + React 19 + TypeScript + Tailwind 4) com Supabase (Postgres, Auth, Storage) e deploy na Vercel. Dois perfis: **treinador administrador** e **aluno**.

## 1. Camadas

```
Browser ──► proxy.ts (checagem otimista de rota)
         ──► Server Components / Route Handlers
                │  src/lib/auth/session.ts   → quem é (role, aluno_id)
                │  src/lib/validacao/*       → zod em toda entrada
                │  src/lib/data/*            → regras de negócio (live | demo)
                │  src/lib/supabase/rls.ts   → cliente AUTENTICADO (RLS)
                └─ src/lib/supabase/admin.ts → service role (só convite/cron)
Postgres (RLS em todas as tabelas) ◄──────────────────────────────┘
```

- **Módulos puros e testados** (sem rede): `src/lib/volume/*` (tabela de volume), `src/lib/grupos.ts` (taxonomia/resolução de grupo), `src/lib/memoria/similaridade.ts` (busca estruturada), `src/lib/relatorios/calcular.ts` (fórmulas), `src/lib/sync/fila.ts` (fila local), `src/lib/auth/guards.ts` (regras de autorização).
- **Modo de execução** (`src/lib/env.ts`): `live` (Supabase) · `demo` (dados em memória, identidade por cookie, banner) · `nao_configurado` (nada privado abre).

## 2. Banco de dados (migrations `supabase/migrations/`)

### Entidades (0001–0007, preservadas)
`profiles`, `alunos`, `treinos`, `exercicios`, `cronograma`, `logbook` (legado), `evolucao`, `dieta`, `fotos`, `pagamentos`, `exercicios_biblioteca`, `templates_treino`, `anamnese`, `check_ins`, `mensagens`, `avaliacoes_fisicas`, `conhecimento`, `solicitacoes`, `squad_*`.

### 0008 — grupos musculares
Novos valores no enum `grupo_muscular`: `quadriceps`, `posteriores`, `adutores`, `abdutores`, `ombro_anterior|lateral|posterior`, `trapezio`, `lombar`, `nao_classificado`. `pernas` continua existindo (legado, “a classificar”). `treino_letra` ganha `F`, `G`, `H`.

### 0009 — fundação
```
programas ─1:N─ treinos ─1:N─ exercicios (ids estáveis, removido_em)
    │                                │
    └─ programa_versoes (snapshot imutável)   session_exercises.exercicio_id (SET NULL)
                                                        ▲
training_sessions ─1:N─ session_exercises ─1:N─ session_sets
  (aluno_id, client_key UNIQUE)                 (session_id, client_key UNIQUE)

biblioteca_programas  (acervo DESIDENTIFICADO; hash_estrutura UNIQUE)
grupo_correcoes       (nome_normalizado → grupo; conhecimento reutilizável)
adaptacoes            (pedidos do aluno)       intervencoes (registro do treinador)
```

Colunas novas em `exercicios`: `grupo_muscular`, `grupos_secundarios`, `grupo_origem` (biblioteca|manual|heuristica|correcao), `grupo_confianca`, `series_aquecimento`, `tecnica`, `bloco`, `unilateral`, `carga_alvo`, `rir`, `cadencia`, `conta_volume`, `removido_em`.

### 0011–0013 — biblioteca inteligente
- `exercicios_biblioteca` ganha `slug` (id estável), `sinonimos`, `erros_comuns`, `padrao_movimento`, `articulacoes`, `tipo_movimento`, `campos_registro`, `pesos_secundarios` (jsonb, fração por músculo), `estresse_articular`, `nivel_minimo`, `conta_volume`, `origem` (`catalogo|treinador`), `catalogo_versao`, `arquivado`.
- `exercicio_equivalencias` (exercício → alternativa, `origem`, `status` `sugerida|aprovada|rejeitada`, nota, autor). Só treinador lê/escreve.
- `exercicio_favoritos` (por treinador; cada um vê só os seus).
- 0013: catálogo v1 (150 exercícios + 351 sugestões). Upsert por `slug` que só atualiza itens `origem='catalogo'` de versão anterior; nunca toca `exercicios` (prescrições).
- Fonte única: `src/lib/biblioteca/catalogo.ts` → `scripts/gerar-sql-catalogo.mts`. Busca: `busca.ts`; substituição: `substituicao.ts` (regras explicáveis, sem IA); volume ponderado: `calcular.ts` com `pesosSecundarios`.

### 0014 — técnicas no volume
`exercicios.tecnica` aceita `myo_reps`; novas colunas `tecnica_extras` (drops/mini-séries por série) e `tecnica_series` (em quantas séries). `null` = padrão do app. Cálculo em `src/lib/volume/tecnicas.ts` (regras Clássica/Moderada/Alta + ajuste opcional por RIR); fontes em VOLUME-TECNICAS.md.

### Três entidades separadas (Prompt Mestre §3.2)
1. **Plano prescrito** — `programas` + `treinos` + `exercicios`. Editável; cada salvamento incrementa `versao` e grava `programa_versoes`.
2. **Sessão realizada** — `training_sessions` (status `em_andamento|concluida|abandonada`, `snapshot` da prescrição, totais) + `session_exercises` + `session_sets` (carga, reps, RIR, tipo `valida|aquecimento|dropset|...`).
3. **Histórico permanente** — versões imutáveis + sessões; `session_exercises.nome_normalizado` permite comparar o mesmo exercício mesmo após troca/substituição no plano.

### Migração do logbook legado
Set-based e idempotente (0009 §8): uma sessão por `(aluno, data, treino)`; uma série por linha; `logbook.session_set_id` marca o que foi migrado. Duplicatas reais são preservadas (duas séries). Nada é apagado.

## 3. Fluxo de sessão (aluno)

```
Começar treino ──POST /api/sessoes {treino_id, client_key}──► cria sessão + session_exercises (snapshot)
Concluir série ──enfileira (localStorage) ──POST /api/sessoes/:id/series {client_key,...}──► upsert por client_key
Não consegui   ──POST /api/adaptacoes ──► pedido ao treinador (status aberta)
Concluir       ──PATCH /api/sessoes/:id {status, feedback}──► finaliza, conta séries, marca ultimo_treino_em (RPC)
```
Idempotência: reenviar a mesma série (mesma `client_key`) atualiza em vez de duplicar; a fila local re-lê o storage a cada passo e só remove a operação confirmada (`src/lib/sync/fila.ts`, testado). O estado da UI mostra “pendente de sincronização” até a confirmação.

## 4. Fluxo de versionamento (treinador)

```
Montador ──PUT /api/alunos/:id/plano {programa, treinos[{id?, exercicios[{id?...}]}], correcoes}──►
  salvarPlano(): upsert por id · soft delete · programa_versoes.insert(snapshot, diff_resumo)
             └─► registrarNaMemoria(): desidentifica → hash → biblioteca_programas (dedupe)
             └─► salvarCorrecoes(): grupo_correcoes (aprendizado explícito)
             └─► intervencoes.insert("revisao_treino", visível ao aluno)
```

## 5. Tabela de Volume Semanal (`src/lib/volume/calcular.ts`)

Entrada: dias `{letra, ativo, exercicios[{grupo, series, seriesAquecimento, tecnica, secundarios, contaVolume}]}` + `frequencia {letra→vezes/semana}` (derivada do calendário fixo ou rotativo) + `metas {grupo→{min,max}}`.
Saída: por grupo → séries por dia (sessão), total semanal (= séries válidas × frequência), meta, diferença, status neutro (`abaixo|na_meta|acima|sem_meta`), frequência por grupo, estímulo secundário (camada separada, nunca somado), exercícios a revisar; subtotais Inferiores/Superiores; avisos.

Regras garantidas por teste: aquecimento não conta; cardio/outro não contam; drop set/rest-pause/cluster = 1 série válida por série prescrita; dia desativado = 0; valores negativos/nulos = 0; grupo desconhecido vai para “Não classificado”; ABC 5x com A/B repetidos multiplica sem dupla contagem; rotativo usa média semanal e expõe microciclo.

## 6. Autorização

- **Banco**: RLS em todas as tabelas (treinador via `is_treinador()`, aluno via `aluno_id_atual()`; séries via dono da sessão; versões sem update/delete; memória só treinador; storage de fotos por pasta `<aluno_id>/`).
- **Links de e-mail**: `src/app/auth/callback/route.ts` troca `code` (PKCE) ou `token_hash` por sessão em cookie e segue para `next` (só caminhos relativos); falha → `/login?erro=link`. `/conta/senha` (`updateUser`) define ou troca a senha de quem já está logado.
- **Servidor**: `getSessao()` resolve papel e `aluno_id` por `auth.uid()`; páginas e APIs nunca recebem o aluno por constante ou parâmetro sem checagem (`podeAcessarAluno`). Página do treino confere `treino.aluno_id === sessao.alunoId` além da RLS.
- **Demo**: personas fixas; cookie `montinho_demo`; store em memória separado de qualquer dado real; nunca ativa em produção sem flag explícita.
- **Testes**: `scripts/sql/test-rls.sql` (aluno A não lê/escreve B; aluno não cria template nem lê memória; idempotência; versões imutáveis) e `src/lib/auth/guards.test.ts`.

## 7. Memória de prescrições (`src/lib/memoria/*`)

- Ao salvar um plano, o snapshot é **desidentificado** (sem nome, observações, cargas, ids de origem) → `extrairMetadados()` (objetivo, nível, split, dias, sessões/semana, duração, equipamentos, prioridades, técnicas, grupos principais, total de séries) → `hashEstrutura()` (dedupe) → `biblioteca_programas`.
- Busca (`buscarSemelhantes`): filtros obrigatórios (dias ±1, equipamentos disponíveis, restrições de movimento) → ranking explicável com pesos ajustáveis (`PESOS_PADRAO`) → busca textual com sinônimos PT-BR (`interpretarTexto`) → feedback explícito (útil/não útil/usei e adaptei/favorito) como desempate, nunca como “melhor cientificamente”.
- **IA opcional**: `FEATURES.iaMemoria` só liga com `AI_PROVIDER` + chave no servidor. Não há chamada implementada nesta versão; a busca estruturada é o caminho principal e sempre funciona. Quando for adicionada, deve enviar apenas metadados desidentificados, validar a resposta por schema e nunca escrever no banco sem aprovação.

## 8. Relatórios (`src/lib/relatorios/calcular.ts`)

- `resumoPeriodo`: sessões feitas/planejadas (planejadas = Σ frequência × dias/7), aderência e tendência vs período anterior equivalente, séries feitas/propostas, conquistas reais (consistência, recorde de carga/reps com histórico anterior, volume).
- `e1rmEpley` (carga × (1 + reps/30), válido 1–12 reps, declarado na UI), `melhoresMarcas`, `recordesNoPeriodo`, `evolucaoExercicio`, `tonelagem`, `calendarioSessoes`, `estadoSemana` (semana flexível, próxima letra), `alertasDoAluno` (evidência + janela + ação).

## 9. Tratamento de dados (LGPD)

- Dados sensíveis (anamnese, lesões, fotos, medidas) só para dono e treinador; fotos em bucket privado.
- Acervo reutilizável sem dados pessoais; exclusão do acervo não toca o histórico do aluno.
- Exportação CSV do próprio aluno (`/api/alunos/:id/exportar`).
- Nenhum dado é enviado a IA externa por padrão. Logs não incluem dados pessoais.

## 10. Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | app local (demo com `NEXT_PUBLIC_DEMO_MODE=true`) |
| `npm run lint` / `npm run typecheck` / `npm run build` | qualidade |
| `npm test` | 52 testes unitários |
| `PGHOST=… PGPORT=… PGUSER=… npm run db:test` | aplica migrations em Postgres local com stub do Supabase, seed legado e roda `test-rls.sql` |
| `scripts/db-local-reset.sh` | só aplica as migrations (sem testes) |
| `scripts/seed-demo.sql` | seed fictício para projeto Supabase de teste |
