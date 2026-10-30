-- ============================================================================
-- 0133 — Montinho Multimodalidade, fase 2 (aprovada pelo Montinho em 30/10/2026).
-- TUDO ADITIVO: nada é apagado e nenhuma coluna existente muda de sentido.
--  • treinos.modalidade / training_sessions.modalidade: 'musculacao' (padrão,
--    tudo o que existe continua igual) | 'cross' | 'hyrox' | 'funcional' | 'hibrido'.
--  • treinos.blocos: a estrutura do WOD/HYROX/circuito (vazia na musculação).
--    O bloco de FORÇA usa as linhas de `exercicios` de sempre (séries × reps).
--  • exercicios_biblioteca: modalidades, permite_pr, regressoes + movimentos
--    novos de LPO, ginástica, condicionamento e funcional (nome em inglês,
--    sinônimos em português; todos sem vídeo por enquanto).
--  • sessao_blocos: o resultado de cada bloco feito (AMRAP, For Time, EMOM…),
--    1 linha por (sessão, bloco), RX / Scaled / adaptado.
--  • benchmarks: definições versionadas (versão nova = linha nova).
--  • marcas_pessoais: marca anotada fora de um treino (1RM testado na aula,
--    primeiro movimento técnico — este só o personal registra).
-- RLS no padrão das sessões: aluno só o dele, personal tudo, visitante vencido
-- não grava (pode_registrar()). Idempotente.
-- ============================================================================

-- 1) Modalidade do treino prescrito e da sessão -------------------------------
alter table treinos add column if not exists modalidade text not null default 'musculacao';
alter table treinos add column if not exists blocos jsonb not null default '[]'::jsonb;
alter table treinos drop constraint if exists treinos_modalidade_check;
alter table treinos add constraint treinos_modalidade_check check (modalidade in ('musculacao', 'cross', 'hyrox', 'funcional', 'hibrido'));
alter table treinos drop constraint if exists treinos_blocos_check;
alter table treinos add constraint treinos_blocos_check check (jsonb_typeof(blocos) = 'array' and jsonb_array_length(blocos) <= 12);

alter table training_sessions add column if not exists modalidade text not null default 'musculacao';
alter table training_sessions drop constraint if exists training_sessions_modalidade_check;
alter table training_sessions add constraint training_sessions_modalidade_check check (modalidade in ('musculacao', 'cross', 'hyrox', 'funcional', 'hibrido'));
create index if not exists training_sessions_aluno_modalidade_idx on training_sessions (aluno_id, modalidade, iniciado_em desc);

-- 2) Biblioteca -----------------------------------------------------------------
alter table exercicios_biblioteca add column if not exists modalidades text[] not null default '{musculacao}';
alter table exercicios_biblioteca add column if not exists permite_pr boolean not null default true;
alter table exercicios_biblioteca add column if not exists regressoes text[] not null default '{}';

insert into exercicios_biblioteca (nome, slug, grupo_muscular, grupos_secundarios, equipamento, instrucoes, sinonimos, fonte_classificacao, padrao_movimento, articulacoes, tipo_movimento, erros_comuns, campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, origem, video_provider, video_id, video_validado, modalidades, permite_pr, regressoes)
values
-- Levantamento olímpico (contam volume: são o bloco de força do Cross Training)
('Snatch', 'snatch', 'posteriores', '{gluteo,quadriceps,trapezio,ombros}', '{barra}',
  array['Pegada aberta, barra perto das canelas, costas retas e peito aberto.', 'Puxe a barra do chão estendendo joelhos e quadril com força, com a barra perto do corpo.', 'Puxe o corpo para baixo da barra e receba em agachamento profundo, braços estendidos acima da cabeça.', 'Fique de pé com a barra estável acima da cabeça.'],
  array['arranco', 'arranque', 'squat snatch', 'snatch completo'], 'manual', 'dobradica_quadril', array['quadril', 'joelho', 'ombro', 'tornozelo'], 'multiarticular',
  array['Puxar com os braços antes de estender o quadril.', 'Barra longe do corpo.', 'Receber com os braços dobrados.'],
  array['carga', 'repeticoes'], '{"gluteo":0.5,"quadriceps":0.5,"trapezio":0.25,"ombros":0.25}'::jsonb, array['ombro', 'lombar'], 'avancado', true, 'treinador', null, null, false,
  '{cross}', true, array['Hang Power Snatch', 'Snatch com cabo de vassoura (PVC)', 'Overhead Squat leve']),
('Power Snatch', 'power-snatch', 'posteriores', '{gluteo,quadriceps,trapezio,ombros}', '{barra}',
  array['Mesma saída do Snatch.', 'Estenda quadril e joelhos com explosão e puxe a barra acima da cabeça.', 'Receba a barra com os joelhos pouco flexionados (acima do paralelo).'],
  array['arranco de potência', 'power snatch', 'meio arranco'], 'manual', 'dobradica_quadril', array['quadril', 'joelho', 'ombro'], 'multiarticular',
  array['Puxar com os braços cedo demais.', 'Pular para frente ao receber.', 'Receber com cotovelos dobrados.'],
  array['carga', 'repeticoes'], '{"gluteo":0.5,"quadriceps":0.5,"trapezio":0.25,"ombros":0.25}'::jsonb, array['ombro', 'lombar'], 'intermediario', true, 'treinador', null, null, false,
  '{cross}', true, array['Hang Power Snatch', 'Snatch com cabo de vassoura (PVC)']),
