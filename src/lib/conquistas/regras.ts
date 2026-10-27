// ============================================================================
// Conquistas (gamificação ética) — regras PURAS, explícitas e testadas.
//
// • Cada conquista tem código + referência: o par é único no banco, então
//   recalcular (reabrir a tela, repetir a requisição) nunca duplica.
// • Só premia comportamento real registrado: treinos concluídos, metas
//   cumpridas, retomadas, recordes COMPARÁVEIS. Nada por carga absoluta,
//   comparação com outros alunos, peso perdido ou excesso de treino.
// • Treino extra não conta para os marcos da ficha; tem medalhas próprias
//   (“Além do necessário”), sempre dentro das regras que o personal liberou;
//   sessão com dor relatada não vira recorde.
// ============================================================================

import { LIMITES_COMPARTILHAR, type MarcosCompartilhar } from "./compartilhar";
import { LIMITES_DESAFIO, type MarcosDesafios } from "@/lib/desafios/regras";
import type { BaseCarga } from "@/lib/historico/resumo";
import { normalizarNome } from "@/lib/grupos";
import { classificarSessao, dataLocal, somarDias, type ResultadoAderencia, type SessaoAderencia } from "@/lib/aderencia/calcular";
import { trofeusDoCardio, LIMITES_CARDIO, type CodigoCardio, type EntradaCardio } from "@/lib/cardio/regras";
import { avaliarJanela, avaliarPrimeiroMes, avaliarRaizes, avaliarRecomeco, LIMITES, type Avaliacao } from "./criterios";

/** Marcos de semanas seguidas com a meta cumprida (12 = troféu lendário “Guerreiro”). */
export const MARCOS_SEMANAS = [4, 5, 6, 8, 10, 12] as const;
/** Troféus lendários: visual e celebração especiais (conquista muito rara). */
export const LENDARIAS: ReadonlySet<string> = new Set(["semanas_consistentes_12", "cardio_250"]);

/** Começo (pedido do Montinho, 23/10/2026). */
export const LIMITES_COMECO = { exerciciosComCarga: 3, treinosBons: 3, pctSeries: 80, diasInicio: 30, pausaMin: 7, pausaMax: 13 } as const;
/** Troféus que só o personal ativa (ex.: vídeo de execução recebido pelo WhatsApp). */
export const CODIGOS_MANUAIS: CodigoConquista[] = ["olhar_de_aguia"];
/** Exercícios com carga registrada (série válida com kg > 0). */
export function exerciciosComCarga(s: { exercicios?: Array<{ series: Array<{ tipo: string; carga_kg: number | null }> }> }): number {
  return (s.exercicios ?? []).filter((e) => e.series.some((x) => x.tipo !== "aquecimento" && (x.carga_kg ?? 0) > 0)).length;
}

export type CodigoConquista =
  | "primeiro_treino"
  | "primeira_meta_semanal"
  | "primeiro_mes"
  | "missao_cumprida"
  | "cada_quilo_conta"
  | "terceiro_especial"
  | "voltei_pro_jogo"
  | "ponto_de_partida"
  | "olhar_de_aguia"
  | "treinos_10"
  | "treinos_25"
  | "treinos_50"
  | "semanas_consistentes_4"
  | "semanas_consistentes_5"
  | "semanas_consistentes_6"
  | "semanas_consistentes_8"
  | "semanas_consistentes_10"
  | "semanas_consistentes_12"
  | "acompanhamento_12_semanas"
  | "recorde"
  | "relatorio_mensal"
  | "eu_voltei"
  | "criando_raizes"
  | "constancia_vida_real"
  | "constancia_verdade"
  | "recomeco_consistente"
  // Além do necessário (treino curto, treino extra, série extra)
  | "fiz_o_necessario"
  | "nunca_deixei_pra_depois"
  | "fui_alem"
  | "milha_extra"
  | "sempre_um_a_mais"
  | "uma_a_mais"
  // Técnicas avançadas (quantos tipos diferentes já fez)
  | "primeira_tecnica"
  | "tecnicas_2"
  | "tecnicas_3"
  | "tecnicas_4"
  | "tecnicas_5"
  | "tecnicas_7"
  | "tecnicas_10"
  | "mestre_tecnicas"
  // Fases do protocolo (definidas pelo personal)
  | "chegou_intensificacao"
  | "completou_adaptacao"
  | "completou_intensificacao"
  | "completou_consolidacao"
  | "protocolo_completo"
  // Treino do Samurai: musculação começada até as 4h30 da manhã (horário de Brasília)
  | "treino_samurai"
  | "strava_conectado"
  | "compartilhou_primeiro"
  | "diario_de_bordo"
  | "vitrine_de_trofeus"
  | "inspiracao_galera"
  | "trouxe_amigo"
  | "criador_desafios"
  | "campeao_desafio"
  | "palavra_cumprida"
  | "desafiante_nato"
  // Montinho Cardio (src/lib/cardio/regras.ts)
  | CodigoCardio
  // Modo Visitante: desafio (campanha) concluído — uma por desafio
  | "desafio_concluido";

/** Medalhas “Além do necessário” (0037): gravadas à parte para nunca travar as antigas se o banco ainda não as aceitar. */
export const CODIGOS_ALEM: CodigoConquista[] = ["fiz_o_necessario", "nunca_deixei_pra_depois", "fui_alem", "milha_extra", "sempre_um_a_mais", "uma_a_mais"];
export const LIMITES_ALEM = { curtos: 5, extras: 5, extrasMuitos: 15, seriesExtras: 10 } as const;

/**
 * Técnicas avançadas que contam para as medalhas (cada uma conta uma vez).
 * Pirâmide crescente e decrescente contam juntas; bi-set e combinado também.
 */
export const TECNICAS_MEDALHA = {
  dropset: "Drop-set",
  rest_pause: "Rest-pause",
  myo_reps: "Myo-reps",
  cluster: "Cluster",
  tres_sete: "3/7",
  piramide: "Pirâmide",
  biset: "Bi-set",
  triset: "Tri-set",
  superset: "Super-set",
  pre_exaustao: "Pré-exaustão",
  super_slow: "Super slow",
  negativo: "Negativo",
  isometria: "Isometria",
} as const;
export type FamiliaTecnica = keyof typeof TECNICAS_MEDALHA;
export const TOTAL_TECNICAS = Object.keys(TECNICAS_MEDALHA).length;
export function familiaTecnica(t: string | null | undefined): FamiliaTecnica | null {
  if (!t) return null;
  if (t === "piramide_decrescente") return "piramide";
  if (t === "combinado") return "biset";
  return t in TECNICAS_MEDALHA ? (t as FamiliaTecnica) : null;
}
/** Medalhas por quantidade de técnicas diferentes (a última = todas). */
export const MARCOS_TECNICA: Array<[CodigoConquista, number]> = [["primeira_tecnica", 1], ["tecnicas_2", 2], ["tecnicas_3", 3], ["tecnicas_4", 4], ["tecnicas_5", 5], ["tecnicas_7", 7], ["tecnicas_10", 10], ["mestre_tecnicas", TOTAL_TECNICAS]];
/** Medalhas das técnicas (0043): gravadas à parte, como as “Além do necessário”. */
export const CODIGOS_TECNICA: CodigoConquista[] = MARCOS_TECNICA.map(([c]) => c);

