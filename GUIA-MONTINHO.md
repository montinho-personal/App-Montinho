# Guia do Montinho — como usar o app

Este guia é para você, Montinho. Termos técnicos foram evitados; quando aparecem, estão explicados.

## 1. Entrar

- **Com banco configurado (produção)**: abra o link do app, entre com seu e-mail e senha (ou peça “receber link no e-mail”). Seu usuário precisa estar com `role = treinador` na tabela `profiles` (ver SETUP.md, passo A5).
- **Modo demonstração (sem banco)**: a tela de entrada mostra personas fictícias. Escolha “Montinho (demo)” para o painel ou uma aluna para ver o app do aluno. Tudo é fictício e some ao reiniciar.

## 2. Cadastrar um aluno

Painel → **Alunos** → **+ Novo aluno**. Informe nome e e-mail (obrigatórios). O aluno recebe um convite por e-mail e já nasce como aluno. Até você montar um treino, o início dele mostra “Ainda não há treino liberado”.

## 3. Montar um treino

Abra o aluno → **Revisar treino** (ou **Montar treino**). O montador tem três áreas:

1. **Programa e semana** (clique para abrir): nome, objetivo, nível, divisão, duração prevista, equipamentos, e a **frequência**:
   - *Semana fixa*: escolha a letra de cada dia (Seg…Dom). Repetir uma letra (ex.: A na segunda e na quinta) conta duas vezes no volume.
   - *Ciclo rotativo*: sequência (ex.: A B C) e dias por semana (ex.: 5). O volume vira média semanal e o app mostra o microciclo.
   - *Modelos rápidos*: Full Body 3x, ABC 3x, ABC 5x, Upper/Lower 4x, ABCDE, PPL 6x.
2. **Dias A, B, C…**: um bloco por treino. Em cada linha: exercício (busca por nome e sinônimos da biblioteca), grupo muscular, séries, reps, descanso, RIR, observação para o aluno.
   - Ao digitar o nome, aparece a lista da biblioteca (ex.: “pulley” mostra as puxadas; “rosca scott” as variações). ↑/↓ escolhe, **Enter** confirma. Nome que não está na biblioteca também vale (fica “a classificar”).
   - **⇄ alternativas** (embaixo do nome) mostra substituições considerando os equipamentos, o nível e as restrições do aluno, com o motivo de cada uma. As que você aprovou na Biblioteca aparecem primeiro; as rejeitadas nunca aparecem.
   - **Enter** no nome adiciona a próxima linha; **Alt+↑/↓** move; botões ↑/↓ e arrastar também reordenam.
   - “Série a série” abre pirâmide (reps e descanso por série). “Duplicar”, “Copiar de…”, “Duplicar dia” e “Adicionar dia (F)” fazem o que dizem.
   - **Campos avançados** (chave no topo): séries de aquecimento, técnica (superset, bi-set, drop set, rest-pause, cluster, isometria, unilateral), bloco do superset, carga-alvo, “conta volume” (desligue para cardio/mobilidade) e músculos secundários.
   - Linhas com **⚠** cruzam a anamnese com o exercício (lesões/dores registradas).
3. **Tabela de volume** (direita no computador; botão “Volume semanal” no celular): recalcula a cada tecla.
   - **Técnicas avançadas**: em “campos avançados”, escolha Drop set, Rest-pause ou Myo-reps e informe quantos drops/mini-séries e em quantas séries. Na tabela, “Técnicas: …” escolhe como isso conta (Clássica = 1 por série; **Moderada** = +0,5 por drop/mini, padrão; Alta = cada drop vale 1). Números com `*` incluem técnicas. “Ajustar por RIR” reduz séries longe da falha. Detalhes e fontes: VOLUME-TECNICAS.md.

**Salvar** (ou Ctrl+S) grava uma **versão** do plano. Nada do histórico do aluno é apagado: exercícios removidos ficam arquivados, sessões antigas continuam ligadas à prescrição da época. Use “Motivo da alteração” para deixar registrado o porquê (o aluno vê como revisão sua). Desfazer/refazer: Ctrl+Z / Ctrl+Y.

## 4. Interpretar a tabela de volume

- **Unidade**: séries válidas por grupo e por semana (aquecimento, cardio e “não conta volume” ficam de fora).
- Colunas A, B, C… mostram as séries **por sessão**; **Sem.** multiplica pela frequência da letra.
- **Meta**: é sua, por aluno. “Editar metas” permite min–máx por grupo; “Preencher com faixas de referência” usa faixas heurísticas (por nível) como ponto de partida — não são limites clínicos nem “ideal” universal.
- Rótulos são neutros: *abaixo da meta definida*, *na meta definida*, *acima da meta definida*, *sem meta*.
- **Freq.**: em quantas sessões por semana o grupo recebe séries.
- **Secundário (estimado)**: camada opcional que atribui uma fração de série (padrão 50 %) aos músculos secundários. Fica em coluna separada e nunca entra no total.
- **Programado × realizado**: compara com a média semanal das sessões concluídas nos últimos 28 dias.
- Quadríceps, posteriores, glúteos e panturrilhas aparecem **separados**; “Inferiores (soma)” é só a soma. Exercícios antigos marcados como “Pernas (a classificar)” e “Não classificado” continuam contados e pedem sua revisão (grupo com borda amarela).
- Quando você escolhe um grupo manualmente, o app guarda a correção e aplica nas próximas vezes em que digitar o mesmo exercício.

