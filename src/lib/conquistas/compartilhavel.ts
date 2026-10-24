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
  recomeco_consistente: { frase: "Eu recomecei. E continuei.", porque: "Retomar e manter na semana seguinte mostra a rotina se reorganizando." },
  recorde: { frase: "Mais forte do que da última vez.", porque: "Superar a própria marca é um dos sinais mais claros de progresso no treino." },
  eu_voltei: { frase: "De volta ao jogo.", porque: "Pausas acontecem. Voltar é o que importa na trajetória." },
  fiz_o_necessario: { frase: "Tinha tudo pra faltar. Fui e fiz.", porque: "Nos dias corridos, aparecer é o que mantém a constância." },
  nunca_deixei_pra_depois: { frase: "Dia corrido não é desculpa.", porque: "Ajustar o treino ao dia, em vez de faltar, é o que mantém a rotina de pé." },
  fui_alem: { frase: "Hoje eu fui além.", porque: "Um treino a mais, dentro do combinado, soma movimento à semana." },
  milha_extra: { frase: "Eu vou além do combinado.", porque: "Pequenos acréscimos, semana após semana, fazem diferença." },
  sempre_um_a_mais: { frase: "Sempre um a mais.", porque: "Ir além, com equilíbrio e acompanhamento, virou parte da minha rotina." },
  uma_a_mais: { frase: "Sobrou gás? Uma a mais.", porque: "Aproveitar os dias bons ajuda a completar o volume planejado da semana." },
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
      return "50 treinos concluídos";
    case "semanas_consistentes_4":
      return "4 semanas seguidas com a meta cumprida";
    case "semanas_consistentes_5":
    case "semanas_consistentes_6":
    case "semanas_consistentes_8":
    case "semanas_consistentes_10":
      return `${c.codigo.split("_").at(-1)} semanas seguidas com a meta cumprida`;
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

export type CardMedalha = { selo: string; titulo: string; destaque: string | null; frase: string; porque: string; nome: string; data: string; legenda: string; /** Troféu lendário (Guerreiro): visual de fogo. */ lendaria?: boolean };

const SELO_EXTRA: Record<string, string> = { recorde: "★", eu_voltei: "↺" };
export const seloDaConquista = (codigo: string) => ORDEM.find((o) => o.codigo === codigo)?.selo ?? SELO_EXTRA[codigo] ?? "★";

/** Tudo o que vai no card da medalha (mesmo texto na tela e na imagem). */
export function cardDaMedalha(c: { codigo: string; titulo?: string | null; descricao?: string | null; conquistado_em: string; dados?: { recordes?: ItemRecorde[]; diasAfastado?: number; meta?: number } | null }, nome: string): CardMedalha {
  const t = TEXTO_COMPARTILHAVEL[c.codigo as CodigoConquista] ?? { frase: CONTEUDO[c.codigo as CodigoConquista]?.mensagem ?? "Mais uma conquista.", porque: "" };
  const titulo = nomeDaConquista(c.codigo, c.titulo);
  const data = c.conquistado_em.slice(0, 10);
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
  };
}