/** Medalhas de fase (0044). Fase “completa” = pelo menos N treinos nela e o protocolo passou para outra fase. */
export const CODIGOS_FASE: CodigoConquista[] = ["chegou_intensificacao", "completou_adaptacao", "completou_intensificacao", "completou_consolidacao", "protocolo_completo"];
/**
 * Treino do Samurai (23/10/2026, pedido do Montinho): um treino de musculação
 * COMEÇADO entre 3h59 e 4h30 da manhã, horário de Brasília. Vale o horário
 * em que o treino começou, registrado pelo servidor ao tocar em “Começar
 * treino” (não o relógio do celular): 4h30 conta; 4h31 já não conta; antes de 3h59 também não. O treino
 * precisa ser concluído, com séries registradas. Medalha à parte (0084).
 */
export const LIMITES_SAMURAI = { inicioMin: 3 * 60 + 59, limiteMin: 4 * 60 + 30 } as const;
export const CODIGOS_SAMURAI: CodigoConquista[] = ["treino_samurai"];
/** Relógio no Pulso (0087): conectar o Strava. Gravado à parte, como os outros troféus novos. */
export const CODIGOS_STRAVA: CodigoConquista[] = ["strava_conectado"];
/** Troféus de compartilhamento (0088). Gravados à parte, como os outros novos. */
export const CODIGOS_COMPARTILHAR: CodigoConquista[] = ["compartilhou_primeiro", "diario_de_bordo", "vitrine_de_trofeus", "inspiracao_galera", "trouxe_amigo"];
/** Troféus dos desafios entre alunos (0094). Gravados à parte, como os outros novos. */
/** Montinho Cardio (0098): gravadas à parte, como as outras famílias novas. */
export { CODIGOS_CARDIO } from "@/lib/cardio/regras";
export const CODIGOS_DESAFIOS: CodigoConquista[] = ["criador_desafios", "campeao_desafio", "palavra_cumprida", "desafiante_nato"];
const FMT_HORA = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
/** Minutos desde a meia-noite no horário de Brasília (segundos ignorados: 4h30m59s = 4h30). */
export function minutosBrasilia(iso: string): number {
  const [h, m] = FMT_HORA.format(new Date(iso)).split(":").map(Number);
  return h * 60 + m;
}
export const horaBrasilia = (iso: string) => FMT_HORA.format(new Date(iso)).replace(":", "h");
export const ehHorarioSamurai = (iso: string) => {
  const m = minutosBrasilia(iso);
  return m >= LIMITES_SAMURAI.inicioMin && m <= LIMITES_SAMURAI.limiteMin;
};

/** Protocolo completo: adaptação → intensificação → consolidação seguidas, sem parar (nenhum intervalo maior que isto entre treinos). */
export const LIMITE_PROTOCOLO = { diasSemTreino: 14 } as const;
export const LIMITES_FASE = { minTreinos: 4 } as const;

/** Medalha de desafio (0055): gravada à parte, como as de fase. */
export const CODIGOS_DESAFIO: CodigoConquista[] = ["desafio_concluido"];
/** Desafio do visitante: N treinos concluídos entre início e fim (datas em São Paulo, inclusivas). */
export type DesafioConquista = { id: string; nome: string; inicio: string | null; fim: string | null; metaTreinos: number };