('Hang Snatch', 'hang-snatch', 'posteriores', '{gluteo,quadriceps,trapezio,ombros}', '{barra}',
  array['Comece em pé com a barra nas coxas (posição de hang).', 'Desça a barra até acima dos joelhos com o quadril para trás.', 'Estenda o quadril com explosão e receba a barra acima da cabeça.'],
  array['arranco suspenso', 'hang snatch', 'hang power snatch'], 'manual', 'dobradica_quadril', array['quadril', 'joelho', 'ombro'], 'multiarticular',
  array['Dobrar os joelhos à frente em vez de levar o quadril para trás.', 'Barra longe do corpo.', 'Receber com cotovelos dobrados.'],
  array['carga', 'repeticoes'], '{"gluteo":0.5,"quadriceps":0.5,"trapezio":0.25,"ombros":0.25}'::jsonb, array['ombro', 'lombar'], 'intermediario', true, 'treinador', null, null, false,
  '{cross}', true, array['Snatch com cabo de vassoura (PVC)', 'Kettlebell Swing']),
('Clean', 'clean', 'posteriores', '{gluteo,quadriceps,trapezio}', '{barra}',
  array['Pegada um pouco mais aberta que os ombros, barra perto das canelas, costas retas.', 'Puxe a barra estendendo joelhos e quadril com força, perto do corpo.', 'Gire os cotovelos para frente e receba a barra nos ombros em agachamento frontal.', 'Fique de pé.'],
  array['squat clean', 'clean completo', 'arremesso (primeiro tempo)'], 'manual', 'dobradica_quadril', array['quadril', 'joelho', 'punho', 'tornozelo'], 'multiarticular',
  array['Puxar com os braços.', 'Cotovelos baixos ao receber.', 'Barra batendo longe do corpo.'],
  array['carga', 'repeticoes'], '{"gluteo":0.5,"quadriceps":0.5,"trapezio":0.25}'::jsonb, array['lombar', 'cotovelo_punho'], 'avancado', true, 'treinador', null, null, false,
  '{cross}', true, array['Hang Power Clean', 'Clean com halter', 'Agachamento frontal']),
('Power Clean', 'power-clean', 'posteriores', '{gluteo,quadriceps,trapezio}', '{barra}',
  array['Mesma saída do Clean.', 'Estenda quadril e joelhos com explosão.', 'Receba a barra nos ombros com os joelhos pouco flexionados (acima do paralelo).'],
  array['power clean', 'clean de potência', 'meio arremesso'], 'manual', 'dobradica_quadril', array['quadril', 'joelho', 'punho'], 'multiarticular',
  array['Puxar com os braços cedo demais.', 'Cotovelos baixos ao receber.', 'Costas arredondadas na saída do chão.'],
  array['carga', 'repeticoes'], '{"gluteo":0.5,"quadriceps":0.5,"trapezio":0.25}'::jsonb, array['lombar', 'cotovelo_punho'], 'intermediario', true, 'treinador', null, null, false,
  '{cross}', true, array['Hang Power Clean', 'Clean com halter']),
('Hang Clean', 'hang-clean', 'posteriores', '{gluteo,quadriceps,trapezio}', '{barra}',
  array['Comece em pé com a barra nas coxas.', 'Desça a barra até acima dos joelhos com o quadril para trás.', 'Estenda o quadril com explosão e receba a barra nos ombros.'],
  array['clean suspenso', 'hang clean', 'hang power clean'], 'manual', 'dobradica_quadril', array['quadril', 'joelho', 'punho'], 'multiarticular',
  array['Dobrar os joelhos à frente.', 'Puxar com os braços.', 'Cotovelos baixos ao receber.'],
  array['carga', 'repeticoes'], '{"gluteo":0.5,"quadriceps":0.5,"trapezio":0.25}'::jsonb, array['lombar', 'cotovelo_punho'], 'intermediario', true, 'treinador', null, null, false,
  '{cross}', true, array['Clean com halter', 'Kettlebell Swing']),
('Clean & Jerk', 'clean-and-jerk', 'posteriores', '{gluteo,quadriceps,ombros,triceps}', '{barra}',
  array['Faça o Clean até ficar de pé com a barra nos ombros.', 'Flexione levemente os joelhos (dip) e empurre a barra com as pernas.', 'Receba a barra acima da cabeça com os braços estendidos (split ou push) e junte os pés.'],
  array['arremesso', 'clean and jerk', 'clean e jerk', 'c&j'], 'manual', 'dobradica_quadril', array['quadril', 'joelho', 'ombro', 'punho'], 'multiarticular',
  array['Empurrar só com os braços no jerk.', 'Tronco inclinado à frente no dip.', 'Barra à frente da cabeça no final.'],
  array['carga', 'repeticoes'], '{"gluteo":0.5,"quadriceps":0.5,"ombros":0.5,"triceps":0.25}'::jsonb, array['lombar', 'ombro'], 'avancado', true, 'treinador', null, null, false,
  '{cross}', true, array['Power Clean + Push Press', 'Clean & Jerk com halter']),
