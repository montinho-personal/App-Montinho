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
- 🟡 Vídeo demonstrativo: usa a biblioteca quando o nome bate; não há validação de fonte (campo `video_validado` existe, sem UI).
- 🟡 Versão reduzida “hoje tenho só 30 min”: flag `permite_versao_reduzida` existe no programa; a UI do aluno ainda não oferece a versão reduzida.

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
2. **Credenciais**: criar projeto Supabase, rodar as migrations 0001→0009 na ordem, configurar `.env.local`/Vercel (SETUP.md). Sem isso o app só roda em demo.
3. **Primeiro treinador**: após criar sua conta, mudar `role` para `treinador` em `profiles`.
4. **Biblioteca de exercícios**: revisar grupos (a importação antiga usa `pernas`); classificar os itens em quadríceps/posteriores etc. Enquanto isso, o montador marca “a classificar”.
5. **WhatsApp de atendimento**: preencher `BRAND.contact.whatsapp` se quiser o botão “Falar com o Montinho”.
6. **Validação jurídica (LGPD)**: termos/consentimento para anamnese e fotos. O app tem a base técnica (RLS, bucket privado, exportação), não o texto legal.

## Pontos de risco

- **Migração em produção**: 0009 migra o logbook em transação única; em bases grandes, rodar fora do horário de uso. Nenhum dado é apagado; é reversível por `drop` das tabelas novas (mantendo o logbook).
- **Dev server (demo)**: o estado em memória some ao reiniciar — por desenho.
- **Rotas legadas** (`/api/templates`, `/api/biblioteca`, `/api/dieta/calculo`, `/api/importacoes/videos`) agora passam por RLS; se alguma policy antiga faltar, retornam erro em vez de vazar (comportamento seguro, mas conferir ao migrar).
- **Páginas antigas de templates/prescrição** foram mantidas e funcionam, mas usam o modelo antigo de template (`templates_treino`); a memória de prescrições é o caminho novo.

## Próximos passos sugeridos (ordem)

1. Subir Supabase + migrations + primeiro treinador; testar login real e RLS com dois alunos (CHECKLIST-TESTES.md, cenário G em produção).
2. Revisar a biblioteca de exercícios (grupos e vídeos validados).
3. Versão reduzida do treino (30 min) com priorização pré-aprovada por exercício.
4. Lembretes opt-in e PWA.
5. Camada de IA opcional na memória, com schema de resposta e auditoria.