// Títulos e critérios curtos (gravados na conquista). Os textos educativos
// completos ficam na biblioteca editorial (conteudo.ts).
export const CATALOGO: Record<CodigoConquista, { titulo: string; criterio: string; repete: boolean }> = {
  primeiro_treino: { titulo: "Primeiro passo", criterio: "Concluir o primeiro treino válido, com pelo menos metade das séries prescritas.", repete: false },
  primeira_meta_semanal: { titulo: "Semana de Respeito", criterio: "Cumprir pela primeira vez 100% da meta semanal de treinos definida pelo personal.", repete: false },
  missao_cumprida: { titulo: "Missão Cumprida", criterio: "Concluir o primeiro treino com 100% das séries propostas.", repete: false },
  cada_quilo_conta: { titulo: "Cada Quilo Conta", criterio: `Registrar a carga de pelo menos ${LIMITES_COMECO.exerciciosComCarga} exercícios no mesmo treino.`, repete: false },
  terceiro_especial: { titulo: "O Terceiro É Especial", criterio: `Concluir ${LIMITES_COMECO.treinosBons} treinos com pelo menos ${LIMITES_COMECO.pctSeries}% das séries propostas.`, repete: false },
  voltei_pro_jogo: { titulo: "Voltei pro Jogo", criterio: `Nos primeiros ${LIMITES_COMECO.diasInicio} dias da jornada, voltar a treinar depois de ${LIMITES_COMECO.pausaMin} a ${LIMITES_COMECO.pausaMax} dias sem treino (14 dias ou mais vale o “Eu voltei”).`, repete: false },
  ponto_de_partida: { titulo: "Ponto de Partida", criterio: "Registrar a primeira avaliação física ou as primeiras medidas corporais (ou enviar o arquivo de uma avaliação).", repete: false },
  olhar_de_aguia: { titulo: "Olhar de Águia", criterio: "Enviar ao Montinho, pelo WhatsApp, o primeiro vídeo de execução para avaliação. O Montinho ativa o troféu.", repete: false },
  relatorio_mensal: { titulo: "Conhecendo minha evolução", criterio: "Abrir pela primeira vez a evolução completa.", repete: false },
  treinos_10: { titulo: "10 treinos", criterio: "Somar 10 treinos concluídos (treinos extras e parciais não entram).", repete: false },
  semanas_consistentes_4: { titulo: "Quatro semanas consistentes", criterio: "Cumprir a meta em 4 semanas elegíveis seguidas (pausas combinadas não quebram nem somam).", repete: false },
  primeiro_mes: { titulo: "A Jornada Começou", criterio: "Completar os primeiros 28 dias da jornada, com treinos registrados em pelo menos 3 semanas diferentes.", repete: false },
  treinos_25: { titulo: "25 treinos", criterio: "Somar 25 treinos concluídos (treinos extras e parciais não entram).", repete: false },
  semanas_consistentes_5: { titulo: "Cinco semanas consistentes", criterio: "Cumprir a meta em 5 semanas elegíveis seguidas (pausas combinadas não quebram nem somam).", repete: false },
  semanas_consistentes_6: { titulo: "Seis semanas consistentes", criterio: "Cumprir a meta em 6 semanas elegíveis seguidas (pausas combinadas não quebram nem somam).", repete: false },
  semanas_consistentes_8: { titulo: "Oito semanas consistentes", criterio: "Cumprir a meta em 8 semanas elegíveis seguidas (pausas combinadas não quebram nem somam).", repete: false },
  semanas_consistentes_10: { titulo: "Dez semanas consistentes", criterio: "Cumprir a meta em 10 semanas elegíveis seguidas (pausas combinadas não quebram nem somam).", repete: false },
  semanas_consistentes_12: { titulo: "Guerreiro das 12 semanas", criterio: "Cumprir a meta em 12 semanas elegíveis seguidas — três meses sem perder um treino da semana (pausas combinadas não quebram nem somam).", repete: false },
  acompanhamento_12_semanas: { titulo: "Doze semanas de acompanhamento", criterio: "Completar 12 semanas com treino prescrito e pelo menos um treino registrado em cada uma (não precisam ser seguidas).", repete: false },
  treinos_50: { titulo: "50 treinos", criterio: "Somar 50 treinos concluídos (treinos extras e parciais não entram).", repete: false },
  criando_raizes: { titulo: "Criando raízes", criterio: `Treinar em ${LIMITES.raizes.alvo} semanas diferentes dentro das ${LIMITES.raizes.semanas} primeiras semanas de acompanhamento (pausas combinadas estendem o prazo, até ${LIMITES.raizes.maxCalendario} semanas).`, repete: false },
  constancia_vida_real: { titulo: "Constância na vida real", criterio: `Cumprir a meta em ${LIMITES.vidaReal.alvo} de ${LIMITES.vidaReal.janela} semanas elegíveis seguidas.`, repete: false },
  constancia_verdade: { titulo: "Constância de verdade", criterio: `Cumprir a meta em ${LIMITES.verdade.alvo} de ${LIMITES.verdade.janela} semanas elegíveis seguidas.`, repete: false },
  recomeco_consistente: { titulo: "Recomeço consistente", criterio: `Depois de ${LIMITES.recomeco.diasPausa}+ dias sem treinar, treinar em ${LIMITES.recomeco.semanas} semanas diferentes em até ${LIMITES.recomeco.diasDepois} dias da volta.`, repete: false },
  fiz_o_necessario: { titulo: "Fiz o necessário", criterio: "Concluir um treino na versão curta (“meu treino possível hoje”), com pelo menos metade das séries planejadas para o dia.", repete: false },
  nunca_deixei_pra_depois: { titulo: "Nunca deixei pra depois", criterio: `Concluir ${LIMITES_ALEM.curtos} treinos na versão curta, com pelo menos metade das séries planejadas para o dia.`, repete: false },
  fui_alem: { titulo: "Fui além", criterio: "Concluir o primeiro treino extra liberado pelo personal.", repete: false },
  milha_extra: { titulo: "Milha extra", criterio: `Concluir ${LIMITES_ALEM.extras} treinos extras liberados pelo personal.`, repete: false },
  sempre_um_a_mais: { titulo: "Sempre um a mais", criterio: `Concluir ${LIMITES_ALEM.extrasMuitos} treinos extras liberados pelo personal.`, repete: false },
  uma_a_mais: { titulo: "Uma a mais", criterio: `Somar ${LIMITES_ALEM.seriesExtras} séries além das prescritas (“+ Série extra”) em treinos concluídos.`, repete: false },
  primeira_tecnica: { titulo: "Primeira técnica", criterio: "Fazer pelo menos uma série de uma técnica avançada (drop-set, rest-pause, bi-set, pirâmide…) num treino concluído.", repete: false },
  tecnicas_2: { titulo: "Duas técnicas", criterio: "Já ter feito pelo menos uma série de 2 técnicas avançadas diferentes.", repete: false },
  tecnicas_3: { titulo: "Três técnicas", criterio: "Já ter feito pelo menos uma série de 3 técnicas avançadas diferentes.", repete: false },
  tecnicas_4: { titulo: "Quatro técnicas", criterio: "Já ter feito pelo menos uma série de 4 técnicas avançadas diferentes.", repete: false },
  tecnicas_5: { titulo: "Cinco técnicas", criterio: "Já ter feito pelo menos uma série de 5 técnicas avançadas diferentes.", repete: false },
  tecnicas_7: { titulo: "Sete técnicas", criterio: "Já ter feito pelo menos uma série de 7 técnicas avançadas diferentes.", repete: false },
  tecnicas_10: { titulo: "Dez técnicas", criterio: "Já ter feito pelo menos uma série de 10 técnicas avançadas diferentes.", repete: false },
  chegou_intensificacao: { titulo: "Hora de intensificar", criterio: "Concluir o primeiro treino na fase de intensificação.", repete: false },
  completou_adaptacao: { titulo: "Adaptação concluída", criterio: `Concluir pelo menos ${LIMITES_FASE.minTreinos} treinos na fase de adaptação e passar para a próxima fase definida pelo personal.`, repete: false },
  completou_intensificacao: { titulo: "Intensificação concluída", criterio: `Concluir pelo menos ${LIMITES_FASE.minTreinos} treinos na fase de intensificação e passar para a próxima fase definida pelo personal.`, repete: false },
  protocolo_completo: { titulo: "Protocolo completo", criterio: `Completar as três fases do protocolo em sequência — adaptação, intensificação e consolidação, com pelo menos ${LIMITES_FASE.minTreinos} treinos em cada — sem parar: nenhum intervalo de ${LIMITE_PROTOCOLO.diasSemTreino} dias ou mais sem treinar no caminho.`, repete: false },
  completou_consolidacao: { titulo: "Consolidação concluída", criterio: `Concluir pelo menos ${LIMITES_FASE.minTreinos} treinos na fase de consolidação e começar um novo ciclo definido pelo personal.`, repete: false },
  mestre_tecnicas: { titulo: "Mestre das técnicas", criterio: `Já ter feito pelo menos uma série de cada uma das ${TOTAL_TECNICAS} técnicas avançadas (${Object.values(TECNICAS_MEDALHA).join(", ")}).`, repete: false },
  recorde: { titulo: "Novo recorde pessoal", criterio: "Superar sua melhor marca no mesmo exercício (mais carga, ou mais repetições com a mesma carga), com pelo menos 2 registros anteriores comparáveis.", repete: true },
  treino_samurai: { titulo: "Treino do Samurai", criterio: "Começar um treino de musculação entre 3h59 e 4h30 da manhã (horário de Brasília) e concluí-lo. Vale o horário em que você tocou em “Começar treino”, registrado pelo app (não o relógio do celular): começou às 4h30, conta; às 4h31, já não conta.", repete: false },
  strava_conectado: { titulo: "Relógio no Pulso", criterio: "Conectar o seu relógio ao app pelo Strava (Perfil → Relógio), autorizando a importação dos batimentos e dos cardios.", repete: false },
  compartilhou_primeiro: { titulo: "Espalhando o Chalalá", criterio: "Compartilhar (ou baixar) pela primeira vez um card do app: fim de treino, troféu ou descoberta.", repete: false },
  diario_de_bordo: { titulo: "Diário de Bordo", criterio: "Compartilhar o card do fim do treino em 4 semanas diferentes (várias vezes na mesma semana contam uma).", repete: false },
  vitrine_de_trofeus: { titulo: "Vitrine de Troféus", criterio: "Compartilhar 5 troféus diferentes (o mesmo troféu mais de uma vez conta uma).", repete: false },
  inspiracao_galera: { titulo: "Inspiração da Galera", criterio: "Alguém abrir o link de um card que você compartilhou.", repete: false },
  trouxe_amigo: { titulo: "Trouxe um Amigo", criterio: "Um amigo se cadastrar no app pelo seu convite (link AMIGO-…).", repete: false },
  criador_desafios: { titulo: "Criador de Desafios", criterio: "Criar um desafio entre amigos que chegue até o fim com pelo menos mais uma pessoa participando.", repete: false },
  campeao_desafio: { titulo: "Campeão do Desafio", criterio: "Terminar em 1º lugar um desafio de disputa (quem treina mais ou madrugadores) com pelo menos mais uma pessoa.", repete: false },
  palavra_cumprida: { titulo: "Palavra Cumprida", criterio: "Cumprir a meta de um desafio de meta (meta de treinos ou semana em dia) até o fim.", repete: false },
  desafiante_nato: { titulo: "Desafiante Nato", criterio: `Participar até o fim de ${LIMITES_DESAFIO.desafiosParaNato} desafios entre amigos.`, repete: false },
  cardio_1: { titulo: "Primeiro Fôlego", criterio: `Fazer o primeiro cardio: ${LIMITES_CARDIO.minutosMin} minutos ou mais no dia (e pelo menos metade do prescrito, quando houver). Pedacinhos do mesmo dia se somam.`, repete: false },
  cardio_2: { titulo: "Motor Ligando", criterio: "Fazer cardio em 2 dias diferentes (1 cardio por dia conta, com as mesmas regras do Primeiro Fôlego).", repete: false },
  cardio_3: { titulo: "Pegando Ritmo", criterio: "Fazer cardio em 3 dias diferentes.", repete: false },
  cardio_10: { titulo: "Dez no Pulmão", criterio: "Somar 10 cardios (1 por dia).", repete: false },
  cardio_25: { titulo: "Fôlego de Respeito", criterio: "Somar 25 cardios (1 por dia).", repete: false },
  cardio_50: { titulo: "Máquina de Cardio", criterio: "Somar 50 cardios (1 por dia).", repete: false },
  cardio_100: { titulo: "Coração de Aço", criterio: "Somar 100 cardios (1 por dia).", repete: false },
  cardio_250: { titulo: "Lenda do Fôlego", criterio: "Somar 250 cardios (1 por dia). Troféu lendário.", repete: false },
  cardio_500: { titulo: "500 cardios", criterio: "Somar 500 cardios (1 por dia).", repete: false },
  cardio_1000: { titulo: "1.000 cardios", criterio: "Somar 1.000 cardios (1 por dia).", repete: false },
  cardio_uma_hora: { titulo: "Uma Hora de Chalalá", criterio: `Concluir um cardio de ${LIMITES_CARDIO.umaHoraMin} minutos ou mais numa sessão só, quando o personal prescreveu ${LIMITES_CARDIO.umaHoraMin}+ minutos — sem passar do prescrito. Não existe para quem não tem essa prescrição.`, repete: false },
  cardio_semana_ritmo: { titulo: "Semana no Ritmo", criterio: "Fazer todos os cardios prescritos pelo personal numa semana (de segunda a domingo).", repete: false },
  cardio_meta_semana: { titulo: "100% no Plano", criterio: `Chegar aos minutos de cardio prescritos para a semana (com ${Math.round(LIMITES_CARDIO.toleranciaMeta * 100)}% de tolerância). Passar da meta não dá nada a mais.`, repete: false },
  cardio_4_semanas: { titulo: "Fôlego de Ferro", criterio: `Cumprir os cardios prescritos em ${LIMITES_CARDIO.semanasFerro} semanas seguidas (pausas combinadas não quebram).`, repete: false },
  cardio_voltei: { titulo: "Voltei a Respirar", criterio: `Voltar a fazer cardio depois de ${LIMITES_CARDIO.diasRetomada} dias ou mais sem cardio.`, repete: true },
  desafio_concluido: { titulo: "Desafio concluído", criterio: "Concluir dentro do prazo o número de treinos combinado no desafio.", repete: true },
  eu_voltei: { titulo: "Eu voltei", criterio: "Fazer um treino válido depois de 14 dias ou mais sem treinos registrados.", repete: true },
};