('Split Jerk', 'split-jerk', 'ombros', '{triceps,quadriceps,gluteo}', '{barra}',
  array['Barra nos ombros, cotovelos à frente.', 'Dip curto com o tronco reto e empurre a barra com as pernas.', 'Receba abrindo as pernas (uma à frente, outra atrás) com os braços estendidos e volte juntando os pés.'],
  array['split jerk', 'jerk afundo', 'arremesso com afundo'], 'manual', 'empurrar_vertical', array['ombro', 'cotovelo', 'joelho'], 'multiarticular',
  array['Empurrar só com os braços.', 'Passo de trás curto demais.', 'Barra à frente da cabeça.'],
  array['carga', 'repeticoes'], '{"triceps":0.5,"quadriceps":0.25,"gluteo":0.25}'::jsonb, array['ombro'], 'avancado', true, 'treinador', null, null, false,
  '{cross}', true, array['Push Press', 'Push Jerk']),
('Push Jerk', 'push-jerk', 'ombros', '{triceps,quadriceps}', '{barra}',
  array['Barra nos ombros, cotovelos à frente.', 'Dip curto e empurre a barra com as pernas.', 'Desça por baixo da barra com os joelhos flexionados, braços estendidos, e fique de pé.'],
  array['push jerk', 'jerk de potência'], 'manual', 'empurrar_vertical', array['ombro', 'cotovelo', 'joelho'], 'multiarticular',
  array['Empurrar só com os braços.', 'Tronco inclinado no dip.', 'Receber com os cotovelos dobrados.'],
  array['carga', 'repeticoes'], '{"triceps":0.5,"quadriceps":0.25}'::jsonb, array['ombro'], 'intermediario', true, 'treinador', null, null, false,
  '{cross}', true, array['Push Press', 'Desenvolvimento militar em pé']),
-- Ginásticos
('Chest-to-Bar Pull-Up', 'chest-to-bar', 'costas', '{biceps,antebraco}', '{barra_fixa}',
  array['Pendurado na barra, pegada um pouco mais aberta que os ombros.', 'Puxe até o peito encostar na barra.', 'Desça com controle até os braços estenderem.'],
  array['chest to bar', 'c2b', 'barra fixa até o peito', 'pull-up até o peito'], 'manual', 'puxar_vertical', array['ombro', 'escapula', 'cotovelo'], 'multiarticular',
  array['Só o queixo passar da barra.', 'Balanço sem controle.', 'Não estender os braços embaixo.'],
  array['repeticoes', 'assistencia'], '{"biceps":0.5,"antebraco":0.25}'::jsonb, array['ombro'], 'intermediario', true, 'treinador', null, null, false,
  '{cross}', true, array['Barra fixa pronada', 'Barra fixa com elástico', 'Remada australiana']),
('Toes-to-Bar', 'toes-to-bar', 'abdomen', '{core,antebraco}', '{barra_fixa}',
  array['Pendurado na barra, braços estendidos.', 'Leve os pés até encostarem na barra, com controle.', 'Desça as pernas sem balançar demais.'],
  array['toes to bar', 't2b', 'pés na barra'], 'manual', 'flexao_quadril', array['ombro', 'quadril', 'coluna'], 'multiarticular',
  array['Balanço sem controle.', 'Só um pé encostar.', 'Soltar a pegada no meio da série.'],
  array['repeticoes'], '{"core":0.5,"antebraco":0.25}'::jsonb, array['ombro'], 'intermediario', true, 'treinador', null, null, false,
  '{cross}', true, array['Elevação de joelhos na barra (knees-to-elbows)', 'Elevação de pernas deitado']),
('Bar Muscle-Up', 'bar-muscle-up', 'costas', '{triceps,peito,biceps}', '{barra_fixa}',
  array['Pendurado na barra, faça um balanço controlado.', 'Puxe o quadril e o peito até a barra e passe o tronco por cima.', 'Termine empurrando até estender os braços acima da barra.'],
  array['bar muscle up', 'muscle up na barra', 'bmu'], 'manual', 'puxar_vertical', array['ombro', 'escapula', 'cotovelo', 'punho'], 'multiarticular',
  array['Puxar só com os braços, sem o quadril.', 'Chegar com um braço de cada vez.', 'Cair sem controle.'],
  array['repeticoes', 'assistencia'], '{"triceps":0.5,"peito":0.25,"biceps":0.25}'::jsonb, array['ombro', 'cotovelo_punho'], 'avancado', true, 'treinador', null, null, false,
  '{cross}', true, array['Chest-to-Bar Pull-Up', 'Muscle-up com elástico', 'Transição no chão']),
