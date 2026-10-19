// ============================================================================
// Faixas de REFERÊNCIA heurísticas de séries válidas por grupo e semana.
//
// NÃO são limites clínicos nem "ideal/sobrecarga" universal. São pontos de
// partida que o treinador pode aplicar como meta e depois ajustar por aluno,
// objetivo, nível, momento do ciclo, recuperação e prioridade.
// Origem: síntese de Schoenfeld et al. (2017), Israetel et al. (RP) e revisão
// de Nuckols. Ver src/lib/periodizacao.ts para as referências completas.
// ============================================================================

import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { MetaVolume } from "./calcular";

export type NivelReferencia = "iniciante" | "intermediario" | "avancado";

const BASE: Partial<Record<GrupoMuscular, MetaVolume>> = {
  peito: { min: 10, max: 16 },
  costas: { min: 12, max: 18 },
  ombros: { min: 8, max: 16 },
  trapezio: { min: 4, max: 10 },
  biceps: { min: 8, max: 12 },
  triceps: { min: 6, max: 12 },
  antebraco: { min: 2, max: 8 },
  quadriceps: { min: 10, max: 14 },
  posteriores: { min: 8, max: 12 },
  gluteo: { min: 10, max: 16 },
  adutores: { min: 2, max: 6 },
  abdutores: { min: 2, max: 6 },
  panturrilha: { min: 6, max: 12 },
  abdomen: { min: 4, max: 10 },
  core: { min: 4, max: 10 },
  lombar: { min: 2, max: 6 },
};

/** Ajuste simples por nível: iniciante ≈ −30%, avançado ≈ +20%. Heurística. */
export function referenciasPorNivel(nivel: NivelReferencia = "intermediario"): Partial<Record<GrupoMuscular, MetaVolume>> {
  const fator = nivel === "iniciante" ? 0.7 : nivel === "avancado" ? 1.2 : 1;
  const out: Partial<Record<GrupoMuscular, MetaVolume>> = {};
  for (const [g, m] of Object.entries(BASE) as Array<[GrupoMuscular, MetaVolume]>) {
    out[g] = { min: Math.max(0, Math.round(m.min * fator)), max: Math.max(1, Math.round(m.max * fator)) };
  }
  return out;
}

/** Aplica prioridade: grupos prioritários ganham +20% na faixa (ajustável depois). */
export function aplicarPrioridades(
  metas: Partial<Record<GrupoMuscular, MetaVolume>>,
  prioridades: GrupoMuscular[]
): Partial<Record<GrupoMuscular, MetaVolume>> {
  const out = { ...metas };
  for (const g of prioridades) {
    const m = out[g];
    if (m) out[g] = { min: Math.round(m.min * 1.2), max: Math.round(m.max * 1.2) };
  }
  return out;
}

export const AVISO_REFERENCIA =
  "Faixas de referência heurísticas (não universais). Ajuste por aluno, objetivo, nível e recuperação.";
