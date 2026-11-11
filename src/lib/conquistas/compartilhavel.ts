// ============================================================================
// Card compartilhável da medalha (Stories do Instagram / Status do WhatsApp).
// O que as pessoas mais compartilham é o que diz QUEM ELAS SÃO (identidade),
// com um RESULTADO CONCRETO (número, marca) e uma emoção de orgulho — em
// poucas palavras. Por isso cada medalha tem:
//   • frase: 1ª pessoa, curta, de identidade ("Voltei. E vou continuar.");
//   • porque: uma linha sobre a importância, em linguagem calibrada;
//   • destaque: o resultado concreto daquela conquista.
// Mesmas proibições da biblioteca editorial (teste automático).
// ============================================================================

import { LENDARIAS, type CodigoConquista, type ItemRecorde } from "./regras";
import { CONTEUDO, nomeDaConquista } from "./conteudo";
import { ORDEM } from "./vitrine";
import { dataLocal } from "@/lib/aderencia/calcular";

export const TEXTO_COMPARTILHAVEL: Record<CodigoConquista, { frase: string; porque: string }> = {
  primeiro_treino: { frase: "Eu tirei o “um dia” do papel.", porque: "O primeiro treino transforma intenção em ação. Toda evolução começa aqui." },
  criando_raizes: { frase: "Voltei. E vou continuar voltando.", porque: "Voltar em outra semana é o que transforma um começo em rotina." },
  primeira_meta_semanal: { frase: "Semana de respeito: 100% da meta.", porque: "Cumprir uma meta realista fortalece a confiança de que você consegue." },
  missao_cumprida: { frase: "Missão cumprida. Treino completo.", porque: "Fazer todas as séries é dar ao corpo o estímulo planejado." },
  cada_quilo_conta: { frase: "Cada quilo conta.", porque: "Anotar as cargas é o que mostra a evolução em números." },
  terceiro_especial: { frase: "O terceiro é especial.", porque: "Três treinos bem feitos: a rotina está pegando." },
  voltei_pro_jogo: { frase: "Voltei pro jogo.", porque: "Parar acontece. Voltar rápido é o que faz a rotina ficar." },
  ponto_de_partida: { frase: "Meu ponto de partida está marcado.", porque: "Com as medidas registradas, cada mudança vai aparecer." },
  olhar_de_aguia: { frase: "Olhar de águia na execução.", porque: "Pedir o olhar do personal deixa o treino mais eficiente e seguro." },
  relatorio_mensal: { frase: "Eu acompanho a minha evolução.", porque: "Os registros mostram progresso que o espelho ainda não mostra." },
  treinos_10: { frase: "10 vezes eu escolhi aparecer.", porque: "É na repetição que técnica e força começam a se construir." },
  primeiro_mes: { frase: "A jornada começou.", porque: "Treinar em semanas diferentes é o que constrói uma rotina de verdade." },
  constancia_vida_real: { frase: "Constância não é perfeição.", porque: "Manter a frequência na vida real, mesmo com imprevistos, é o que sustenta resultados." },
  semanas_consistentes_4: { frase: "4 semanas sem deixar para depois.", porque: "A evolução vem de estímulo e recuperação repetidos semana após semana." },
  treinos_25: { frase: "25 treinos. Já é uma história.", porque: "Cada sessão soma prática, força e conhecimento sobre o próprio corpo." },
  semanas_consistentes_8: { frase: "8 semanas firmes.", porque: "Dois meses de frequência é o tipo de constância que sustenta resultados." },
  semanas_consistentes_5: { frase: "5 semanas sem falhar.", porque: "Mais de um mês cumprindo a meta: a rotina está tomando forma." },
  semanas_consistentes_6: { frase: "6 semanas no ritmo.", porque: "Um mês e meio de meta cumprida é constância de verdade." },
  semanas_consistentes_10: { frase: "10 semanas. Poucos chegam aqui.", porque: "Dez semanas seguidas de meta cumprida mostram compromisso com o processo." },
  semanas_consistentes_12: { frase: "12 semanas. Nenhuma meta perdida.", porque: "Três meses cumprindo todos os treinos da semana: um feito de guerreiro." },
  acompanhamento_12_semanas: { frase: "12 semanas na jornada.", porque: "Continuar mesmo quando a semana não sai perfeita é o que faz a diferença." },
  constancia_verdade: { frase: "Constância de verdade.", porque: "Metas cumpridas ao longo de meses mostram que o treino virou parte da rotina." },
  treinos_50: { frase: "50 treinos. Isso já é quem eu sou.", porque: "Uma marca de quem fez do treino parte da própria vida." },
  treinos_75: { frase: "75 treinos. E contando.", porque: "Cada treino somado é prática que fica." },
  treinos_100: { frase: "Clube dos 100!", porque: "Cem treinos concluídos: poucos chegam aqui." },
  treinos_150: { frase: "150 treinos na conta.", porque: "Constância que já virou rotina." },
  treinos_200: { frase: "200 treinos. Isso é estilo de vida.", porque: "Duzentas vezes escolhendo treinar." },
  treinos_300: { frase: "300 treinos.", porque: "Uma trajetória longa, construída treino a treino." },
  treinos_365: { frase: "365 treinos: um para cada dia do ano.", porque: "Um ano inteiro de treinos, somados com paciência." },
  treinos_500: { frase: "500 treinos. Lenda.", porque: "Quinhentos treinos concluídos: história de verdade." },
  semanas_consistentes_16: { frase: "16 semanas seguidas.", porque: "Quatro meses sem perder a meta da semana." },
  semanas_consistentes_20: { frase: "20 semanas seguidas.", porque: "Cinco meses cumprindo a meta, semana após semana." },
  semanas_consistentes_26: { frase: "Meio ano sem falhar.", porque: "26 semanas seguidas com a meta cumprida." },
  semanas_consistentes_39: { frase: "39 semanas seguidas.", porque: "Nove meses sem perder a meta da semana." },
  semanas_consistentes_52: { frase: "Um ano inabalável.", porque: "52 semanas seguidas com a meta cumprida." },
  reps_1000: { frase: "1.000 repetições feitas.", porque: "Repetição por repetição, a prática vira resultado." },
  reps_5000: { frase: "5.000 repetições feitas.", porque: "Repetição por repetição, a prática vira resultado." },
  reps_10000: { frase: "10.000 repetições feitas.", porque: "Repetição por repetição, a prática vira resultado." },
  reps_25000: { frase: "25.000 repetições feitas.", porque: "Repetição por repetição, a prática vira resultado." },
  reps_50000: { frase: "50.000 repetições feitas.", porque: "Repetição por repetição, a prática vira resultado." },
  reps_100000: { frase: "100.000 repetições feitas.", porque: "Repetição por repetição, a prática vira resultado." },
  toneladas_25: { frase: "25 toneladas levantadas.", porque: "Somando todas as séries: o peso de uns 4 elefantes." },
  toneladas_100: { frase: "100 toneladas levantadas.", porque: "Somando todas as séries: o peso de uns 75 carros populares." },
  toneladas_250: { frase: "250 toneladas levantadas.", porque: "Somando todas as séries: o peso de um avião grande de passageiros, cheio." },
  toneladas_500: { frase: "500 toneladas levantadas.", porque: "Somando todas as séries: o peso de umas 3 baleias-azuis." },
  toneladas_1000: { frase: "1.000 toneladas levantadas.", porque: "Somando todas as séries: o peso de quase 7 baleias-azuis." },
  recordes_5: { frase: "5 recordes pessoais batidos.", porque: "Cada recorde é uma prova de evolução." },
  recordes_10: { frase: "10 recordes pessoais batidos.", porque: "Cada recorde é uma prova de evolução." },
  recordes_25: { frase: "25 recordes pessoais batidos.", porque: "Cada recorde é uma prova de evolução." },
  recordes_50: { frase: "50 recordes pessoais batidos.", porque: "Cada recorde é uma prova de evolução." },
  recordes_100: { frase: "100 recordes pessoais batidos.", porque: "Cada recorde é uma prova de evolução." },
  recordes_250: { frase: "250 recordes pessoais batidos.", porque: "Cada recorde é uma prova de evolução." },
  recordes_exercicios_5: { frase: "Recorde em 5 exercícios diferentes.", porque: "A evolução está no corpo todo." },
  recordes_exercicios_10: { frase: "Recorde em 10 exercícios diferentes.", porque: "A evolução está no corpo todo." },
  recordes_exercicios_20: { frase: "Recorde em 20 exercícios diferentes.", porque: "A evolução está no corpo todo." },
  recordes_exercicios_30: { frase: "Recorde em 30 exercícios diferentes.", porque: "A evolução está no corpo todo." },
  forca_alta_25: { frase: "+25% de carga num exercício.", porque: "Comparando comigo mesmo, desde a primeira vez no app." },
  forca_alta_50: { frase: "+50% de carga num exercício.", porque: "Comparando comigo mesmo, desde a primeira vez no app." },
  forca_alta_100: { frase: "Dobrei a carga de um exercício.", porque: "Comparando comigo mesmo, desde a primeira vez no app." },
  explorador_15: { frase: "15 exercícios diferentes no repertório.", porque: "Cada exercício novo é mais uma ferramenta no treino." },
  explorador_30: { frase: "30 exercícios diferentes no repertório.", porque: "Cada exercício novo é mais uma ferramenta no treino." },
  explorador_50: { frase: "50 exercícios diferentes no repertório.", porque: "Cada exercício novo é mais uma ferramenta no treino." },
  series_2000: { frase: "2.000 séries feitas.", porque: "Duas mil séries de trabalho registradas no app." },
  series_5000: { frase: "5.000 séries feitas.", porque: "Cinco mil séries de trabalho registradas no app." },
  acompanhamento_9_meses: { frase: "9 meses de acompanhamento.", porque: "Nove meses de treino com acompanhamento." },
  acompanhamento_18_meses: { frase: "1 ano e meio de acompanhamento.", porque: "Dezoito meses construindo a minha evolução." },
  acompanhamento_2_anos: { frase: "2 anos de acompanhamento.", porque: "Dois anos de história no treino." },
  monitoramento_52: { frase: "52 semanas seguidas medindo.", porque: "Um ano inteiro conhecendo o corpo pelos números." },
  recomeco_consistente: { frase: "Eu recomecei. E continuei.", porque: "Retomar e manter na semana seguinte mostra a rotina se reorganizando." },
  recorde: { frase: "Mais forte do que da última vez.", porque: "Superar a própria marca é um dos sinais mais claros de progresso no treino." },
  eu_voltei: { frase: "De volta ao jogo.", porque: "Pausas acontecem. Voltar é o que importa na trajetória." },
  fiz_o_necessario: { frase: "Tinha tudo pra faltar. Fui e fiz.", porque: "Nos dias corridos, aparecer é o que mantém a constância." },
  nunca_deixei_pra_depois: { frase: "Dia corrido não é desculpa.", porque: "Ajustar o treino ao dia, em vez de faltar, é o que mantém a rotina de pé." },
  fui_alem: { frase: "Hoje eu fui além.", porque: "Um treino a mais, dentro do combinado, soma movimento à semana." },
  milha_extra: { frase: "Eu vou além do combinado.", porque: "Pequenos acréscimos, semana após semana, fazem diferença." },
  sempre_um_a_mais: { frase: "Sempre um a mais.", porque: "Ir além, com equilíbrio e acompanhamento, virou parte da minha rotina." },
  uma_a_mais: { frase: "Sobrou gás? Uma a mais.", porque: "Aproveitar os dias bons ajuda a completar o volume planejado da semana." },
  exercicio_extra: { frase: "Sobrou energia? Exercício bônus.", porque: "Fazer um pouco a mais nos dias bons soma volume para o que você quer destacar." },
  primeira_tecnica: { frase: "Subi de nível no treino.", porque: "Experimentar uma técnica avançada, com orientação, deixa o treino mais desafiador." },
  tecnicas_2: { frase: "Duas técnicas no repertório.", porque: "Mais técnicas, mais formas de desafiar o músculo." },
  tecnicas_3: { frase: "Três técnicas. Pegando o jeito.", porque: "Cada técnica nova é um jeito diferente de evoluir." },
  tecnicas_4: { frase: "Quatro técnicas na bagagem.", porque: "Variedade planejada mantém o treino desafiador." },
  tecnicas_5: { frase: "Cinco técnicas. Treino de respeito.", porque: "Executar bem cada técnica é sinal de prática e dedicação." },
  tecnicas_7: { frase: "Sete técnicas. Ficando craque.", porque: "Um repertório amplo deixa o treino sempre interessante." },
  tecnicas_10: { frase: "Dez técnicas. Poucos chegam aqui.", porque: "Experiência com muitas técnicas mostra dedicação ao processo." },
  chegou_intensificacao: { frase: "Hora de intensificar.", porque: "Chegar na intensificação mostra que a base foi bem construída." },
  completou_adaptacao: { frase: "Adaptação concluída. Base pronta.", porque: "Preparar o corpo com calma é o que permite evoluir com segurança." },
  completou_intensificacao: { frase: "Aguentei o tranco.", porque: "Passar pela fase mais puxada, com acompanhamento, é onde muita evolução acontece." },
  protocolo_completo: { frase: "Protocolo completo. Do começo ao fim.", porque: "Adaptação, intensificação e consolidação em sequência, sem parar: disciplina de meses." },
  completou_consolidacao: { frase: "Ciclo fechado.", porque: "Consolidar os ganhos prepara o próximo ciclo de evolução." },
  treino_samurai: { frase: "Treino do Samurai. Antes das 4h30.", porque: "Começar o treino de madrugada, antes de o dia começar, é disciplina de samurai." },
  compartilhou_primeiro: { frase: "Espalhando o Chalalá!", porque: "Mostrar o processo reforça o compromisso com o plano." },
  diario_de_bordo: { frase: "Diário de Bordo: 4 semanas no ar.", porque: "Rotina contada em público é rotina mais firme." },
  vitrine_de_trofeus: { frase: "Vitrine de Troféus.", porque: "Cinco conquistas diferentes celebradas pelo caminho." },
  inspiracao_galera: { frase: "Inspiração da Galera.", porque: "Meu treino chegou em alguém." },
  trouxe_amigo: { frase: "Trouxe um amigo pro Chalalá.", porque: "Treinar com amigos por perto ajuda os dois." },
  criador_desafios: { frase: "Criei o desafio e fomos até o fim.", porque: "Combinar o treino com alguém dobra o compromisso." },
  campeao_desafio: { frase: "Campeão do desafio!", porque: "Ninguém treinou mais que eu no período." },
  palavra_cumprida: { frase: "Palavra cumprida!", porque: "Combinei a meta e cumpri até o fim." },
  desafiante_nato: { frase: "Desafiante nato: 3 desafios.", porque: "Treinar com meta e companhia virou rotina." },
  cardio_1: { frase: "Primeiro Fôlego: cardio na rotina.", porque: "O primeiro cardio é o começo do condicionamento." },
  cardio_2: { frase: "Motor ligando: segundo cardio feito.", porque: "Repetir é o que transforma tentativa em rotina." },
  cardio_3: { frase: "Pegando ritmo no cardio.", porque: "Três dias de cardio: a rotina está nascendo." },
  cardio_10: { frase: "Dez no pulmão: 10 cardios.", porque: "Constância no cardio, no ritmo certo." },
  cardio_25: { frase: "Fôlego de respeito: 25 cardios.", porque: "O cardio já faz parte da rotina." },
  cardio_50: { frase: "Máquina de cardio: 50 cardios.", porque: "Cinquenta dias cuidando do coração." },
  cardio_100: { frase: "Coração de aço: 100 cardios.", porque: "Cem dias de cardio no plano." },
  cardio_250: { frase: "Lenda do Fôlego: 250 cardios.", porque: "Troféu lendário: o cardio virou parte de mim." },
  minutos_cardio_300: { frase: "300 minutos de cardio somados.", porque: "5 horas de fôlego somadas." },
  minutos_cardio_1000: { frase: "1.000 minutos de cardio somados.", porque: "Quase 17 horas de fôlego somadas." },
  minutos_cardio_3000: { frase: "3.000 minutos de cardio somados.", porque: "50 horas de fôlego somadas." },
  minutos_cardio_6000: { frase: "6.000 minutos de cardio somados.", porque: "100 horas de fôlego somadas." },
  minutos_cardio_15000: { frase: "15.000 minutos de cardio somados.", porque: "250 horas de fôlego somadas." },
  minutos_cardio_30000: { frase: "30.000 minutos de cardio somados.", porque: "500 horas de fôlego somadas." },
  cardio_500: { frase: "500 cardios.", porque: "Constância de longo prazo." },
  cardio_1000: { frase: "1.000 cardios.", porque: "Constância de longo prazo." },
  cardio_uma_hora: { frase: "Uma hora de Chalalá, no plano.", porque: "Sessão longa feita do jeito que foi prescrita." },
  cardio_semana_ritmo: { frase: "Semana no ritmo: todo o cardio feito.", porque: "Cumpri o combinado da semana." },
  cardio_meta_semana: { frase: "100% no plano: meta da semana cumprida.", porque: "O cardio certo, na medida certa." },
  cardio_4_semanas: { frase: "Fôlego de ferro: 4 semanas no plano.", porque: "Um mês inteiro com o cardio em dia." },
  dois_folegos: { frase: "Dois Fôlegos: 2 cardios no mesmo dia.", porque: "Voltei para o cardio no mesmo dia." },
  combo_completo: { frase: "Combo Completo: musculação + cardio.", porque: "Força e fôlego no mesmo dia." },
  combo_3: { frase: "Combo 3 Dias: força e fôlego.", porque: "3 dias seguidos de musculação e cardio." },
  combo_5: { frase: "Combo 5 Dias: força e fôlego.", porque: "5 dias seguidos de musculação e cardio." },
  combo_7: { frase: "Semana Combo: 7 dias seguidos.", porque: "Uma semana inteira de musculação e cardio." },
  combo_10: { frase: "Combo 10 Dias: força e fôlego.", porque: "10 dias seguidos sem quebrar a sequência." },
  combo_30: { frase: "30 Dias de Combo.", porque: "Um mês inteiro de musculação e cardio, todo dia." },
  series_500: { frase: "500 séries feitas.", porque: "Volume que se constrói série por série." },
  acompanhamento_3_meses: { frase: "3 meses de acompanhamento.", porque: "Constância que já virou rotina." },
  acompanhamento_6_meses: { frase: "6 meses de acompanhamento.", porque: "Meio ano de treino e evolução." },
  acompanhamento_1_ano: { frase: "1 ano de acompanhamento.", porque: "Um ano inteiro de história no treino." },
  retomada_30: { frase: "A volta por cima.", porque: "Voltei depois de um mês parado." },
  quiz_1: { frase: "Primeiro acerto.", porque: "Entendendo o porquê do meu treino." },
  quiz_10: { frase: "10 acertos no Mito ou Verdade.", porque: "Mente afiada no treino." },
  quiz_30: { frase: "30 acertos no Mito ou Verdade.", porque: "Mito nenhum passa por mim." },
  quiz_50: { frase: "50 acertos no Mito ou Verdade.", porque: "Mestre do conhecimento." },
  semana_compartilhada: { frase: "Semana Compartilhada.", porque: "Meta da semana cumprida, treino por treino." },
  cards_10: { frase: "10 treinos no feed.", porque: "Treino pago, card postado." },
  cards_20: { frase: "20 treinos no feed.", porque: "A rotina está aparecendo." },
  cards_30: { frase: "30 treinos no feed.", porque: "Trinta treinos registrados e compartilhados." },
  trofeus_compartilhados_10: { frase: "Galeria de 10 troféus.", porque: "Dez conquistas diferentes compartilhadas." },
  trofeus_compartilhados_20: { frase: "Galeria de 20 troféus.", porque: "Vinte conquistas diferentes compartilhadas." },
  trofeus_compartilhados_30: { frase: "Galeria de 30 troféus.", porque: "Trinta conquistas diferentes compartilhadas." },
  trofeus_compartilhados_50: { frase: "Galeria de 50 troféus.", porque: "Cinquenta conquistas diferentes compartilhadas." },
  cardio_madrugada: { frase: "Cardio antes das 5h.", porque: "O dia nem começou e o cardio já foi." },
  cardio_4h: { frase: "Cardio às 4h.", porque: "Disciplina antes do sol nascer." },
  cardio_meia_noite: { frase: "Cardio depois da meia-noite.", porque: "Enquanto todos dormem, eu treino." },
  cardio_10km: { frase: "10 km no dia.", porque: "Fôlego de respeito." },
  cardio_escada_1h: { frase: "1 hora de escada.", porque: "Pernas e coração de aço." },
  mobilidade_superiores: { frase: "Ombros livres!", porque: "Ombro, pescoço e costas soltos com a mobilidade do Montinho." },
  mobilidade_inferiores: { frase: "Quadril livre!", porque: "Quadril, lombar e joelho soltos com a mobilidade do Montinho." },
  mobilidade_completa: { frase: "Corpo todo solto.", porque: "Superiores e inferiores: cuidei do corpo inteiro." },
  mobilidade_7_superiores: { frase: "7 dias seguidos de mobilidade.", porque: "Desafio 7 Dias: ombro, pescoço e costas todos os dias." },
  mobilidade_7_inferiores: { frase: "7 dias seguidos de mobilidade.", porque: "Desafio 7 Dias: quadril, lombar e joelho todos os dias." },
  semanas_completas_5: { frase: "5 semanas com a meta 100% cumprida.", porque: "Semana boa somada a semana boa: é assim que o resultado aparece." },
  semanas_completas_10: { frase: "10 semanas com a meta 100% cumprida.", porque: "Dez semanas fazendo o plano inteiro." },
  semanas_completas_25: { frase: "25 semanas com a meta 100% cumprida.", porque: "Quase meio ano de semanas completas." },
  semanas_completas_50: { frase: "50 semanas com a meta 100% cumprida.", porque: "Praticamente um ano de semanas completas." },
  semana_perfeita: { frase: "Semana perfeita: nenhuma série a menos.", porque: "Todos os treinos e todas as séries da semana feitos." },
  semana_perfeita_5: { frase: "5 semanas perfeitas.", porque: "Meta cumprida e todas as séries feitas, cinco vezes." },
  semana_perfeita_10: { frase: "10 semanas perfeitas.", porque: "Disciplina de elite: tudo feito, dez vezes." },
  monitoramento_4: { frase: "4 semanas seguidas medindo.", porque: "Quem acompanha os números enxerga a evolução." },
  monitoramento_8: { frase: "8 semanas seguidas medindo.", porque: "Dois meses de dados: a direção fica clara." },
  monitoramento_12: { frase: "12 semanas seguidas medindo.", porque: "Um ciclo inteiro com os números do lado." },
  monitoramento_26: { frase: "26 semanas seguidas medindo.", porque: "Seis meses conhecendo o corpo pelos números." },
  series_1000: { frase: "1.000 séries feitas.", porque: "Mil séries de trabalho registradas no app." },
  primeiro_wod: { frase: "Primeiro WOD feito!", porque: "Estreei no Cross Training." },
  primeira_hyrox: { frase: "Primeira sessão de HYROX!", porque: "Corrida e estações: estreia feita." },
  primeiro_funcional: { frase: "Primeiro circuito funcional!", porque: "Estação por estação, treino pago." },
  primeiro_benchmark: { frase: "Primeiro benchmark registrado.", porque: "Agora tenho uma marca para bater." },
  superando_recorde: { frase: "Bati a minha própria marca!", porque: "Mesmo benchmark, mesma condição, resultado melhor." },
  atleta_versatil: { frase: "Atleta Versátil: 3 modalidades.", porque: "Treino em formatos diferentes." },
  passou_montinho: { frase: "Passei o Montinho!", porque: "Fiquei à frente do meu personal no ranking de troféus." },
  topo_5_dias: { frase: "5 dias no topo!", porque: "Segurei o 1º lugar do ranking por 5 dias seguidos." },
  topo_10_dias: { frase: "10 dias no topo!", porque: "Segurei o 1º lugar do ranking por 10 dias seguidos." },
  topo_30_dias: { frase: "Um mês no topo!", porque: "30 dias seguidos em 1º lugar no ranking." },
  semana_multimodalidade: { frase: "Semana multimodalidade!", porque: "Força e condicionamento na mesma semana." },
  evolucao_sem_fronteiras: { frase: "Mais forte e com mais fôlego.", porque: "Recorde de força e benchmark superado." },
  feriado_musculacao: { frase: "Feriado? Treino pago!", porque: "Treinei no feriado." },
  feriado_cardio: { frase: "Feriado com fôlego: cardio feito!", porque: "Fiz cardio no feriado." },
  feriado_combo: { frase: "Feriado completo: musculação e cardio!", porque: "Fiz musculação e cardio no mesmo feriado." },
  dose_dupla: { frase: "Dose Dupla: 2 treinos no mesmo dia.", porque: "Treinei duas vezes no mesmo dia." },
  cardio_folego_extra: { frase: "Fôlego Extra: além do cardio da semana.", porque: "Fiz o prescrito e mais a metade." },
  cardio_dobro: { frase: "Dobro de Fôlego: o dobro na semana.", porque: "Uma semana com o dobro do combinado." },
  cardio_voltei: { frase: "Voltei a respirar.", porque: "Pausa acontece. O importante é voltar." },
  strava_conectado: { frase: "Relógio no pulso, treino no app.", porque: "Batimento e cardio no acompanhamento: o esforço inteiro aparece." },
  desafio_concluido: { frase: "Desafio concluído!", porque: "Cumprir o combinado dentro do prazo mostra que dá para encaixar o treino na rotina." },
  mestre_tecnicas: { frase: "Mestre das técnicas.", porque: "Fazer todas as técnicas avançadas é coisa de quem leva o treino a sério." },
};

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