('Ring Muscle-Up', 'ring-muscle-up', 'costas', '{triceps,peito,biceps}', '{outro}',
  array['Nas argolas, pegada falsa (punho por cima).', 'Puxe as argolas até o peito e gire o tronco por cima delas (transição).', 'Empurre até estender os braços (como uma paralela).'],
  array['ring muscle up', 'muscle up nas argolas', 'rmu', 'muscle up'], 'manual', 'puxar_vertical', array['ombro', 'escapula', 'cotovelo', 'punho'], 'multiarticular',
  array['Perder a pegada falsa.', 'Transição lenta com os cotovelos abertos.', 'Ombro sem controle embaixo.'],
  array['repeticoes', 'assistencia'], '{"triceps":0.5,"peito":0.25,"biceps":0.25}'::jsonb, array['ombro', 'cotovelo_punho'], 'avancado', true, 'treinador', null, null, false,
  '{cross}', true, array['Muscle-up baixo (pés no chão)', 'Barra fixa nas argolas + paralela nas argolas']),
('Handstand Push-Up', 'handstand-push-up', 'ombros', '{triceps,trapezio}', '{peso_corporal}',
  array['Parada de mão com os pés na parede, mãos um pouco mais abertas que os ombros.', 'Desça com controle até a cabeça encostar (ou chegar ao apoio).', 'Empurre até estender os braços.'],
  array['handstand push up', 'hspu', 'flexão em parada de mão', 'flexão invertida'], 'manual', 'empurrar_vertical', array['ombro', 'cotovelo', 'punho'], 'multiarticular',
  array['Cair rápido de cabeça.', 'Arquear demais a lombar.', 'Cotovelos muito abertos.'],
  array['repeticoes', 'assistencia'], '{"triceps":0.5,"trapezio":0.25}'::jsonb, array['ombro', 'cotovelo_punho'], 'avancado', true, 'treinador', null, null, false,
  '{cross}', true, array['Pike push-up (pés no banco)', 'Desenvolvimento com halteres', 'Handstand push-up com amortecimento']),
('Handstand Walk', 'handstand-walk', 'ombros', '{triceps,core}', '{peso_corporal}',
  array['Suba em parada de mão com o corpo alinhado e o abdômen firme.', 'Ande com as mãos em passos curtos, mantendo o equilíbrio.', 'Desça com controle (rolamento ou pés no chão).'],
  array['handstand walk', 'caminhada em parada de mão', 'andar de mão'], 'manual', 'carregamento', array['ombro', 'punho'], 'multiarticular',
  array['Passos longos que desequilibram.', 'Lombar arqueada.', 'Olhar para frente em vez de para o chão.'],
  array['distancia', 'tempo'], '{"triceps":0.25,"core":0.5}'::jsonb, array['ombro', 'cotovelo_punho'], 'avancado', false, 'treinador', null, null, false,
  '{cross}', true, array['Parada de mão na parede (tempo)', 'Shoulder taps na parede', 'Bear crawl']),
('Pistol Squat', 'pistol-squat', 'quadriceps', '{gluteo,core}', '{peso_corporal}',
  array['Em pé numa perna só, a outra estendida à frente.', 'Desça até o fundo do agachamento com o calcanhar no chão.', 'Suba sem apoiar a outra perna.'],
  array['pistol', 'agachamento pistola', 'agachamento unilateral'], 'manual', 'agachar', array['quadril', 'joelho', 'tornozelo'], 'multiarticular',
  array['Calcanhar sair do chão.', 'Joelho indo para dentro.', 'Cair no fundo sem controle.'],
  array['repeticoes', 'assistencia'], '{"gluteo":0.5,"core":0.25}'::jsonb, array['joelho'], 'intermediario', true, 'treinador', null, null, false,
  '{cross,funcional}', true, array['Pistol no banco (sentar e levantar)', 'Pistol segurando num apoio', 'Agachamento búlgaro']),
('Air Squat', 'air-squat', 'quadriceps', '{gluteo}', '{peso_corporal}',
  array['Pés na largura do quadril, peso no meio do pé.', 'Desça com o quadril para trás até passar do paralelo, peito aberto.', 'Suba estendendo totalmente quadril e joelhos.'],
  array['air squat', 'agachamento livre sem peso', 'agachamento com peso do corpo', 'agachamento peso corporal'], 'manual', 'agachar', array['quadril', 'joelho', 'tornozelo'], 'multiarticular',
  array['Calcanhar sair do chão.', 'Joelhos para dentro.', 'Não estender o quadril em cima.'],
  array['repeticoes'], '{"gluteo":0.5}'::jsonb, array['joelho'], 'iniciante', false, 'treinador', null, null, false,
  '{cross,funcional}', true, array['Agachamento até o banco']),
('Burpee', 'burpee', 'full_body', '{peito,quadriceps,core}', '{peso_corporal}',
  array['De pé, coloque as mãos no chão e leve os pés para trás.', 'Encoste o peito no chão.', 'Volte os pés para perto das mãos, fique de pé e salte batendo as mãos acima da cabeça.'],
  array['burpee', 'burpees'], 'manual', null, array['ombro', 'quadril', 'joelho'], 'multiarticular',
  array['Lombar caindo ao descer.', 'Não estender o quadril em cima.', 'Pular sem bater as mãos.'],
  array['repeticoes'], '{"peito":0.25,"quadriceps":0.25,"core":0.25}'::jsonb, array['ombro'], 'iniciante', false, 'treinador', null, null, false,
  '{cross,hyrox,funcional}', true, array['Burpee sem salto', 'Burpee com as mãos no banco']),
