# Roadmap — Montinho Personal Trainer

Estado em 19/10/2026. Legenda: ✅ entregue e testado · 🟡 parcial · ⬜ futuro.

## Entregue por fase

### P0 — Fundação
- ✅ Identidade por sessão no servidor; `ALUNO_ID` fixo removido; guards para páginas e APIs.
- ✅ Cliente autenticado (RLS) em toda leitura/escrita; service role restrita ao convite.
- ✅ Modo demo explícito e isolado; `nao_configurado` bloqueia páginas privadas.
- ✅ Migrations 0008/0009: grupos separados, ids estáveis + soft delete, versões imutáveis, sessões/séries idempotentes, adaptações, intervenções, memória desidentificada, correções de grupo, migração do logbook sem perda, RLS, RPC segura.
- ✅ Validação zod, logging sem dados pessoais, índices.
- ✅ Testes: 52 unitários + 6 cenários SQL (RLS/migração) em Postgres local.

### P1 — Montador + aluno + marca
- ✅ Montador A–H com frequência/calendário (fixo e rotativo), presets, grupo com confiança e correção reutilizável, aquecimento, técnicas, pirâmide, reordenar (acessível e arrastar), duplicar, copiar entre dias, desfazer/refazer, Ctrl+S, alertas de lesão, motivo da versão.
- ✅ Tabela de Volume Semanal sticky (desktop) / painel (celular), filtros, ordenação, compacto, metas por aluno, prioridades, secundário opcional, programado × realizado, subtotais.
- ✅ Aluno: início com próximo treino e CTA, retomada sem culpa, Treinar, treino ativo com sessão real, fila local idempotente com indicador, última carga/reps, timer, séries extras, pular, pedido de adaptação, finalização com resumo e feedback opcional; Evolução em camadas; Perfil; Dieta preservada.
- ✅ Marca Montinho (logo oficial do site, dourado, DM Sans), acessibilidade básica (foco, 44 px, reduced motion, labels).
- ✅ Biblioteca inteligente: 150 exercícios (catálogo v1), busca por sinônimos, filtros, favoritos, substituições revisáveis pelo treinador, volume ponderado configurável, deltoides separados.
- ✅ Lembrete push de treino em aberto: 30 min sem registrar série → notificação “ainda está em aberto” (1 por treino). Aluno ativa no treino ou no Perfil; no iPhone, só com o app na Tela de Início.
- ✅ Conferência ao concluir: avisa as séries sem ✓ (separando as já preenchidas), com “Ir marcar”, “Marcar as preenchidas e concluir” e “Concluir assim mesmo”.
- ✅ Retomar treino: se o app fechar, o aluno volta ao mesmo exercício com o que digitou, séries extras e o descanso em curso (rascunho no aparelho, `src/lib/sync/rascunho.ts`).
- ✅ Técnicas avançadas no volume: drop set, rest-pause e myo-reps com drops/mini-séries e regra declarada (Clássica/Moderada/Alta) + ajuste opcional por RIR (VOLUME-TECNICAS.md).
- ✅ Consistência 2.0 — duração estimada no montador (execução, descansos, transições, técnicas, tempo-alvo) e ritmo do treino (decorrido/restante, pausa, estados sem culpa, relógio do servidor).
- ✅ Consistência 2.0 — aderência: meta semanal por aluno (versionada), pausas combinadas, índice semana/28 dias/12 semanas/total, sequência de semanas, calendário com dia clicável, Central de aderência do personal com sinais observáveis (sem rótulos psicológicos). Regras em `src/lib/aderencia/`.
- ✅ Meu Chalalá de hoje: tela “CHALALÁ! TREINO CONCLUÍDO!” com resumo real (duração sem pausas, exercícios, séries, meta da semana), conquista da sessão e mensagem automática identificada; 4 modelos de card (Treino pago, Missão cumprida, Nova conquista, Eu voltei) + card de 30 dias + card de reconhecimento; editor com foto local, cores oficiais, frases aprovadas, métricas opcionais, desfazer/restaurar; exportação 1080×1920, 1080×1350, 1080×1080 e PNG transparente; compartilhamento nativo com fallback para download.
- ✅ Conquistas persistidas e idempotentes (12 marcos, histórico em “Minhas conquistas”), recordes só com 2+ registros comparáveis e nunca com dor relatada.
- ✅ “Celebrar conquistas” (personal): mensagem escrita por ele, aviso push opcional, card de reconhecimento e métricas agregadas de uso do compartilhamento. Página pública `/chalala` sem dados do aluno.
- ✅ Relatórios (etapa 7): evolução invisível com **Dado** separado de **Interpretação** e critério (mais treinos que o período anterior, regularidade de meses, metas cumpridas, mais reps na mesma carga, força estimada com ressalva, retomada); detalhado com tempo real × planejado, descanso típico (só com dados confiáveis), séries prescritas × feitas, extras e versões reduzidas, disposição antes do treino, interrupções e retomadas; no perfil, o personal vê também os pedidos de extra.
- ✅ Sugestões de acompanhamento na Central (regras fixas e transparentes, sem IA): distinguem ausência real, pausa combinada, treino aberto sem finalizar (registro), plano alterado recentemente, queda, retomada e sequência; rascunho editável para copiar ou enviar como reconhecimento — nada é enviado automaticamente. Regras ajustáveis pelo personal. Central em cartões no celular.
- ✅ Correções: rolagem travada no painel do personal no celular; servidor movido para São Paulo (gru1), junto do banco; carregamento imediato ao navegar.
- 🟡 Registro do aluno ainda não tem tipo “drop/mini-série”: o realizado não recebe bônus de técnica.
- 🟡 Vídeo demonstrativo: o aluno só vê vídeo marcado como verificado pelo treinador. **Nenhum dos 150 tem vídeo ainda** (pendência de mídia).
- ✅ Meu treino possível hoje: aluno escolhe 20/30/45/60 min ou outro; com a versão reduzida liberada no programa, o app tira exercícios inteiros (primeiro “pode adiar”, depois “normal”; “essencial” nunca), sem encurtar descanso nem mudar técnica; abaixo de 40% das séries ou sem caber → explica e oferece “Pedir ajuste”. O servidor recalcula; a versão realizada fica registrada (modo reduzido + o que ficou para outro dia).
- ✅ Treino extra: regras por aluno (liberar, aprovação manual, máximo por semana, dias, limite de séries extras, intervalo mínimo), extras liberados por modalidade, classificação liberado / mediante aprovação / não recomendado com motivos, pedidos aprovados ou recusados pelo personal, registro separado (não conta na meta), aviso de volume extra acima do combinado.