function destaqueDeRecorde(r: ItemRecorde): string {
  if (r.tipo === "reps") return `${r.exercicio}: ${r.agora} repetições${r.carga ? ` com ${fmt(r.carga)} kg` : ""}`;
  return `${r.exercicio}: ${fmt(r.agora)} kg (antes ${fmt(r.antes)} kg)`;
}

/** Resultado concreto da conquista — o número que dá orgulho de mostrar. */
export function destaqueDaConquista(c: { codigo: string; dados?: { recordes?: ItemRecorde[]; diasAfastado?: number; meta?: number } | null }): string | null {
  const d = c.dados ?? {};
  switch (c.codigo) {
    case "recorde":
      return d.recordes?.length ? destaqueDeRecorde(d.recordes[0]) : null;
    case "treinos_10":
      return "10 treinos concluídos";
    case "treinos_25":
      return "25 treinos concluídos";
    case "treinos_50":
    case "treinos_75":
    case "treinos_100":
    case "treinos_150":
    case "treinos_200":
    case "treinos_300":
    case "treinos_365":
    case "treinos_500":
      return `${c.codigo.split("_").at(-1)} treinos concluídos`;
    case "semanas_consistentes_4":
      return "4 semanas seguidas com a meta cumprida";
    case "semanas_consistentes_5":
    case "semanas_consistentes_6":
    case "semanas_consistentes_8":
    case "semanas_consistentes_10":
    case "semanas_consistentes_16":
    case "semanas_consistentes_20":
    case "semanas_consistentes_39":
      return `${c.codigo.split("_").at(-1)} semanas seguidas com a meta cumprida`;
    case "semanas_consistentes_26":
      return "26 semanas seguidas · meio ano sem perder a meta";
    case "semanas_consistentes_52":
      return "52 semanas seguidas · um ano sem perder a meta";
    case "semanas_consistentes_12":
      return "12 semanas seguidas · 3 meses sem perder a meta";
    case "constancia_vida_real":
      return "3 de 4 semanas com a meta cumprida";
    case "constancia_verdade":
      return "8 de 12 semanas com a meta cumprida";
    case "acompanhamento_12_semanas":
      return "12 semanas de acompanhamento";
    case "primeira_meta_semanal":
      return d.meta ? `${d.meta} ${d.meta === 1 ? "treino" : "treinos"} na semana, como planejado` : "Meta da semana cumprida";
    case "primeiro_treino":
      return "Primeiro treino concluído";
    case "primeiro_mes":
      return "Primeiro mês de treino";
    case "eu_voltei":
      return d.diasAfastado ? `De volta depois de ${d.diasAfastado} dias` : "De volta aos treinos";
    case "fiz_o_necessario":
      return "Treino feito na versão curta, num dia corrido";
    case "nunca_deixei_pra_depois":
      return "5 treinos na versão curta";
    case "fui_alem":
      return "Primeiro treino extra concluído";
    case "milha_extra":
      return "5 treinos extras concluídos";
    case "sempre_um_a_mais":
      return "15 treinos extras concluídos";
    case "uma_a_mais":
      return "10 séries além das prescritas";
    case "primeira_tecnica":
      return "Primeira técnica avançada";
    case "tecnicas_2":
    case "tecnicas_3":
    case "tecnicas_4":
    case "tecnicas_5":
    case "tecnicas_7":
    case "tecnicas_10":
      return `${c.codigo.split("_")[1]} técnicas avançadas diferentes`;
    case "mestre_tecnicas":
      return "Todas as técnicas avançadas";
    case "chegou_intensificacao":
      return "Primeiro treino na intensificação";
    case "completou_adaptacao":
      return "Fase de adaptação concluída";
    case "completou_intensificacao":
      return "Fase de intensificação concluída";
    case "completou_consolidacao":
      return "Fase de consolidação concluída";
    case "protocolo_completo":
      return "Adaptação → intensificação → consolidação, sem parar";
    case "treino_samurai":
      return "Treino começado até as 4h30 da manhã";
    case "strava_conectado":
      return "Relógio conectado pelo Strava";
    default:
      return null;
  }
}