('Burpee Broad Jump', 'burpee-broad-jump', 'full_body', '{quadriceps,gluteo,peito}', '{peso_corporal}',
  array['Faça o burpee com o peito no chão.', 'Ao subir, salte à frente com os dois pés juntos.', 'Caia com os joelhos flexionados e emende o próximo.'],
  array['burpee broad jump', 'burpee com salto à frente', 'burpee salto horizontal'], 'manual', null, array['ombro', 'quadril', 'joelho', 'tornozelo'], 'multiarticular',
  array['Cair com os joelhos travados.', 'Salto curto sem estender o quadril.', 'Lombar caindo no chão.'],
  array['repeticoes', 'distancia'], '{"quadriceps":0.25,"gluteo":0.25,"peito":0.25}'::jsonb, array['joelho'], 'intermediario', false, 'treinador', null, null, false,
  '{hyrox,cross,funcional}', true, array['Burpee + passo à frente']),
-- Condicionamento
('Double Under', 'double-under', 'cardio', '{panturrilha,ombros}', '{corda}',
  array['Corda passando duas vezes embaixo dos pés a cada salto.', 'Salto um pouco mais alto, pés juntos, punhos girando rápido perto do quadril.', 'Ritmo constante, sem dobrar os joelhos demais.'],
  array['double under', 'duplo na corda', 'du', 'pular corda duplo'], 'manual', null, array['tornozelo', 'punho'], 'multiarticular',
  array['Girar com os braços em vez dos punhos.', 'Dobrar os joelhos para trás (chute).', 'Saltos altos demais.'],
  array['repeticoes'], '{"panturrilha":0.5,"ombros":0.25}'::jsonb, array['joelho'], 'intermediario', false, 'treinador', null, null, false,
  '{cross,funcional}', true, array['Single under (pulo simples)', 'Tentativas de 1 double + 3 simples']),
('Box Jump', 'box-jump', 'quadriceps', '{gluteo,panturrilha}', '{outro}',
  array['De frente para a caixa, pés na largura do quadril.', 'Balance os braços e salte com os dois pés, caindo em cima da caixa com os joelhos flexionados.', 'Estenda o quadril em cima e desça com controle (de preferência descendo um pé de cada vez).'],
  array['box jump', 'salto na caixa', 'pulo na caixa', 'box jump over'], 'manual', null, array['quadril', 'joelho', 'tornozelo'], 'multiarticular',
  array['Cair com os joelhos para dentro.', 'Saltar para baixo de costas (risco no tendão).', 'Não estender o quadril em cima.'],
  array['repeticoes'], '{"gluteo":0.5,"panturrilha":0.25}'::jsonb, array['joelho'], 'iniciante', false, 'treinador', null, null, false,
  '{cross,funcional}', true, array['Step-up na caixa', 'Caixa mais baixa']),
('Wall Ball', 'wall-ball', 'quadriceps', '{gluteo,ombros}', '{bola}',
  array['Bola na altura do peito, de frente para a parede.', 'Agache até passar do paralelo.', 'Suba explodindo e lance a bola no alvo; receba e emende o próximo agachamento.'],
  array['wall ball', 'wall balls', 'arremesso de bola na parede', 'wall ball shot'], 'manual', 'agachar', array['quadril', 'joelho', 'ombro'], 'multiarticular',
  array['Agachamento raso.', 'Lançar só com os braços.', 'Bola longe do corpo na descida.'],
  array['carga', 'repeticoes'], '{"gluteo":0.5,"ombros":0.25}'::jsonb, array['joelho', 'ombro'], 'iniciante', false, 'treinador', null, null, false,
  '{cross,hyrox,funcional}', true, array['Bola mais leve', 'Alvo mais baixo', 'Agachamento com bola sem lançar']),
('Kettlebell Swing', 'kettlebell-swing', 'gluteo', '{posteriores,core,ombros}', '{kettlebell}',
  array['Pés um pouco mais abertos que o quadril, kettlebell à frente.', 'Leve o kettlebell entre as pernas com o quadril para trás e as costas retas.', 'Estenda o quadril com força e deixe o kettlebell subir (altura do peito ou acima da cabeça).'],
  array['kettlebell swing', 'kb swing', 'swing', 'balanço com kettlebell', 'russian swing', 'american swing'], 'manual', 'dobradica_quadril', array['quadril', 'ombro'], 'multiarticular',
  array['Agachar em vez de levar o quadril para trás.', 'Levantar com os braços.', 'Lombar arredondada.'],
  array['carga', 'repeticoes'], '{"posteriores":0.5,"core":0.25,"ombros":0.25}'::jsonb, array['lombar'], 'iniciante', false, 'treinador', null, null, false,
  '{cross,funcional}', true, array['Levantamento terra com kettlebell', 'Kettlebell mais leve']),