## 5. Memória inteligente (“Já montei algo parecido?”)

Cada plano salvo entra no acervo **sem dados do aluno** (só a estrutura). No montador, o botão **Já montei algo parecido?** busca por contexto do aluno (dias, objetivo, nível, divisão, prioridades, equipamentos) e por texto livre (“4 dias, glúteos, upper/lower, academia”). Para cada sugestão: por que apareceu, similaridade, data, e ações **Visualizar**, **Comparar volume**, **Usar como base** (clona tudo; os treinos atuais viram histórico), **Usar só este dia**, **Favoritar**, **útil/não útil**. Em **Memória de treinos** você vê o acervo, escreve justificativas, favorita e exclui exemplos (sem afetar o histórico do aluno). Não há IA: é busca estruturada, explicável e sempre disponível.

## 6. Acompanhar o aluno

- **Visão geral**: alertas com evidência + janela + ação (“1 de 6 sessões planejadas · últimas 2 semanas · conversar e ajustar frequência”), pedidos de adaptação em aberto, treinos recentes.
- **Ficha do aluno** → abas: Plano (treinos + volume), **Evolução** (resumo e análise completa: frequência, força com e1RM declarado, volume programado × realizado, recuperação, medidas, histórico do plano), **Acompanhamento** (responder pedidos; registrar notas/decisões — marque “visível para o aluno” quando quiser que ele veja, com sua assinatura), Medidas e fotos, Check-ins, Dieta.
- **Exportar registros (CSV)** na aba Evolução.

## 7. O que o aluno vê

Início (próximo treino + “Começar treino”, progresso da semana com denominador do programa, última conquista real, check-in opcional, suas mensagens assinadas) · Treinar (todos os treinos, sugerido primeiro, semana flexível) · Treino ativo (última carga como referência, concluir série com um toque, timer de descanso, “Não consegui este exercício”, indicador “pendente de sincronização” quando a rede cai) · Evolução · Perfil.

## 8. Dúvidas frequentes

- *Mudei o treino e o aluno estava treinando?* A sessão dele segue com a prescrição da época (snapshot). O novo plano vale a partir do próximo treino.
- *Apaguei um exercício sem querer?* Ctrl+Z antes de salvar. Depois de salvar, o histórico de sessões continua íntegro; o exercício aparece em “Histórico do plano”.
- *Sem internet na academia?* As séries ficam no aparelho e sobem sozinhas quando voltar a conexão. Vídeos precisam de internet.


## Biblioteca de exercícios (menu Biblioteca)

- 150 exercícios de musculação já cadastrados, com sinônimos, músculo principal e secundários, padrão de movimento, equipamento, dicas de execução e erros comuns.
- **Buscar**: por nome, apelido (“pulley”, “stiff”, “hack”), grupo, equipamento ou padrão. Filtros por grupo, equipamento, padrão, tipo, só favoritos e “sem vídeo”.
- **★ Favoritos**: aparecem primeiro na busca do montador. Só você vê os seus.
- **Substituições**: em cada exercício, aprove ✓ ou rejeite ✗ as sugestões. Isso muda o que o montador oferece. “Mesmo músculo” sozinho nunca vira substituição automática.
- **Vídeos**: nenhum vem preenchido (não inventamos links). Ao editar, cole o link e marque “verificado”; só então o aluno vê o vídeo.
- **Editar** um exercício do catálogo o torna “seu”: atualizações futuras do catálogo não mexem nele. **Arquivar** esconde da busca sem afetar treinos que já usam.
- **Volume ponderado (estimado)**: na tabela de volume, ligue a chave para somar os secundários pelos pesos da biblioteca (ex.: supino = 1 série de peito + 0,5 de tríceps + 0,5 de ombro anterior). É uma estimativa, explicada na própria tela.

## Lembrete de treino em aberto (aluno)

- Ao começar um treino (ou no **Perfil**), o aluno vê “Quer um lembrete se esquecer de finalizar o treino?” → **Ativar lembretes** → o celular pede permissão.
- Se ele ficar **30 minutos sem registrar nenhuma série** com o treino aberto, chega a notificação “Treino X ainda está em aberto · você registrou N de M séries”. Tocar abre o treino para conferir e finalizar. É **1 lembrete por treino**.
- **iPhone**: só funciona com o app adicionado à Tela de Início (Compartilhar → Adicionar à Tela de Início) e aberto por esse ícone. Android/computador: funciona no navegador.
- Para parar: Perfil → Desativar.
