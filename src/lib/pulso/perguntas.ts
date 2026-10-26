// ============================================================================
// Montinho Pulso — cardápio ÚNICO de perguntas de acompanhamento.
// Cada pergunta tem uma DIMENSÃO; duas perguntas da mesma dimensão nunca
// convivem (deduplicação de sentido: “energia” = “disposição” = “pique”).
// A resposta vale por um prazo (validade) e depois deixa de ser usada.
// Não é questionário médico nem avaliação psicológica.
// ============================================================================

export type Dimensao = "energia" | "recuperacao" | "motivacao" | "dificuldade" | "sono";

export type Opcao = {
  v: string;
  rotulo: string;
  emoji: string;
  /** −2 (pior) … +2 (melhor). `null` = não entra em média (ex.: dificuldade). */
  nivel: number | null;
};

export type Pergunta = {
  dimensao: Dimensao;
  pergunta: string;
  opcoes: Opcao[];
  /** Por quantos dias a resposta vale (1 = só o dia, no horário de Brasília). */
  validadeDias: number;
  /** Dado de saúde (LGPD art. 11): só com consentimento específico. */
  saude: boolean;
  /** Várias opções ao mesmo tempo. */
  multipla?: boolean;
};

export const PERGUNTAS: Record<Dimensao, Pergunta> = {
  energia: {
    dimensao: "energia",
    pergunta: "Como está sua energia hoje?",
    validadeDias: 1,
    saude: false,
    opcoes: [
      { v: "muito_baixa", rotulo: "Muito baixa", emoji: "🪫", nivel: -2 },
      { v: "baixa", rotulo: "Baixa", emoji: "😮‍💨", nivel: -1 },
      { v: "normal", rotulo: "Normal", emoji: "🙂", nivel: 0 },
      { v: "alta", rotulo: "Alta", emoji: "⚡", nivel: 1 },
      { v: "muito_alta", rotulo: "Muito alta", emoji: "🔥", nivel: 2 },
    ],
  },
  recuperacao: {
    dimensao: "recuperacao",
    pergunta: "Como seu corpo está se sentindo?",
    validadeDias: 1,
    saude: true,
    opcoes: [
      { v: "bem", rotulo: "Bem recuperado", emoji: "💪", nivel: 1 },
      { v: "um_pouco_cansado", rotulo: "Um pouco cansado", emoji: "😐", nivel: 0 },
      { v: "muito_cansado", rotulo: "Muito cansado", emoji: "😩", nivel: -1 },
      { v: "desconforto", rotulo: "Com algum desconforto", emoji: "🩹", nivel: -2 },
    ],
  },
  motivacao: {
    dimensao: "motivacao",
    pergunta: "Como está sua vontade de treinar?",
    validadeDias: 3,
    saude: false,
    opcoes: [
      { v: "nenhuma", rotulo: "Nenhuma", emoji: "😶", nivel: -2 },
      { v: "pouca", rotulo: "Pouca", emoji: "🙁", nivel: -1 },
      { v: "normal", rotulo: "Normal", emoji: "🙂", nivel: 0 },
      { v: "muita", rotulo: "Muita", emoji: "🤩", nivel: 2 },
    ],
  },
  dificuldade: {
    dimensao: "dificuldade",
    pergunta: "O que mais está dificultando seus treinos?",
    validadeDias: 7,
    saude: false,
    multipla: true,
    opcoes: [
      { v: "falta_tempo", rotulo: "Falta de tempo", emoji: "⏰", nivel: null },
      { v: "cansaco", rotulo: "Cansaço", emoji: "😮‍💨", nivel: null },
      { v: "desmotivacao", rotulo: "Desmotivação", emoji: "🙁", nivel: null },
      { v: "exercicios", rotulo: "Dificuldade com exercícios", emoji: "🤔", nivel: null },
      { v: "rotina_corrida", rotulo: "Rotina corrida", emoji: "🏃", nivel: null },
      { v: "nada", rotulo: "Nada no momento", emoji: "✅", nivel: null },
    ],
  },
  sono: {
    dimensao: "sono",
    pergunta: "Como você dormiu?",
    validadeDias: 1,
    saude: true,
    opcoes: [
      { v: "muito_mal", rotulo: "Muito mal", emoji: "😵", nivel: -2 },
      { v: "mal", rotulo: "Mal", emoji: "😴", nivel: -1 },
      { v: "razoavel", rotulo: "Razoavelmente", emoji: "😐", nivel: 0 },
      { v: "bem", rotulo: "Bem", emoji: "🙂", nivel: 1 },
      { v: "muito_bem", rotulo: "Muito bem", emoji: "😌", nivel: 2 },
    ],
  },
};

export const DIMENSOES = Object.keys(PERGUNTAS) as Dimensao[];

/** Opção da dimensão (ou undefined se o valor não existe no cardápio). */
export function opcao(d: Dimensao, v: string): Opcao | undefined {
  return PERGUNTAS[d].opcoes.find((o) => o.v === v);
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Palavras que identificam o SENTIDO de uma pergunta (para não criar duas
// perguntas iguais escritas de outro jeito). A ordem importa: a primeira que casa vale.
const SENTIDOS: Array<[Dimensao, RegExp]> = [
  ["sono", /\b(dorm|sono|noite)/],
  ["dificuldade", /(dificult|atrapalh|impedi|barreira|obstacul)/],
  ["motivacao", /(vontade|motivac|animo|animad)/],
  ["recuperacao", /(corpo|recupera|dor\b|dores|desconfort|cansac|cansad|dolorid)/],
  ["energia", /(energia|disposic|disposto|pique|bateria|como (voce )?esta hoje)/],
];

/** Dimensão de uma pergunta escrita livremente (null = sentido novo). */
export function dimensaoDaPergunta(texto: string): Dimensao | null {
  const t = semAcento(texto);
  for (const [d, re] of SENTIDOS) if (re.test(t)) return d;
  return null;
}

// ---------------------------------------------------------------------------
// Datas no horário de Brasília (a resposta “de hoje” vira à meia-noite de SP).
const FMT_DIA = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
export const diaSP = (iso: string | Date) => FMT_DIA.format(typeof iso === "string" ? new Date(iso) : iso);
const utc = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
/** Dias de calendário entre duas datas AAAA-MM-DD (b − a). */
export const diasEntre = (a: string, b: string) => Math.round((utc(b) - utc(a)) / 86_400_000);

/** A resposta dada em `em` ainda vale `hoje`? */
export function valida(d: Dimensao, em: string, hoje: string): boolean {
  const n = diasEntre(diaSP(em), hoje);
  return n >= 0 && n < PERGUNTAS[d].validadeDias;
}