('Ski Erg (ergômetro de esqui)', 'ski-erg', 'cardio', '{costas,triceps,core}', '{outro}',
  array['De pé, uma alça em cada mão, braços estendidos acima da cabeça.', 'Puxe as alças para baixo dobrando o quadril, como no esqui.', 'Volte subindo os braços e repita no ritmo.'],
  array['ski erg', 'skierg', 'ski', 'esqui ergômetro', 'ergômetro de esqui'], 'manual', null, array['ombro', 'quadril'], 'multiarticular',
  array['Puxar só com os braços.', 'Agachar fundo demais.', 'Lombar arredondada.'],
  array['tempo', 'distancia', 'calorias'], '{"costas":0.5,"triceps":0.25,"core":0.25}'::jsonb, array['ombro'], 'iniciante', false, 'treinador', null, null, false,
  '{hyrox,cross,funcional}', true, array['Ritmo mais leve']),
('Air Bike', 'air-bike', 'cardio', '{quadriceps,ombros}', '{bike}',
  array['Banco na altura do quadril.', 'Empurre e puxe as alças enquanto pedala.', 'Mantenha o ritmo combinado (calorias ou tempo).'],
  array['air bike', 'assault bike', 'bike de ar', 'echo bike', 'bike com braços'], 'manual', null, array['quadril', 'joelho', 'ombro'], 'multiarticular',
  array['Banco baixo demais.', 'Só as pernas trabalhando.', 'Sair forte demais e quebrar o ritmo.'],
  array['tempo', 'distancia', 'calorias'], '{"quadriceps":0.5,"ombros":0.25}'::jsonb, array[]::text[], 'iniciante', false, 'treinador', null, null, false,
  '{cross,funcional}', true, array['Bike ergométrica']),
-- Funcionais
('Sandbag Carry', 'sandbag-carry', 'core', '{trapezio,quadriceps,costas}', '{outro}',
  array['Abrace o saco de areia na altura do peito (ou no ombro).', 'Caminhe com passos firmes e o tronco reto.', 'Respire sem soltar o abdômen até o fim da distância.'],
  array['sandbag carry', 'carregar saco de areia', 'caminhada com sandbag'], 'manual', 'carregamento', array['ombro', 'quadril', 'joelho'], 'multiarticular',
  array['Tronco inclinado para trás.', 'Passos curtos e lentos.', 'Prender a respiração.'],
  array['carga', 'distancia', 'tempo'], '{"trapezio":0.25,"quadriceps":0.25,"costas":0.25}'::jsonb, array['lombar'], 'iniciante', false, 'treinador', null, null, false,
  '{hyrox,cross,funcional}', true, array['Farmers Carry', 'Saco mais leve']),
('Sandbag Lunges', 'sandbag-lunges', 'quadriceps', '{gluteo,core}', '{outro}',
  array['Saco de areia apoiado nos ombros, atrás do pescoço.', 'Dê um passo à frente e desça até o joelho de trás quase encostar no chão.', 'Suba e emende o passo com a outra perna.'],
  array['sandbag lunges', 'passada com saco de areia', 'afundo com sandbag', 'avanço com saco de areia'], 'manual', 'avanco', array['quadril', 'joelho'], 'multiarticular',
  array['Joelho da frente indo para dentro.', 'Tronco inclinado à frente.', 'Passo curto demais.'],
  array['carga', 'distancia', 'repeticoes'], '{"gluteo":0.5,"core":0.25}'::jsonb, array['joelho'], 'intermediario', false, 'treinador', null, null, false,
  '{hyrox,funcional}', true, array['Walking Lunges sem peso', 'Saco mais leve']),
('Med Ball Slam', 'med-ball-slam', 'core', '{ombros,costas}', '{bola}',
  array['Bola acima da cabeça, braços estendidos.', 'Arremesse a bola no chão com força, dobrando o quadril.', 'Pegue a bola e repita.'],
  array['med ball slam', 'slam ball', 'arremesso de bola no chão', 'medicine ball slam'], 'manual', null, array['ombro', 'quadril', 'coluna'], 'multiarticular',
  array['Lombar arredondada para pegar a bola.', 'Arremessar só com os braços.', 'Bola quicando no rosto (use bola que não quica).'],
  array['carga', 'repeticoes'], '{"ombros":0.25,"costas":0.25}'::jsonb, array['lombar'], 'iniciante', false, 'treinador', null, null, false,
  '{cross,funcional}', true, array['Bola mais leve'])
on conflict (slug) do nothing;

-- Os que já existiam também servem às novas modalidades (nome e regras intocados).
update exercicios_biblioteca set modalidades = array(select distinct unnest(modalidades || '{cross,hyrox,funcional}'::text[]))
where slug in ('sled-push', 'sled-pull', 'corda-naval', 'remo-ergometro', 'caminhada-fazendeiro', 'passada-andando', 'thruster', 'kettlebell-strict-press', 'subida-banco');
update exercicios_biblioteca set modalidades = array(select distinct unnest(modalidades || '{cross}'::text[]))
where slug in ('agachamento-livre', 'agachamento-frontal', 'levantamento-terra', 'terra-sumo', 'desenvolvimento-barra-em-pe', 'supino-reto-barra', 'barra-fixa-pronada', 'flexao-de-bracos', 'hip-thrust-barra');
update exercicios_biblioteca set sinonimos = array(select distinct unnest(sinonimos || '{pull-up,pull-ups}'::text[])) where slug = 'barra-fixa-pronada';
update exercicios_biblioteca set sinonimos = array(select distinct unnest(sinonimos || '{push-up,push-ups}'::text[])) where slug = 'flexao-de-bracos';