export type CardMedalha = { selo: string; titulo: string; destaque: string | null; frase: string; porque: string; nome: string; data: string; legenda: string; /** Troféu lendário (Guerreiro): visual de fogo. */ lendaria?: boolean; /** Linha de cima no lugar de “NOVA MEDALHA” (ex.: recorde). */ chamada?: string; /** Frase sem aspas (ex.: nome do exercício). */ semAspas?: boolean; /** Card de desenho próprio (“Passei o Montinho”). */ modelo?: "passei_montinho"; /** Placar de troféus do card “Passei o Montinho” (quando a tela sabe). */ placar?: { eu: number; montinho: number } };

const SELO_EXTRA: Record<string, string> = { recorde: "★", eu_voltei: "↺" };
export const seloDaConquista = (codigo: string) => ORDEM.find((o) => o.codigo === codigo)?.selo ?? SELO_EXTRA[codigo] ?? "★";

/** Tudo o que vai no card da medalha (mesmo texto na tela e na imagem). */
export function cardDaMedalha(c: { codigo: string; titulo?: string | null; descricao?: string | null; conquistado_em: string; dados?: { recordes?: ItemRecorde[]; diasAfastado?: number; meta?: number } | null }, nome: string): CardMedalha {
  const t = TEXTO_COMPARTILHAVEL[c.codigo as CodigoConquista] ?? { frase: CONTEUDO[c.codigo as CodigoConquista]?.mensagem ?? "Mais uma conquista.", porque: "" };
  const titulo = nomeDaConquista(c.codigo, c.titulo);
  // Dia de Brasília (auditoria 29/10/2026: em UTC, troféu das 21h em diante saía com a data de amanhã).
  const data = dataLocal(c.conquistado_em);
  const dataBR = `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;
  return {
    selo: seloDaConquista(c.codigo),
    titulo,
    destaque: destaqueDaConquista(c),
    frase: t.frase,
    porque: t.porque,
    nome: nome.trim().split(/\s+/)[0] ?? "",
    data: dataBR,
    legenda: `${t.frase} ${LENDARIAS.has(c.codigo) ? "🏆" : "🏅"} ${titulo} — treinando com @montinho_personal`,
    lendaria: LENDARIAS.has(c.codigo),
    ...(c.codigo === "passou_montinho" ? { modelo: "passei_montinho" as const, legenda: "PASSEI O MONTINHO! 👑 Meu personal treina pelo app também e ficou para trás 😎 Duvido você passar ele — @montinho_personal" } : {}),
  };
}
