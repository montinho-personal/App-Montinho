// ============================================================================
// “É impossível dar errado!” — a frase da CONFIANÇA (PURO, testado).
// Aparece nos momentos de dúvida (antes de começar, dia ruim, volta, treino
// curto, ficha nova) e no treino parcial. Vale para aparecer e fazer o
// possível — nunca promete resultado. Textos escritos pelo Montinho.
// Regras: no máx. 1 por dia e 3 por semana; nunca com dor/desconforto.
// Antes do treino ela SUBSTITUI o “Bora treinar?” (não soma).
// ============================================================================

import { REGRAS_CONQUISTAS } from "@/lib/conquistas/regras";

export const FRASES_CONFIANCA = {
  primeiro_treino: "Primeiro treino com o Montinho? Relaxa. Se fizer o que é necessário ser feito, é impossível dar errado!",
  cansado: "Dia puxado? Faz o que der hoje. Do jeito que for, é impossível dar errado!",
  tempo_curto: "Treino curto também conta. O mais importante é a consistência. Com isso, é impossível dar errado!",
  voltou: "Voltou? Então já deu certo. Daqui pra frente, é impossível dar errado!",
  ficha_nova: "Ficha nova na área! Faça o que tem que ser feito, porque é impossível dar errado!",
  parcial: "Fez parte? Já valeu! Quem aparece, não tem como dar errado.",
} as const;
export type ContextoConfianca = keyof typeof FRASES_CONFIANCA;

export const LIMITE_CONFIANCA = { porDia: 1, porSemana: 3, diasFichaNova: 30 } as const;

export type EntradaConfianca = {
  /** Treinos concluídos antes deste (app + importados). */
  concluidas: number;
  /** Dias desde o último treino concluído (null = nunca). */
  diasDesdeUltimo: number | null;
  /** A ficha foi publicada há pouco e ainda não houve treino concluído depois. */
  fichaNova: boolean;
  checkin: string | null | undefined;
  tempoCurto: boolean;
};

/** Qual frase (se alguma) antes do treino. Ordem: primeiro > voltou > ficha nova > cansado > tempo curto. */
export function confiancaAntesDoTreino(e: EntradaConfianca): ContextoConfianca | null {
  if (e.checkin === "desconforto") return null; // dor: o momento é de cuidado, não de bordão
  if (e.concluidas === 0) return "primeiro_treino";
  if (e.diasDesdeUltimo != null && e.diasDesdeUltimo >= REGRAS_CONQUISTAS.diasRetomada) return "voltou";
  if (e.fichaNova) return "ficha_nova";
  if (e.checkin === "cansado") return "cansado";
  if (e.tempoCurto) return "tempo_curto";
  return null;
}

/** No fim: só no treino parcial e sem dor. */
export function confiancaNoFim(e: { parcial: boolean; dor: boolean }): ContextoConfianca | null {
  return e.parcial && !e.dor ? "parcial" : null;
}

/** Frequência: máx. 1 por dia (local) e 3 nos últimos 7 dias. `mostradas` = instantes ISO. */
export function podeMostrarConfianca(mostradas: string[], agora: Date): boolean {
  const dia = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const hoje = dia(agora);
  if (mostradas.some((m) => dia(new Date(m)) === hoje)) return false;
  const semana = agora.getTime() - 7 * 86_400_000;
  return mostradas.filter((m) => new Date(m).getTime() > semana).length < LIMITE_CONFIANCA.porSemana;
}

/** Ficha nova = publicada nos últimos 30 dias, com treinos ANTES dela e nenhum concluído depois. */
export function ehFichaNova(e: { publicadaEm: string | null; ultimaConcluida: string | null; agora: Date }): boolean {
  if (!e.publicadaEm || !e.ultimaConcluida) return false;
  if (e.agora.getTime() - new Date(e.publicadaEm).getTime() > LIMITE_CONFIANCA.diasFichaNova * 86_400_000) return false;
  return e.ultimaConcluida < e.publicadaEm;
}