-- 3) Resultado de cada bloco ---------------------------------------------------
create table if not exists sessao_blocos (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references training_sessions(id) on delete cascade,
  aluno_id uuid not null references alunos(id) on delete cascade,
  bloco_id text not null check (length(bloco_id) between 1 and 40),
  ordem int not null default 0,
  tipo text not null check (tipo in ('aquecimento', 'tecnica', 'forca', 'metcon', 'volta_calma', 'corrida', 'estacao', 'circuito')),
  formato text check (formato in ('amrap', 'emom', 'intervalo', 'for_time', 'rounds_for_time', 'chipper', 'tabata', 'death_by', 'ladder', 'livre', 'hyrox', 'circuito')),
  condicao text check (condicao in ('rx', 'scaled', 'adaptado')),
  concluido boolean not null default true,
  tempo_seg int check (tempo_seg between 0 and 36000),
  time_cap_seg int check (time_cap_seg between 0 and 36000),
  rounds int check (rounds between 0 and 1000),
  reps int check (reps between 0 and 100000),
  carga_kg numeric(6,2) check (carga_kg between 0 and 1000),
  distancia_m int check (distancia_m between 0 and 200000),
  calorias int check (calorias between 0 and 10000),
  intervalos jsonb check (intervalos is null or (jsonb_typeof(intervalos) = 'array' and jsonb_array_length(intervalos) <= 200)),
  segmentos jsonb check (segmentos is null or (jsonb_typeof(segmentos) = 'array' and jsonb_array_length(segmentos) <= 60)),
  modificacoes text check (length(modificacoes) <= 500),
  benchmark_id uuid,
  benchmark_versao int,
  esforco int check (esforco between 0 and 10),
  client_key text not null unique check (length(client_key) between 4 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, bloco_id)
);
create index if not exists sessao_blocos_aluno_idx on sessao_blocos (aluno_id, created_at desc);
create index if not exists sessao_blocos_benchmark_idx on sessao_blocos (aluno_id, benchmark_id, benchmark_versao) where benchmark_id is not null;
alter table sessao_blocos enable row level security;

-- O aluno do bloco tem de ser o dono da sessão (nada de gravar na sessão de outro).
drop policy if exists sessao_blocos_treinador on sessao_blocos;
create policy sessao_blocos_treinador on sessao_blocos for all using ((select public.is_treinador())) with check ((select public.is_treinador()));
drop policy if exists sessao_blocos_aluno_le on sessao_blocos;
create policy sessao_blocos_aluno_le on sessao_blocos for select using (aluno_id = (select public.aluno_id_atual()));
drop policy if exists sessao_blocos_aluno_grava on sessao_blocos;
create policy sessao_blocos_aluno_grava on sessao_blocos for insert with check (
  aluno_id = (select public.aluno_id_atual())
  and exists (select 1 from training_sessions s where s.id = sessao_blocos.session_id and s.aluno_id = sessao_blocos.aluno_id));
drop policy if exists sessao_blocos_aluno_corrige on sessao_blocos;
create policy sessao_blocos_aluno_corrige on sessao_blocos for update
  using (aluno_id = (select public.aluno_id_atual()))
  with check (aluno_id = (select public.aluno_id_atual())
    and exists (select 1 from training_sessions s where s.id = sessao_blocos.session_id and s.aluno_id = sessao_blocos.aluno_id));
drop policy if exists sessao_blocos_aluno_remove on sessao_blocos;
create policy sessao_blocos_aluno_remove on sessao_blocos for delete using (
  aluno_id = (select public.aluno_id_atual())
  and exists (select 1 from training_sessions s where s.id = sessao_blocos.session_id and s.status = 'em_andamento'));
drop policy if exists sessao_blocos_pode_registrar on sessao_blocos;
create policy sessao_blocos_pode_registrar on sessao_blocos as restrictive for insert with check (public.pode_registrar());

-- 4) Benchmarks versionados ----------------------------------------------------
create table if not exists benchmarks (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9-]{2,60}$'),
  versao int not null default 1 check (versao between 1 and 100),
  nome text not null check (length(nome) between 2 and 80),
  modalidade text not null default 'cross' check (modalidade in ('cross', 'hyrox', 'funcional', 'hibrido')),
  formato text not null check (formato in ('amrap', 'emom', 'intervalo', 'for_time', 'rounds_for_time', 'chipper', 'tabata', 'death_by', 'ladder', 'livre', 'hyrox', 'circuito')),
  descricao text check (length(descricao) <= 1000),
  definicao jsonb not null default '{}'::jsonb,
  oficial boolean not null default false,
  criado_por uuid references auth.users(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (slug, versao)
);
alter table benchmarks enable row level security;
drop policy if exists benchmarks_le on benchmarks;
create policy benchmarks_le on benchmarks for select using ((select auth.uid()) is not null);
drop policy if exists benchmarks_treinador on benchmarks;
create policy benchmarks_treinador on benchmarks for all using ((select public.is_treinador())) with check ((select public.is_treinador()));