/** Versão do critério de cada conquista (gravada junto; mudar critério nunca apaga conquista antiga). */
export const VERSAO_CRITERIO: Record<CodigoConquista, number> = Object.fromEntries(Object.keys(CATALOGO).map((k) => [k, k === "primeiro_mes" ? 3 : 1])) as Record<CodigoConquista, number>;

export const REGRAS_CONQUISTAS = { diasRetomada: 14, registrosParaRecorde: 2, diasPrimeiroMes: 28, treinosPrimeiroMes: 4 };

export type SerieConquista = { tipo: string; carga_kg: number | null; reps: number | null };

const NOME_FASE: Record<string, string> = { adaptacao: "adaptação", intensificacao: "intensificação", consolidacao: "consolidação" };

/** Progresso do desafio: treinos concluídos dentro do período e quando a meta foi batida. */
export function progressoDesafio(d: DesafioConquista, concluidas: Array<Pick<SessaoConquista, "id" | "iniciado_em">>): { feitos: number; concluidoEm: { data: string; sessaoId: string } | null } {
  const dentro = concluidas
    .filter((s) => {
      const dia = dataLocal(s.iniciado_em);
      return (!d.inicio || dia >= d.inicio) && (!d.fim || dia <= d.fim);
    })
    .sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
  const alvo = dentro[d.metaTreinos - 1];
  return { feitos: dentro.length, concluidoEm: alvo ? { data: alvo.iniciado_em, sessaoId: alvo.id } : null };
}

