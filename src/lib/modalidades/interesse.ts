// ============================================================================
// O que a pessoa gosta de treinar (Multimodalidade, fase 6; 0137). Só
// PREFERÊNCIA (a modalidade continua sendo do treino e da sessão). Vazia = não
// respondeu: nesse caso o app trata como “aberto a tudo”.
// ============================================================================
import { LISTA_MODALIDADES, MODALIDADES_TREINO, type ModalidadeTreino } from "./tipos";

export function normalizarInteresse(lista: readonly string[] | null | undefined): ModalidadeTreino[] {
  const ok = new Set(lista ?? []);
  return LISTA_MODALIDADES.filter((m) => ok.has(m));
}

/** Avisar do WOD do dia? Sim para quem não respondeu ou marcou algo além da musculação. */
export const querAvisoDoWod = (lista: readonly string[] | null | undefined) => {
  const v = normalizarInteresse(lista);
  return !v.length || v.some((m) => m !== "musculacao");
};

/** “Cross Training, HYROX” (para o personal ler rápido). */
export const textoInteresse = (lista: readonly string[] | null | undefined) => normalizarInteresse(lista).map((m) => `${MODALIDADES_TREINO[m].emoji} ${MODALIDADES_TREINO[m].nome}`).join(" · ");