alter table sessao_blocos drop constraint if exists sessao_blocos_benchmark_fk;
alter table sessao_blocos add constraint sessao_blocos_benchmark_fk foreign key (benchmark_id) references benchmarks(id) on delete set null;

-- Benchmarks de referência (descrição do treino, sem logo nem texto de terceiros).
insert into benchmarks (slug, versao, nome, modalidade, formato, descricao, definicao, oficial) values
('fran', 1, 'Fran', 'cross', 'for_time', '21-15-9 repetições de Thruster e Pull-Up, o mais rápido possível.',
  '{"esquema":"21-15-9","movimentos":[{"slug":"thruster","carga_kg":{"m":43,"f":29}},{"slug":"barra-fixa-pronada"}],"time_cap_seg":600}'::jsonb, true),
('grace', 1, 'Grace', 'cross', 'for_time', '30 Clean & Jerks, o mais rápido possível.',
  '{"movimentos":[{"slug":"clean-and-jerk","reps":30,"carga_kg":{"m":61,"f":43}}],"time_cap_seg":600}'::jsonb, true),
('cindy', 1, 'Cindy', 'cross', 'amrap', 'AMRAP de 20 minutos: 5 Pull-Ups, 10 Push-Ups, 15 Air Squats.',
  '{"minutos":20,"movimentos":[{"slug":"barra-fixa-pronada","reps":5},{"slug":"flexao-de-bracos","reps":10},{"slug":"air-squat","reps":15}]}'::jsonb, true),
('helen', 1, 'Helen', 'cross', 'rounds_for_time', '3 rounds: corrida de 400 m, 21 Kettlebell Swings, 12 Pull-Ups, o mais rápido possível.',
  '{"rounds":3,"movimentos":[{"corrida_m":400},{"slug":"kettlebell-swing","reps":21,"carga_kg":{"m":24,"f":16}},{"slug":"barra-fixa-pronada","reps":12}],"time_cap_seg":1200}'::jsonb, true),
('murph', 1, 'Murph', 'cross', 'chipper', 'Corrida de 1,6 km, 100 Pull-Ups, 200 Push-Ups, 300 Air Squats e mais 1,6 km de corrida (com colete de 9/6 kg na versão RX). Pode dividir as repetições do meio como quiser.',
  '{"movimentos":[{"corrida_m":1600},{"slug":"barra-fixa-pronada","reps":100},{"slug":"flexao-de-bracos","reps":200},{"slug":"air-squat","reps":300},{"corrida_m":1600}],"colete_kg":{"m":9,"f":6}}'::jsonb, true)
on conflict (slug, versao) do nothing;

-- 5) Marcas pessoais anotadas fora de um treino --------------------------------
create table if not exists marcas_pessoais (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  biblioteca_id uuid references exercicios_biblioteca(id) on delete set null,
  benchmark_id uuid references benchmarks(id) on delete set null,
  nome text not null check (length(nome) between 1 and 120),
  tipo text not null check (tipo in ('1rm', '2rm', '3rm', '5rm', '10rm', 'max_reps', 'tempo', 'distancia', 'calorias', 'primeiro')),
  valor numeric(10,2) check (valor >= 0 and valor <= 100000),
  unidade text check (unidade in ('kg', 'reps', 'seg', 'm', 'cal')),
  condicao text check (condicao in ('rx', 'scaled', 'adaptado')),
  data date not null,
  session_id uuid references training_sessions(id) on delete set null,
  origem text not null default 'aluno' check (origem in ('aluno', 'personal')),
  observacoes text check (length(observacoes) <= 300),
  removido_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists marcas_pessoais_aluno_idx on marcas_pessoais (aluno_id, data desc);
alter table marcas_pessoais enable row level security;
drop policy if exists marcas_treinador on marcas_pessoais;
create policy marcas_treinador on marcas_pessoais for all using ((select public.is_treinador())) with check ((select public.is_treinador()));
drop policy if exists marcas_aluno_le on marcas_pessoais;
create policy marcas_aluno_le on marcas_pessoais for select using (aluno_id = (select public.aluno_id_atual()));
-- O aluno anota as próprias marcas; “primeiro movimento técnico” só o personal.
drop policy if exists marcas_aluno_grava on marcas_pessoais;
create policy marcas_aluno_grava on marcas_pessoais for insert with check (
  aluno_id = (select public.aluno_id_atual()) and origem = 'aluno' and tipo <> 'primeiro');
drop policy if exists marcas_aluno_corrige on marcas_pessoais;
create policy marcas_aluno_corrige on marcas_pessoais for update
  using (aluno_id = (select public.aluno_id_atual()) and origem = 'aluno')
  with check (aluno_id = (select public.aluno_id_atual()) and origem = 'aluno' and tipo <> 'primeiro');
drop policy if exists marcas_pode_registrar on marcas_pessoais;
create policy marcas_pode_registrar on marcas_pessoais as restrictive for insert with check (public.pode_registrar());
