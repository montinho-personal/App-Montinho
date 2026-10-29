// ============================================================================
// Início do dia (pedido do Montinho, 29/10/2026): depois do treino de hoje, o
// Início comemora em vez de chamar para outro treino.
// • Treino feito e cardio prescrito ainda pendente → destaque para o cardio;
// • Treino e cardio feitos (ou sem cardio para hoje) → dia completo;
// • Treino ainda não feito → o Início segue como sempre.
// ============================================================================

export type EstadoDia = "a_fazer" | "falta_cardio" | "completo";

export function estadoDoDia(e: { treinoHoje: boolean; cardioHoje: boolean; cardioPendente: boolean }): EstadoDia {
  if (!e.treinoHoje) return "a_fazer";
  if (e.cardioPendente && !e.cardioHoje) return "falta_cardio";
  return "completo";
}

const FRASES = [
  "Treino pago! Constância é isso: um dia de cada vez.",
  "Missão do dia cumprida. Amanhã o corpo agradece.",
  "Hoje você fez a sua parte. Chalalá!",
  "Mais um tijolo na sua evolução.",
  "Quem aparece todo dia não precisa de sorte.",
  "Feito é melhor que perfeito. E hoje foi feito!",
  "Seu eu do futuro mandou um obrigado.",
];
const FRASES_COMPLETO = [
  "Dia completo: força e fôlego no mesmo dia!",
  "Musculação e cardio pagos. Dia de respeito!",
  "Combo do dia fechado. Agora é descansar bem.",
];

/** Frase do dia: fixa no mesmo dia (não muda a cada abertura). */
export function fraseDoDia(dia: string, completo: boolean): string {
  const lista = completo ? FRASES_COMPLETO : FRASES;
  const n = [...dia].reduce((a, c) => a + c.charCodeAt(0), 0);
  return lista[n % lista.length];
}