/** Medalhas de fase, em ordem de tempo (usa os treinos concluídos do app com fase registrada). */
export function fasesConquistadas(sessoes: SessaoConquista[]): Array<{ codigo: CodigoConquista; data: string; sessaoId: string; texto: string }> {
  const out: Array<{ codigo: CodigoConquista; data: string; sessaoId: string; texto: string }> = [];
  const ja = new Set<CodigoConquista>();
  const ordenadas = [...sessoes].filter((s) => s.conta_aderencia !== false && s.origem !== "importado" && s.status === "concluida" && s.fase).sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
  let atual: string | null = null;
  let treinos = 0;
  // Protocolo completo: fases concluídas em ordem, sem parar.
  const SEQUENCIA = ["adaptacao", "intensificacao", "consolidacao"];
  let cadeia: string[] = [];
  let anterior: string | null = null;
  for (const s of ordenadas) {
    const f = s.fase!;
    // Pausa longa antes deste treino: a cadeia quebra (depois de fechar a fase anterior, que pode completar o protocolo).
    const pausou = !!anterior && (Date.parse(s.iniciado_em) - Date.parse(anterior)) / 86_400_000 >= LIMITE_PROTOCOLO.diasSemTreino;
    anterior = s.iniciado_em;
    if (f === "intensificacao" && !ja.has("chegou_intensificacao")) {
      ja.add("chegou_intensificacao");
      out.push({ codigo: "chegou_intensificacao", data: s.iniciado_em, sessaoId: s.id, texto: "Primeiro treino na fase de intensificação." });
    }
    if (f !== atual) {
      const codigo = atual ? (`completou_${atual}` as CodigoConquista) : null;
      if (codigo && CODIGOS_FASE.includes(codigo) && treinos >= LIMITES_FASE.minTreinos && !ja.has(codigo)) {
        ja.add(codigo);
        out.push({ codigo, data: s.iniciado_em, sessaoId: s.id, texto: `Fase de ${NOME_FASE[atual!]} concluída: ${treinos} treinos nela.` });
      }
      // Fase fechada com treinos suficientes e na ordem certa continua a cadeia; senão, recomeça.
      if (atual && treinos >= LIMITES_FASE.minTreinos && SEQUENCIA[cadeia.length] === atual) cadeia.push(atual);
      else cadeia = atual === "adaptacao" && treinos >= LIMITES_FASE.minTreinos ? ["adaptacao"] : [];
      if (cadeia.length === SEQUENCIA.length && !ja.has("protocolo_completo")) {
        ja.add("protocolo_completo");
        out.push({ codigo: "protocolo_completo", data: s.iniciado_em, sessaoId: s.id, texto: "Adaptação, intensificação e consolidação completas, em sequência e sem parar." });
      }
      if (cadeia.length === SEQUENCIA.length) cadeia = [];
      atual = f;
      treinos = 0;
    }
    if (pausou) cadeia = [];
    treinos++;
  }
  return out;
}

/**
 * Técnicas avançadas já feitas (data da primeira vez de cada uma): conta o
 * exercício com técnica que teve pelo menos uma série registrada (sem ser
 * aquecimento) num treino concluído do app.
 */
/**
 * Exercícios que JÁ são parados por natureza (prancha, cadeirinha na parede,
 * hollow hold…): marcar “isometria” neles não é técnica avançada (pedido do
 * personal, 22/10/2026). A isometria continua valendo nos exercícios com movimento.
 */
const ISOMETRICO_POR_NATUREZA = /\b(prancha|plank|cadeirinha|wall ?sit|hollow|isometric[ao]|isometria|parada de mao)\b/;
export const exercicioJaIsometrico = (nome: string) => ISOMETRICO_POR_NATUREZA.test(normalizarNome(nome));

export function tecnicasFeitas(sessoes: SessaoConquista[]): Array<{ familia: FamiliaTecnica; data: string; sessaoId: string }> {
  const out: Array<{ familia: FamiliaTecnica; data: string; sessaoId: string }> = [];
  const vistas = new Set<FamiliaTecnica>();
  const ordenadas = [...sessoes].filter((s) => s.conta_aderencia !== false && s.origem !== "importado" && s.status === "concluida").sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
  for (const s of ordenadas)
    for (const e of s.exercicios ?? []) {
      const f = familiaTecnica(e.tecnica);
      if (!f || vistas.has(f)) continue;
      if (f === "isometria" && exercicioJaIsometrico(e.nome)) continue;
      if (!e.series.some((x) => x.tipo !== "aquecimento" && (x.reps ?? 0) > 0)) continue;
      vistas.add(f);
      out.push({ familia: f, data: s.iniciado_em, sessaoId: s.id });
    }
  return out;
}
export type SessaoConquista = SessaoAderencia & {
  feedback_percepcao?: string | null;
  checkin_pre?: string | null;
  /** false = histórico importado: serve de base para recordes, mas não gera conquistas. */
  conta_aderencia?: boolean;
  exercicios?: Array<{ exercicio_id: string | null; nome: string; series: SerieConquista[]; /** Técnica prescrita no dia (snapshot). */ tecnica?: string | null }>;
  /** "app" ou "importado" (histórico de outro app). */
  origem?: string | null;
  /** Fase do protocolo no dia (snapshot da sessão). */
  fase?: string | null;
};

export type ItemRecorde = { exercicio: string; tipo: "carga" | "reps"; antes: number; agora: number; carga?: number };

export type ConquistaDetectada = {
  codigo: CodigoConquista;
  referencia: string;
  /** Instante do fato que gerou a conquista (ISO). */
  data: string;
  sessaoId: string | null;
  titulo: string;
  descricao: string;
  dados?: { recordes?: ItemRecorde[]; diasAfastado?: number; meta?: number };
  versao: number;
  /** O que sustentou a conquista (semanas, datas) — para auditoria. */
  evidencia: Record<string, unknown>;
  origem: "app" | "importado";
};

export type EntradaConquistas = {
  sessoes: SessaoConquista[];
  aderencia: ResultadoAderencia;
  relatorioVistoEm?: string | null;
  /** Resumo do histórico de outro app: só carga máxima por dia (base para recorde de carga). */
  baseCarga?: BaseCarga[];
  /** AAAA-MM-DD (padrão: hoje em São Paulo). */
  hoje?: string;
  /** Primeira avaliação/medida registrada (ISO) — “Ponto de Partida”. */
  primeiraAvaliacao?: string | null;
  /** Quando o aluno conectou o Strava pela primeira vez (Relógio no Pulso). */
  stravaConectadoEm?: string | null;
  /** Quando cada troféu de compartilhamento foi alcançado (src/lib/conquistas/compartilhar.ts). */
  compartilhar?: MarcosCompartilhar | null;
  /** Quando cada troféu dos desafios entre amigos foi alcançado (src/lib/desafios/regras.ts). */
  desafiosAmigos?: MarcosDesafios | null;
  /** Modo Visitante: desafios em que a pessoa entrou. */
  desafios?: DesafioConquista[];
  /** Montinho Cardio: prescrições (com as antigas) e cardios feitos. */
  cardio?: EntradaCardio | null;
};

