// Microvitórias no treino (Fase 1, 29/10/2026): reconhecimento discreto ao
// concluir exercícios — no máximo 2 por treino (1º exercício e metade), sem
// confete, sem janela, nunca com desconforto e nunca empurrando carga. PURO.
export type MicroVitoria = "primeiro" | "metade";

export const TEXTO_MICRO: Record<MicroVitoria, string> = {
  primeiro: "Primeiro exercício feito ✓ Bora pro próximo!",
  metade: "Metade do treino feita! Você está indo muito bem.",
};

/** Qual microvitória mostrar agora (null = nenhuma). `vistas` = as que já apareceram neste treino. */
export function microVitoria(feitos: number, total: number, vistas: ReadonlySet<MicroVitoria>, desconforto = false): MicroVitoria | null {
  if (desconforto || total < 2 || feitos <= 0 || feitos >= total) return null;
  if (feitos === 1 && !vistas.has("primeiro")) return "primeiro";
  if (total >= 4 && feitos === Math.ceil(total / 2) && !vistas.has("metade")) return "metade";
  return null;
}