### P2 — Memória, relatórios, painel
- ✅ Memória de prescrições: snapshot automático desidentificado, dedupe, busca estruturada explicável, texto em PT-BR, feedback/favoritos/justificativa, usar como base / só um dia, página do acervo. Testes (equipamento ausente, restrições, sem dados do aluno, acervo vazio, dedupe).
- ✅ Relatórios: resumo (denominador correto, tendência, conquistas reais) + análise (frequência, força/e1RM, volume programado × realizado, recuperação, medidas, histórico do plano); exportação CSV.
- ✅ Painel do treinador com alertas evidência + janela + ação; acompanhamento com adaptações e intervenções assinadas.
- 🟡 Comparação de períodos equivalentes só para aderência (não para cada gráfico).
- 🟡 Gráficos: linha de carga por exercício e calendário; sem gráfico de tonelagem por grupo.

### P3 — Opcional
- ⬜ Camada LLM/embeddings na memória (interface prevista em `FEATURES.iaMemoria`; sem chamadas implementadas).
- ⬜ Notificações/lembretes opt-in com horário silencioso (`alunos.preferencias` reservado).
- ⬜ PWA instalável; cache de mídias.
- ⬜ Envio de mensagens (chat) — hoje só leitura de `mensagens`; a aba “Mensagens” fica fora da navegação até existir.
- ⬜ Upload de fotos/medidas pelo aluno (hoje só leitura; o treinador registra).

## Pendências reais (precisam de você)

1. **Logotipo original**: o app usa o SVG público do site oficial. Se houver arquivo vetorial do designer (com variações de cor), substitua `public/brand/logo.svg`, `logo-fundo-claro.svg` e `mark.svg`.
2. **Ativação final** (SETUP.md → "Pendências de ativação"): colar a chave `service_role` na Vercel (convite de alunos), liberar `https://app-montinho.vercel.app` em Auth → URL Configuration e criar sua conta. O projeto Supabase, as migrations 0001→0021 e o deploy na Vercel já estão feitos.
3. **Primeiro treinador**: após criar sua conta, mudar `role` para `treinador` em `profiles`.
4. **Biblioteca de exercícios**: revisar a lista curada de 150 (foi montada pelo Claude, não veio de uma lista sua), aprovar/rejeitar substituições e cadastrar vídeos verificados. Cardio (esteira, bike) ficou fora por escopo.
5. **WhatsApp de atendimento**: preencher `BRAND.contact.whatsapp` se quiser o botão “Falar com o Montinho”.
6. **Validação jurídica (LGPD)**: termos/consentimento para anamnese e fotos. O app tem a base técnica (RLS, bucket privado, exportação), não o texto legal.

## Pontos de risco

- **Migração em produção**: 0009 migra o logbook em transação única; em bases grandes, rodar fora do horário de uso. Nenhum dado é apagado; é reversível por `drop` das tabelas novas (mantendo o logbook).
- **Dev server (demo)**: o estado em memória some ao reiniciar — por desenho.
- **Rotas legadas** (`/api/templates`, `/api/biblioteca`, `/api/dieta/calculo`, `/api/importacoes/videos`) agora passam por RLS; se alguma policy antiga faltar, retornam erro em vez de vazar (comportamento seguro, mas conferir ao migrar).
- **Páginas antigas de templates/prescrição** foram mantidas e funcionam, mas usam o modelo antigo de template (`templates_treino`); a memória de prescrições é o caminho novo.

## Próximos passos sugeridos (ordem)

1. Subir Supabase + migrations + primeiro treinador; testar login real e RLS com dois alunos (CHECKLIST-TESTES.md, cenário G em produção).
2. Revisar a biblioteca de exercícios (vídeos verificados para os 150; aprovar substituições).
3. Versão reduzida do treino (30 min) com priorização pré-aprovada por exercício.
4. Lembretes opt-in e PWA.
5. Camada de IA opcional na memória, com schema de resposta e auditoria.