const dias = (a: string, b: string) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86_400_000);
const fmtKg = (n: number) => `${String(n).replace(".", ",")} kg`;

let origens = new Map<string, string | null | undefined>();
function nova(codigo: CodigoConquista, referencia: string, data: string, sessaoId: string | null, descricao: string, dados?: ConquistaDetectada["dados"], evidencia: Record<string, unknown> = {}): ConquistaDetectada {
  const origem = sessaoId && origens.get(sessaoId) === "importado" ? "importado" : "app";
  return { codigo, referencia, data, sessaoId, titulo: CATALOGO[codigo].titulo, descricao, dados, versao: VERSAO_CRITERIO[codigo], evidencia, origem };
}
const deAvaliacao = (codigo: CodigoConquista, a: Avaliacao, descricao: string) => (a.conquistada && a.data ? [nova(codigo, "1", a.data, a.sessaoId, descricao, undefined, a.evidencia)] : []);

/** Recordes comparáveis de uma sessão contra todas as anteriores (mesmo exercício). */
export function recordesDaSessao(sessao: SessaoConquista, anteriores: SessaoConquista[], baseCarga: BaseCarga[] = []): ItemRecorde[] {
  if (sessao.feedback_percepcao === "dor" || sessao.checkin_pre === "desconforto") return [];
  const out: ItemRecorde[] = [];
  const chave = (e: { exercicio_id: string | null; nome: string }) => e.exercicio_id ?? `nome:${normalizarNome(e.nome)}`;
  const validas = (xs: SerieConquista[]) => xs.filter((x) => x.tipo === "valida" && (x.carga_kg ?? 0) > 0 && (x.reps ?? 0) > 0);
  for (const ex of sessao.exercicios ?? []) {
    const hoje = validas(ex.series);
    if (!hoje.length) continue;
    const k = chave(ex);
    const nomeK = normalizarNome(ex.nome);
    const historico = anteriores
      .map((s) => (s.exercicios ?? []).find((e) => chave(e) === k || normalizarNome(e.nome) === nomeK))
      .filter((e): e is NonNullable<typeof e> => !!e)
      .map((e) => validas(e.series))
      .filter((xs) => xs.length);
    // Dias do resumo importado contam como registros, mas só informam a carga máxima.
    const diaSessao = dataLocal(sessao.iniciado_em);
    const resumo = baseCarga.filter((b) => b.data < diaSessao && normalizarNome(b.nome) === nomeK);
    if (historico.length + resumo.length < REGRAS_CONQUISTAS.registrosParaRecorde) continue;
    const antes = historico.flat();
    const maxAntes = Math.max(...antes.map((x) => x.carga_kg!), ...resumo.map((b) => b.carga_max));
    const maxHoje = Math.max(...hoje.map((x) => x.carga_kg!));
    if (maxHoje > maxAntes) {
      out.push({ exercicio: ex.nome, tipo: "carga", antes: maxAntes, agora: maxHoje });
      continue;
    }
    // Mais repetições com exatamente a mesma carga já usada antes.
    let melhor: ItemRecorde | null = null;
    for (const s of hoje) {
      const mesmas = antes.filter((x) => x.carga_kg === s.carga_kg);
      if (!mesmas.length) continue;
      const repsAntes = Math.max(...mesmas.map((x) => x.reps!));
      if (s.reps! > repsAntes && (!melhor || s.reps! - repsAntes > melhor.agora - melhor.antes)) melhor = { exercicio: ex.nome, tipo: "reps", antes: repsAntes, agora: s.reps!, carga: s.carga_kg! };
    }
    if (melhor) out.push(melhor);
  }
  return out.slice(0, 3);
}

export function textoRecorde(r: ItemRecorde): string {
  return r.tipo === "carga" ? `${r.exercicio}: ${fmtKg(r.agora)} (antes ${fmtKg(r.antes)})` : `${r.exercicio}: ${r.agora} repetições com ${fmtKg(r.carga ?? 0)} (antes ${r.antes})`;
}

