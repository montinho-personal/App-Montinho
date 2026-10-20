# Entrega — Montinho Consistência 2.0 + Meu Chalalá de hoje

Estado em 20/10/2026. App em produção: <https://app-montinho.vercel.app>
(servidor em São Paulo, `gru1`, junto do banco Supabase `sa-east-1`).

Tudo abaixo foi implementado no app existente, sem reconstruir nada, com histórico
preservado (nada é apagado; exercícios/extras viram inativos) e acesso sempre pelo
usuário logado com RLS — a chave administrativa do Supabase não é usada para ler dados.

---

## 1. Funcionalidades implementadas

| Etapa | O que o aluno vê | O que o personal vê |
|---|---|---|
| 2 · Tempo do treino | — | Painel no montador: tempo total, execução, descanso e transição calculados de verdade; padrões editáveis (90 s entre séries, 120 s após o exercício, 3 s/rep, transição, preparo); descanso por série/exercício/treino; tempo-alvo com diferença; técnicas (drop set, rest-pause, myo-reps, cluster, superset) com lógica própria. |
| 3 · Ritmo do treino | Tempo decorrido/restante e término previsto (recalculados a cada série), estados “dentro / adiantado / atrasado” com tolerância e sem culpa, pausa do treino, timer por horário (funciona com tela bloqueada, app fechado, sem rede), check-in “Como você está hoje?”. | Duração estimada congelada em cada sessão. |
| 4 · Aderência | “Você completou X dos seus Y treinos desta semana”, sequência de semanas, calendário com concluído/parcial/extra/remanejado/descanso/pausa e dia clicável. | **Central de aderência**: meta individual versionada, pausas combinadas, aderência 28 dias, tendência, último/próximo treino, ordenações e sinais observáveis (sem rótulos psicológicos). |
| 5 · Flexibilidade | **Meu treino possível hoje** (20/30/45/60 min ou outro): versão que cabe no tempo sem encurtar descanso nem mudar técnica; se não houver versão segura, explica e permite pedir ajuste. **Treino extra**: opções liberado / mediante aprovação / não recomendado, sempre com o motivo; registro separado. | Prioridade por exercício (essencial / normal / pode adiar). **Treinos extras**: regras por aluno, extras liberados por modalidade, pedidos para aprovar/recusar, aviso de volume extra acima do combinado. |
| 6 · Chalalá e conquistas | Tela “CHALALÁ! TREINO CONCLUÍDO!” com resumo real, meta da semana, conquista e mensagem automática identificada; editor de card (4 modelos + 30 dias + reconhecimento), foto processada só no celular, Stories/Feed/Quadrado/PNG transparente, compartilhamento nativo com alternativa de download; **Minhas conquistas** (12 marcos, histórico permanente). Animação opcional, respeita “reduzir movimento”. | **Celebrar conquistas**: mensagem escrita por você (identificada como sua), aviso no celular opcional, card de reconhecimento e métricas de uso do compartilhamento. Página pública `/chalala` sem dados do aluno. |
| 7 · Relatórios e inteligência | **Evolução que não aparece no espelho** (Dado × Interpretação × critério); análise completa com tempo real × planejado, descanso típico, séries, extras, versões reduzidas, disposição e interrupções. | O mesmo relatório no perfil do aluno + pedidos de extra; **sugestões de acompanhamento** na Central com regra explicada e rascunho editável (ausência real, pausa, treino aberto sem finalizar, plano alterado, queda, retomada, sequência); regras ajustáveis. Nada é enviado automaticamente; sem IA. |
| 8 · Qualidade | Contraste AA, alvos de toque ≥ 24 px, layout do celular corrigido, carregamento imediato. | Central em cartões no celular; rolagem do painel corrigida. |

Antes da Consistência 2.0, na mesma sessão: técnicas avançadas no volume semanal,
retomar treino após fechar o app, conferência de séries ao concluir, lembrete push de treino aberto.

## 2. Arquivos modificados

124 arquivos (78 novos, 46 alterados), ~8 mil linhas, de `4bddea3` a hoje. Principais módulos novos:

- **Regras puras (testadas)**: `src/lib/tempo/` (estimar, prescricao, ritmo), `src/lib/aderencia/` (calcular, central), `src/lib/treino/` (possivel, extra), `src/lib/conquistas/` (regras, mensal, mapear), `src/lib/chalala/` (card, compartilhar, metricas), `src/lib/relatorios/` (invisivel, detalhe).
- **Dados (RLS)**: `src/lib/data/` aderencia, conquistas, extras, preferencias, sessoes.
- **Telas do aluno**: `aluno/conquistas`, `aluno/extra`, tela Chalalá (`src/components/chalala/`), início, evolução e treino.
- **Telas do personal**: `treinador/aderencia`, `treinador/conquistas`, `treinador/extras`, montador (prioridade, tempo), perfil do aluno.
- **APIs** (todas com zod): `/api/sessoes/[id]/chalala`, `/api/chalala/eventos`, `/api/conquistas/relatorio`, `/api/reconhecimentos`, `/api/extras/{avaliar,solicitar,registrar,decidir}`, `/api/alunos/[id]/{meta,pausas,extras}`, `/api/preferencias/{tempos,acompanhamento}`.
- **Configuração**: `vercel.json` (região `gru1`), `src/app/globals.css` (contraste, animação, alvo de toque).

## 3. Migrações

Todas **aplicadas em produção** e testadas no Postgres local:

