// ============================================================================
// Montinho Pulso — escolha adaptativa das perguntas (regras puras e testadas).
// No máximo 2 perguntas por vez (10–15 s), sempre com “Pular”. Nunca pergunta
// o que já sabemos (resposta ainda válida, de qualquer tela do app).
// ============================================================================

import { PERGUNTAS, diaSP, opcao, valida, type Dimensao } from "./perguntas";
import type { RespostaPulso } from "./equivalencias";

export type MomentoPulso = "pre_treino" | "inicio";

export type ContextoEscolha = {
  /** Hoje (AAAA-MM-DD, Brasília). */
  hoje: string;
  /** Respostas conhecidas (Pulso e equivalências), de preferência dos últimos 30 dias. */
  respostas: RespostaPulso[];
  /** Pulou ou disse “prefiro não” hoje. */
  pulouHoje: boolean;
  /** Dias desde o último treino válido (null = nunca treinou). */
  diasSemTreino: number | null;
  /** Consentimento para dado de saúde (recuperação e sono). */
  consentimentoSaude: boolean;
  /** Meta semanal cumprida nas últimas semanas (constância boa). */
  constanciaBoa: boolean;
  momento: MomentoPulso;
};

export type EscolhaPulso = { perguntas: Dimensao[]; motivo: string };

/** Regras ajustáveis (padrões pensados para não cansar o aluno). */
export const REGRAS_ESCOLHA = {
  maxPerguntas: 2,
  /** Dias sem treinar para considerar “voltando” e perguntar o que atrapalhou. */
  diasRetorno: 7,
  /** Cansaço em X das últimas N respostas de recuperação/energia → pergunta o sono. */
  cansacoVezes: 2,
  cansacoJanela: 4,
  /** Dias sem treinar a partir dos quais vale perguntar a vontade de treinar. */
  diasMotivacao: 4,
} as const;

const NADA: EscolhaPulso = { perguntas: [], motivo: "" };

/** Respostas ainda válidas hoje, por dimensão. */
export function validasHoje(respostas: RespostaPulso[], hoje: string): Set<Dimensao> {
  const out = new Set<Dimensao>();
  for (const x of respostas) if (valida(x.dimensao, x.em, hoje)) out.add(x.dimensao);
  return out;
}

const nivel = (x: RespostaPulso) => opcao(x.dimensao, x.valor)?.nivel ?? null;

/** Últimas `n` respostas das dimensões dadas, mais recentes primeiro (uma por dia e dimensão). */
export function ultimas(respostas: RespostaPulso[], dims: Dimensao[], n: number): RespostaPulso[] {
  const vistos = new Set<string>();
  const out: RespostaPulso[] = [];
  for (const x of [...respostas].sort((a, b) => (a.em < b.em ? 1 : -1))) {
    if (!dims.includes(x.dimensao)) continue;
    const k = `${x.dimensao}:${diaSP(x.em)}`;
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push(x);
    if (out.length >= n) break;
  }
  return out;
}

/** Cansaço frequente: energia baixa ou corpo cansado em X das últimas N respostas. */
export function cansacoFrequente(respostas: RespostaPulso[]): boolean {
  const ult = ultimas(respostas, ["energia", "recuperacao"], REGRAS_ESCOLHA.cansacoJanela);
  return ult.filter((x) => (x.dimensao === "energia" ? (nivel(x) ?? 0) < 0 : x.valor === "um_pouco_cansado" || x.valor === "muito_cansado")).length >= REGRAS_ESCOLHA.cansacoVezes;
}

/** Tudo bem nas últimas respostas (nenhuma abaixo de “normal”). */
function tudoBemRecente(respostas: RespostaPulso[]): boolean {
  const ult = ultimas(respostas, ["energia", "recuperacao", "motivacao"], 3);
  return ult.length >= 3 && ult.every((x) => (nivel(x) ?? 0) >= 0);
}

export function escolherPerguntas(ctx: ContextoEscolha): EscolhaPulso {
  if (ctx.pulouHoje) return NADA;
  const ja = validasHoje(ctx.respostas, ctx.hoje);
  const pode = (d: Dimensao) => !ja.has(d) && (!PERGUNTAS[d].saude || ctx.consentimentoSaude);
  const voltando = ctx.diasSemTreino === null ? false : ctx.diasSemTreino >= REGRAS_ESCOLHA.diasRetorno;

  // No Início, o Pulso só aparece para quem está voltando (momento natural, sem pop-up).
  if (ctx.momento === "inicio") {
    if (!voltando || !pode("dificuldade")) return NADA;
    return { perguntas: ["dificuldade", ...(pode("motivacao") ? (["motivacao"] as Dimensao[]) : [])], motivo: `Voltando depois de ${ctx.diasSemTreino} dias: entender o que atrapalhou.` };
  }

  // Antes do treino: prioridade fixa e explicável.
  const fila: Array<[Dimensao, string]> = [];
  if (voltando) fila.push(["dificuldade", `Voltando depois de ${ctx.diasSemTreino} dias sem treinar.`]);
  fila.push(["recuperacao", "Saber como o corpo está antes de treinar."]);
  if (cansacoFrequente(ctx.respostas)) fila.push(["sono", "Cansaço em respostas recentes."]);
  fila.push(["energia", "Termômetro do dia."]);
  if ((ctx.diasSemTreino ?? 0) >= REGRAS_ESCOLHA.diasMotivacao || ultimas(ctx.respostas, ["energia"], 2).some((x) => (nivel(x) ?? 0) < 0))
    fila.push(["motivacao", "Alguns dias sem treinar ou energia baixa recente."]);

  let lista = fila.filter(([d]) => pode(d));
  // Constância boa e respostas boas: uma pergunta só, para não cansar.
  const leve = ctx.constanciaBoa && tudoBemRecente(ctx.respostas) && !voltando;
  lista = lista.slice(0, leve ? 1 : REGRAS_ESCOLHA.maxPerguntas);
  if (!lista.length) return NADA;
  return { perguntas: lista.map(([d]) => d), motivo: lista.map(([, m]) => m).join(" ") };
}

/** Momento da resposta mais recente (o “último check-in” do painel). */
export function ultimaResposta(respostas: RespostaPulso[]): string | null {
  return respostas.reduce<string | null>((m, x) => (m === null || x.em > m ? x.em : m), null);
}