/** Todas as conquistas que os dados sustentam (a persistência deduplica). */
export function detectarConquistas(e: EntradaConquistas): ConquistaDetectada[] {
  const out: ConquistaDetectada[] = [];
  const hoje = e.hoje ?? dataLocal(new Date());
  origens = new Map(e.sessoes.map((x) => [x.id, x.origem]));
  const todas = [...e.sessoes].filter((s) => s.status !== "em_andamento").sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
  // Base de comparação para recordes: inclui o histórico importado.
  const baseRecordes = todas.filter((s) => ["concluida", "parcial"].includes(classificarSessao(s)));
  const ordenadas = todas.filter((s) => s.conta_aderencia !== false);
  const concluidas = ordenadas.filter((s) => classificarSessao(s) === "concluida");
  const validas = ordenadas.filter((s) => ["concluida", "parcial"].includes(classificarSessao(s)));

  if (concluidas[0]) out.push(nova("primeiro_treino", "1", concluidas[0].iniciado_em, concluidas[0].id, "Você concluiu seu primeiro treino no app."));
  // Começo (23/10/2026): pequenas atitudes do início.
  const ehDoApp = (s: SessaoConquista) => s.origem !== "importado";
  const doApp = concluidas.filter(ehDoApp);
  const pct = (s: SessaoConquista) => (s.series_planejadas ? s.series_concluidas / s.series_planejadas : 0);
  const completo = doApp.find((s) => s.series_planejadas > 0 && s.series_concluidas >= s.series_planejadas);
  if (completo) out.push(nova("missao_cumprida", "1", completo.iniciado_em, completo.id, "Primeiro treino com todas as séries feitas."));
  const bons = doApp.filter((s) => pct(s) >= LIMITES_COMECO.pctSeries / 100);
  const terceiro = bons[LIMITES_COMECO.treinosBons - 1];
  if (terceiro) out.push(nova("terceiro_especial", "1", terceiro.iniciado_em, terceiro.id, `${LIMITES_COMECO.treinosBons} treinos com ${LIMITES_COMECO.pctSeries}% ou mais das séries.`));
  const comCargas = doApp.find((s) => exerciciosComCarga(s) >= LIMITES_COMECO.exerciciosComCarga);
  if (comCargas) out.push(nova("cada_quilo_conta", "1", comCargas.iniciado_em, comCargas.id, `Cargas anotadas em ${exerciciosComCarga(comCargas)} exercícios no mesmo treino.`));
  if (e.primeiraAvaliacao) out.push(nova("ponto_de_partida", "1", e.primeiraAvaliacao, null, "Primeira avaliação registrada: o ponto de partida da sua evolução."));
  const cp = e.compartilhar;
  if (cp?.primeiro) out.push(nova("compartilhou_primeiro", "1", cp.primeiro, null, "Você compartilhou a sua evolução pela primeira vez."));
  if (cp?.diario) out.push(nova("diario_de_bordo", "1", cp.diario, null, `Card do fim do treino compartilhado em ${LIMITES_COMPARTILHAR.semanasDiario} semanas diferentes.`));
  if (cp?.vitrine) out.push(nova("vitrine_de_trofeus", "1", cp.vitrine, null, `${LIMITES_COMPARTILHAR.trofeusVitrine} troféus diferentes compartilhados.`));
  if (cp?.inspiracao) out.push(nova("inspiracao_galera", "1", cp.inspiracao, null, "Alguém abriu o link de um card que você compartilhou."));
  if (cp?.amigo) out.push(nova("trouxe_amigo", "1", cp.amigo, null, "Um amigo entrou no app pelo seu convite."));
  const da = e.desafiosAmigos;
  if (da?.criador) out.push(nova("criador_desafios", "1", da.criador, null, "Você criou um desafio que chegou até o fim com os amigos."));
  if (da?.campeao) out.push(nova("campeao_desafio", "1", da.campeao, null, "1º lugar num desafio entre amigos."));
  if (da?.palavra) out.push(nova("palavra_cumprida", "1", da.palavra, null, "Meta do desafio cumprida até o fim."));
  if (da?.nato) out.push(nova("desafiante_nato", "1", da.nato, null, `${LIMITES_DESAFIO.desafiosParaNato} desafios entre amigos até o fim.`));
  if (e.cardio) for (const t of trofeusDoCardio(e.cardio, hoje)) out.push(nova(t.codigo, t.referencia, t.data, null, t.descricao, undefined, t.evidencia));
  if (e.stravaConectadoEm) out.push(nova("strava_conectado", "1", e.stravaConectadoEm, null, "Relógio conectado pelo Strava: seus batimentos e cardios entram no acompanhamento."));
  const validasDoApp = validas.filter(ehDoApp);
  if (validasDoApp[0]) {
    const d0 = dataLocal(validasDoApp[0].iniciado_em);
    for (let i = 1; i < validasDoApp.length; i++) {
      const b = dataLocal(validasDoApp[i].iniciado_em);
      if (dias(d0, b) > LIMITES_COMECO.diasInicio) break;
      const gap = dias(dataLocal(validasDoApp[i - 1].iniciado_em), b);
      if (gap >= LIMITES_COMECO.pausaMin && gap <= LIMITES_COMECO.pausaMax) {
        out.push(nova("voltei_pro_jogo", "1", validasDoApp[i].iniciado_em, validasDoApp[i].id, `De volta depois de ${gap} dias.`, { diasAfastado: gap }));
        break;
      }
    }
  }

  for (const n of [10, 25, 50] as const) {
    const s = concluidas[n - 1];
    if (s) out.push(nova(`treinos_${n}`, "1", s.iniciado_em, s.id, `Você chegou a ${n} treinos concluídos.`));
  }

  // Primeiro mês (critério v2): 4 treinos em 3 semanas nos 35 primeiros dias, 28+ dias passados.
  out.push(...deAvaliacao("primeiro_mes", avaliarPrimeiroMes(validas, hoje), "Um mês treinando com acompanhamento, em semanas diferentes."));
  // Janelas de semanas (Conquistas 3.0).
  out.push(...deAvaliacao("criando_raizes", avaliarRaizes(e.aderencia.semanas, validas, hoje), "Você treinou em duas semanas diferentes logo no começo."));
  out.push(...deAvaliacao("constancia_vida_real", avaliarJanela(e.aderencia.semanas, validas, LIMITES.vidaReal), "Meta cumprida em 3 de 4 semanas seguidas."));
  out.push(...deAvaliacao("constancia_verdade", avaliarJanela(e.aderencia.semanas, validas, LIMITES.verdade), "Meta cumprida em 8 de 12 semanas seguidas."));
  out.push(...deAvaliacao("recomeco_consistente", avaliarRecomeco(validas, hoje), "Depois de uma pausa, você voltou e treinou de novo em outra semana."));

  // Semanas: meta cumprida, sequência (pausa/sem prescrição não quebram) e acompanhamento.
  const sessaoDaSemana = (inicio: string) => [...validas].reverse().find((s) => { const d = dataLocal(s.iniciado_em); return d >= inicio && d <= somarDias(inicio, 6); });
  let seq = 0;
  let participando = 0;
  let primeiraMeta = false;
  const marcos = new Set<number>();
  for (const w of e.aderencia.semanas) {
    if (w.status === "cumprida") {
      seq++;
      const s = sessaoDaSemana(w.inicio);
      if (!primeiraMeta && s) {
        primeiraMeta = true;
        out.push(nova("primeira_meta_semanal", "1", s.iniciado_em, s.id, `Meta de ${w.meta} treino(s) cumprida na semana de ${w.inicio.slice(8, 10)}/${w.inicio.slice(5, 7)}.`, { meta: w.meta ?? undefined }));
      }
      for (const n of MARCOS_SEMANAS) {
        if (seq === n && !marcos.has(n) && s) {
          marcos.add(n);
          out.push(nova(`semanas_consistentes_${n}`, "1", s.iniciado_em, s.id, `${n} semanas seguidas cumprindo a meta.`));
        }
      }
    } else if (w.status !== "pausada" && w.status !== "sem_prescricao" && !w.atual) {
      seq = 0;
    }
    if (w.meta && !w.pausada && (w.concluidas + w.parciais) > 0) {
      participando++;
      const s = sessaoDaSemana(w.inicio);
      if (participando === 12 && s) out.push(nova("acompanhamento_12_semanas", "1", s.iniciado_em, s.id, "12 semanas treinando com acompanhamento."));
    }
  }

  // Retomadas: treino depois de 14+ dias sem treinar.
  for (let i = 1; i < validas.length; i++) {
    const a = dataLocal(validas[i - 1].iniciado_em);
    const b = dataLocal(validas[i].iniciado_em);
    const gap = dias(a, b);
    if (gap >= REGRAS_CONQUISTAS.diasRetomada) out.push(nova("eu_voltei", b, validas[i].iniciado_em, validas[i].id, "Você voltou a treinar.", { diasAfastado: gap }));
  }

  // Recordes (uma conquista por sessão, até 3 marcas).
  for (let i = 0; i < baseRecordes.length; i++) {
    const s = baseRecordes[i];
    if (s.conta_aderencia === false) continue; // histórico importado não vira conquista
    const r = recordesDaSessao(s, baseRecordes.slice(0, i), e.baseCarga);
    if (r.length) out.push(nova("recorde", s.id, s.iniciado_em, s.id, r.map(textoRecorde).join(" · "), { recordes: r }));
  }

  if (e.relatorioVistoEm) out.push(nova("relatorio_mensal", "1", e.relatorioVistoEm, null, "Você abriu sua evolução completa."));

  // Além do necessário: treino curto concluído, treinos extras e séries extras.
  const curtos = concluidas.filter((s) => s.modo === "reduzido");
  if (curtos[0]) out.push(nova("fiz_o_necessario", "1", curtos[0].iniciado_em, curtos[0].id, "Dia corrido, treino feito na versão curta."));
  const c5 = curtos[LIMITES_ALEM.curtos - 1];
  if (c5) out.push(nova("nunca_deixei_pra_depois", "1", c5.iniciado_em, c5.id, `${LIMITES_ALEM.curtos} treinos na versão curta: nos dias corridos, você não deixou pra depois.`));
  const extras = ordenadas.filter((s) => classificarSessao(s) === "extra");
  const marcosExtra: Array<[CodigoConquista, number, string]> = [["fui_alem", 1, "Seu primeiro treino extra, dentro do combinado com o personal."], ["milha_extra", LIMITES_ALEM.extras, `${LIMITES_ALEM.extras} treinos extras concluídos.`], ["sempre_um_a_mais", LIMITES_ALEM.extrasMuitos, `${LIMITES_ALEM.extrasMuitos} treinos extras concluídos.`]];
  for (const [codigo, n, txt] of marcosExtra) {
    const s = extras[n - 1];
    if (s) out.push(nova(codigo, "1", s.iniciado_em, s.id, txt));
  }
  let somaExtras = 0;
  for (const s of concluidas) {
    if (s.modo === "extra") continue;
    somaExtras += Math.max(0, (s.series_concluidas || 0) - (s.series_planejadas || 0));
    if (somaExtras >= LIMITES_ALEM.seriesExtras) {
      out.push(nova("uma_a_mais", "1", s.iniciado_em, s.id, `${LIMITES_ALEM.seriesExtras} séries além das prescritas, somando os treinos.`));
      break;
    }
  }

  // Fases do protocolo: chegou na intensificação; completou cada fase (N treinos nela e depois outra fase).
  for (const f of fasesConquistadas(e.sessoes)) out.push(nova(f.codigo, "1", f.data, f.sessaoId, f.texto));
  // Treino do Samurai: musculação começada até as 4h30 (horário de Brasília), concluída e com séries.
  const samurai = ordenadas.find((s) => s.origem !== "importado" && s.origem !== "legado_logbook" && (s.series_concluidas ?? 0) > 0 && ["concluida", "extra"].includes(classificarSessao(s)) && ehHorarioSamurai(s.iniciado_em));
  if (samurai) out.push(nova("treino_samurai", "1", samurai.iniciado_em, samurai.id, `Treino começado às ${horaBrasilia(samurai.iniciado_em)} da manhã. Disciplina de samurai.`));
  for (const d of e.desafios ?? []) {
    const p = progressoDesafio(d, concluidas);
    if (p.concluidoEm) out.push(nova("desafio_concluido", d.id, p.concluidoEm.data, p.concluidoEm.sessaoId, `Você concluiu o ${d.nome}: ${d.metaTreinos} treinos no prazo.`, undefined, { meta: d.metaTreinos, campanha: d.id }));
  }

  // Técnicas avançadas: 1, 2, 3, 4, 5, 7, 10 e todas as técnicas diferentes.
  const tecnicas = tecnicasFeitas(e.sessoes);
  for (const [codigo, n] of MARCOS_TECNICA) {
    const t = tecnicas[n - 1];
    if (!t) continue;
    const nomes = tecnicas.slice(0, n).map((x) => TECNICAS_MEDALHA[x.familia]);
    out.push(nova(codigo, "1", t.data, t.sessaoId, n === 1 ? `Primeira técnica avançada: ${nomes[0]}.` : n === TOTAL_TECNICAS ? "Você já fez todas as técnicas avançadas!" : `${n} técnicas diferentes: ${nomes.join(", ")}.`));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Mensagem contextual da conclusão (sempre identificada como automática)
// ---------------------------------------------------------------------------
export type ModeloCard = "A" | "B" | "C" | "D";

export type ContextoConclusao = {
  sessao: SessaoConquista;
  /** Conquistas ligadas a esta sessão. */
  conquistas: Array<{ codigo: CodigoConquista | string }>;
  meta: number | null;
  /** Treinos válidos da semana (concluídas + 0,5 × parciais, sem extras), já com esta sessão. */
  pontosSemana: number;
};

export type ResultadoMensagem = { mensagem: string; modeloSugerido: ModeloCard; metaCumpridaAgora: boolean };

export function mensagemConclusao(c: ContextoConclusao): ResultadoMensagem {
  const classe = classificarSessao(c.sessao);
  const tem = (k: CodigoConquista) => c.conquistas.some((x) => x.codigo === k);
  const valor = classe === "concluida" ? 1 : classe === "parcial" ? 0.5 : 0;
  const metaCumpridaAgora = !!c.meta && valor > 0 && c.pontosSemana >= c.meta && c.pontosSemana - valor < c.meta;

  if (c.sessao.feedback_percepcao === "dor" || c.sessao.checkin_pre === "desconforto")
    return { mensagem: "Treino registrado. Como você relatou desconforto, o personal vai ver isso antes do próximo treino.", modeloSugerido: "A", metaCumpridaAgora };
  if (classe === "extra") return { mensagem: "Hoje teve um chalalá extra!", modeloSugerido: "A", metaCumpridaAgora: false };
  if (tem("eu_voltei")) return { mensagem: "Você voltou. E isso já é uma conquista.", modeloSugerido: "D", metaCumpridaAgora };
  if (tem("primeiro_treino")) return { mensagem: "Todo resultado começa com um primeiro passo.", modeloSugerido: "A", metaCumpridaAgora };
  if (metaCumpridaAgora) return { mensagem: "Você cumpriu sua meta da semana. Constância em construção!", modeloSugerido: "B", metaCumpridaAgora };
  if (tem("recorde")) return { mensagem: "Mais uma evolução registrada. Seu esforço está aparecendo nos números.", modeloSugerido: "C", metaCumpridaAgora };
  if (classe === "parcial" || c.sessao.modo === "reduzido") return { mensagem: "Hoje você adaptou a rotina e conseguiu treinar.", modeloSugerido: "A", metaCumpridaAgora };
  return { mensagem: "Mais um passo na sua evolução.", modeloSugerido: "A", metaCumpridaAgora };
}