| Migração | Conteúdo |
|---|---|
| 0016 | descanso após exercício, tempos/tempo-alvo do treino, preferências do personal |
| 0017 | tempos efetivos, tempo estimado, pausas, check-in pré-treino e modo da sessão |
| 0018 | metas semanais versionadas e pausas do aluno |
| 0019 | conquistas (únicas por aluno+código+referência), reconhecimentos, eventos do Chalalá, push para reconhecimento |
| 0020 | prioridade do exercício, regras e extras liberados, pedidos de extra, `extra_id` na sessão |
| 0021 | regras de acompanhamento ajustáveis |
| 0022 | desempenho das regras de acesso (`auth.uid()` uma vez por consulta) — mesmo acesso, mais rápido |

Nenhuma pendente. Próxima migração: `0023_…`.

## 4. Testes realizados e resultados

- **Unitários (Vitest)**: 28 arquivos, **235 testes, todos passando** — inclui todos os cenários obrigatórios de aderência (meta 3/2, meta 4/4, extra, pausa, sem prescrição, remanejada, troca de programa no meio da semana, sessão duplicada), tempo (4 séries, descansos, último exercício sem descanso, reps, cadência, superset, drop set, rest-pause, cluster, por tempo, aquecimento, tempo-alvo), ritmo (dentro/adiantado/atrasado, pausa, relógio do aparelho errado), treino extra (autorizado, sem autorização, limite de volume, semana já cumprida, não infla a aderência) e Chalalá (formatos, nomes longos, acentos, transparente, compartilhamento ok/cancelado/sem suporte).
- **Banco (Postgres local)**: **14 cenários de RLS, todos passando** — aluno A não acessa B; aluno não se autoaprova, não escreve reconhecimento, não duplica conquista; personal acessa os alunos; histórico preservado ao editar.
- **Ponta a ponta (Playwright, modo demonstração)**: Chalalá 25 + compartilhamento 2 + sem rede 3 + flexibilidade 21 + relatórios 12 + rolagem 14 + telas internas 7 — **todos passando, sem erros no console**.
- **Acessibilidade e celular**: varredura axe (WCAG 2 A/AA), rolagem horizontal, erros e alvos de toque em 32 combinações de página × tela (320 px, 412 px, 1366 px) — **sem pendências**.
- **Supabase (produção)**: avisos de segurança revisados (ver item 6); aviso de desempenho das regras de acesso corrigido (0022).

## 5. Capturas

Em `docs/entrega-consistencia/` (modo demonstração, dados fictícios):
conclusão Chalalá, card Stories, celebrar conquistas, versão reduzida, extra aprovado,
página de extras do personal, evolução do aluno e Central no celular.

## 6. Recursos pendentes (precisam de você ou ficaram para depois)

- **Ligar “proteção contra senhas vazadas”** no Supabase (Authentication → Providers → Email → Password security). É só um clique; não consegui fazer por aqui.
- **Configurar seus alunos reais**: meta semanal e pausas (aba Consistência), “permitir versão reduzida” e prioridades no montador, regras e extras liberados (Treinos extras). Tudo começa desligado de propósito.
- Extra resistido com exercícios próprios: hoje usa um treino do plano ou só registra a duração.
- Sem tela de mensagens bidirecional (o reconhecimento é do personal para o aluno; sugestões de acompanhamento são copiadas para o WhatsApp).
- Avisos informativos do Supabase mantidos conscientemente: `pg_net` no schema público (exigido pelo agendador), funções de segurança chamáveis (todas checam permissão ou a chave do agendador), chaves estrangeiras sem índice (volume atual pequeno), políticas permissivas múltiplas (desempenho só importa com muito volume).

## 7. Limitações dos navegadores

- **Publicar direto nos Stories**: nenhum navegador permite; o card vai para a lista de apps do celular (Android e iPhone recentes) ou é salvo no aparelho, e a publicação é finalizada no Instagram/WhatsApp. O app não afirma que algo foi publicado.
- **Som/vibração e notificações com a tela bloqueada**: dependem do navegador; o timer não depende disso (usa horário real ao voltar).
- **Push no iPhone**: só com o app adicionado à Tela de Início (iOS 16.4+).
- **Foto no card**: formatos que o navegador não abre (ex.: alguns HEIC no Android) mostram aviso; fotos grandes são reduzidas no próprio aparelho.
- **Conquistas**: são registradas quando o aluno abre o app após treinar (não há processamento em segundo plano).

## 8. Como executar localmente

```bash
npm install
cp .env.example .env.local          # para demonstração: NEXT_PUBLIC_DEMO_MODE=true
npm run dev                         # http://localhost:3000 (entrar como Aline ou Montinho)
npm run lint && npm run typecheck && npm test   # verificações antes de concluir
npm run db:test                     # migrações + testes de acesso no Postgres local
```

## 9. Como publicar

1. Envie para a branch `main` no GitHub → a Vercel publica sozinha em ~1 minuto.
2. Mudou o banco? Crie `supabase/migrations/0023_….sql`, rode `npm run db:test` e aplique no Supabase (SQL Editor ou MCP) **antes** do deploy que depende dela.
3. Confira em <https://app-montinho.vercel.app>.

## 10. Próximas melhorias recomendadas

1. **Validar com 2–3 alunos reais por 2 semanas** (meta, extras e Chalalá) antes de abrir para todos.
2. Mensagens no app (conversa personal ↔ aluno), para as sugestões não dependerem do WhatsApp.
3. Montador de extras com exercícios próprios e volume calculado.
4. Relatório geral do personal exportável (PDF/planilha) com filtros por período e aluno.
5. Índices nas chaves estrangeiras mais consultadas e consolidação de políticas quando a base crescer.
6. Vídeos verificados na biblioteca (os 150 exercícios ainda não têm mídia).
7. Revisão jurídica (LGPD) dos termos de foto e saúde.
