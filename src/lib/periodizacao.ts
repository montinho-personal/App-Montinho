// ============================================================================
// Biblioteca de periodização baseada em ciência.
//
// REFERÊNCIAS CIENTÍFICAS:
//
// [1] Schoenfeld, B. J., Ogborn, D., & Krieger, J. W. (2017).
//     "Dose-response relationship between weekly resistance training volume
//     and increases in muscle mass: A systematic review and meta-analysis."
//     Journal of Sports Sciences, 35(11), 1073-1082.
//     → 10+ séries diretas por grupo/semana = hipertrofia ótima.
//
// [2] Helms, E., Morgan, A., & Valdez, A. (2019).
//     "The Muscle and Strength Pyramid: Training" (2nd ed.).
//     → Hierarquia: aderência > volume > intensidade > frequência > exercício.
//
// [3] Israetel, M., Hoffmann, J., & Smith, C. W. (2015).
//     "Scientific Principles of Strength Training" (Renaissance Periodization).
//     → MEV (Minimum Effective Volume), MAV (Maximum Adaptive Volume),
//       MRV (Maximum Recoverable Volume) por grupo muscular.
//
// [4] Brzycki, M. (1993). "Strength testing—predicting a one-rep max from
//     reps-to-fatigue." JOPERD, 64(1), 88-90.
//     → Fórmula Brzycki para 1RM estimado.
//
// [5] Epley, B. (1985). "Poundage Chart." Lincoln, NE: Body Enterprises.
//     → Fórmula Epley para 1RM estimado.
//
// [6] Lombardi, V. P. (1989). "Beginning Weight Training: The Safe and
//     Effective Way." Wm. C. Brown Publishers.
//
// [7] Tuchscherer, M. (2008). "The Reactive Training Manual."
//     → Escala RPE/RIR (Rate of Perceived Exertion / Reps in Reserve).
//
// [8] Schoenfeld, B. J., Grgic, J., Van Every, D. W., & Plotkin, D. L. (2021).
//     "Loading recommendations for muscle strength, hypertrophy, and local
//     endurance: a re-examination of the repetition continuum."
//     Sports, 9(2), 32.
//     → Hipertrofia ocorre em ampla faixa de reps (5-30) com proximidade
//       da falha (RIR 0-3).
//
// [9] Greg Nuckols. "How Many Sets Should You Do?" Stronger By Science.
//     https://www.strongerbyscience.com/how-many-sets-should-you-do/
// ============================================================================

import type { GrupoMuscular } from "@/lib/supabase/types-extended";

// ============================================================================
// MEV / MAV / MRV — séries diretas por grupo muscular por semana
// Fonte: Israetel et al. (RP Strength) com ajustes Schoenfeld 2017
// ============================================================================
export type VolumeRange = {
  mv: number;   // Maintenance Volume — mínimo para manter
  mev: number;  // Minimum Effective Volume — mínimo para crescer
  mav: number;  // Maximum Adaptive Volume — sweet spot
  mrv: number;  // Maximum Recoverable Volume — teto absoluto
};

// AVISO (Prompt Mestre §4.1.6): estes números são REFERÊNCIAS HEURÍSTICAS, não
// limites clínicos nem classificação automática "ideal/sobrecarga". A Tabela de
// Volume usa metas definidas por aluno (src/lib/volume/referencias.ts) com
// rótulos neutros. Mantido aqui por compatibilidade com telas antigas.
export const VOLUME_POR_GRUPO: Record<GrupoMuscular, VolumeRange> = {
  peito:            { mv: 8,  mev: 10, mav: 16, mrv: 22 },
  costas:           { mv: 8,  mev: 10, mav: 18, mrv: 25 },
  ombros:           { mv: 6,  mev: 8,  mav: 16, mrv: 22 },
  ombro_anterior:   { mv: 0,  mev: 0,  mav: 6,  mrv: 10 },
  ombro_lateral:    { mv: 4,  mev: 6,  mav: 12, mrv: 18 },
  ombro_posterior:  { mv: 4,  mev: 6,  mav: 12, mrv: 18 },
  trapezio:         { mv: 0,  mev: 4,  mav: 10, mrv: 16 },
  biceps:           { mv: 5,  mev: 8,  mav: 14, mrv: 20 },
  triceps:          { mv: 4,  mev: 6,  mav: 12, mrv: 18 },
  antebraco:        { mv: 0,  mev: 2,  mav: 8,  mrv: 12 },
  quadriceps:       { mv: 6,  mev: 8,  mav: 14, mrv: 20 },
  posteriores:      { mv: 4,  mev: 6,  mav: 12, mrv: 16 },
  gluteo:           { mv: 0,  mev: 4,  mav: 12, mrv: 16 },
  adutores:         { mv: 0,  mev: 2,  mav: 6,  mrv: 10 },
  abdutores:        { mv: 0,  mev: 2,  mav: 6,  mrv: 10 },
  panturrilha:      { mv: 6,  mev: 8,  mav: 14, mrv: 20 },
  abdomen:          { mv: 0,  mev: 0,  mav: 12, mrv: 25 },
  core:             { mv: 0,  mev: 0,  mav: 12, mrv: 25 },
  lombar:           { mv: 0,  mev: 0,  mav: 6,  mrv: 10 },
  cardio:           { mv: 0,  mev: 0,  mav: 0,  mrv: 0 },
  full_body:        { mv: 0,  mev: 0,  mav: 0,  mrv: 0 },
  pernas:           { mv: 6,  mev: 8,  mav: 14, mrv: 20 }, // legado
  nao_classificado: { mv: 0,  mev: 0,  mav: 0,  mrv: 0 },
  outro:            { mv: 0,  mev: 0,  mav: 0,  mrv: 0 },
};

export type VolumeStatus = "abaixo_mv" | "manutencao" | "produtivo" | "otimo" | "sobrecarga";

export function classificarVolume(grupo: GrupoMuscular, series: number): VolumeStatus {
  const r = VOLUME_POR_GRUPO[grupo];
  if (series < r.mv) return "abaixo_mv";
  if (series < r.mev) return "manutencao";
  if (series <= r.mav) return "produtivo";
  if (series <= r.mrv) return "otimo";
  return "sobrecarga";
}

export const VOLUME_STATUS_LABEL: Record<VolumeStatus, string> = {
  abaixo_mv: "Abaixo da manutenção",
  manutencao: "Apenas manutenção",
  produtivo: "Zona produtiva",
  otimo: "Volume ótimo",
  sobrecarga: "Sobrecarga (reduzir)",
};

export const VOLUME_STATUS_TONE: Record<VolumeStatus, "red" | "warning" | "gold" | "success"> = {
  abaixo_mv: "red",
  manutencao: "warning",
  produtivo: "gold",
  otimo: "success",
  sobrecarga: "red",
};

// ============================================================================
// 1RM Estimadas — múltiplas fórmulas com média
// ============================================================================
export type RmEstimate = {
  brzycki: number;
  epley: number;
  lombardi: number;
  media: number;
};

/** Fórmula Brzycki: 1RM = peso × (36 / (37 - reps)). Válida para reps ≤ 10. */
export function brzycki1RM(peso: number, reps: number): number {
  if (reps <= 0 || reps >= 37) return 0;
  return peso * (36 / (37 - reps));
}

/** Fórmula Epley: 1RM = peso × (1 + reps / 30). */
export function epley1RM(peso: number, reps: number): number {
  if (reps <= 0) return 0;
  return peso * (1 + reps / 30);
}

/** Fórmula Lombardi: 1RM = peso × reps^0.10. */
export function lombardi1RM(peso: number, reps: number): number {
  if (reps <= 0) return 0;
  return peso * Math.pow(reps, 0.1);
}

export function estimar1RM(peso: number, reps: number): RmEstimate {
  const brz = brzycki1RM(peso, reps);
  const ep = epley1RM(peso, reps);
  const lb = lombardi1RM(peso, reps);
  return {
    brzycki: Math.round(brz * 10) / 10,
    epley: Math.round(ep * 10) / 10,
    lombardi: Math.round(lb * 10) / 10,
    media: Math.round(((brz + ep + lb) / 3) * 10) / 10,
  };
}

/**
 * Tabela % do 1RM × reps até a falha (Mayhew, Brzycki, Lander)
 * Útil pra prescrever carga a partir do 1RM.
 */
export const PERCENTUAL_POR_REPS: Record<number, number> = {
  1: 100, 2: 95, 3: 93, 4: 90, 5: 87, 6: 85, 7: 83,
  8: 80, 9: 77, 10: 75, 11: 73, 12: 70, 15: 65, 20: 60,
};

export function pesoSugerido(rm1: number, reps: number): number {
  const pct = PERCENTUAL_POR_REPS[reps] ?? 100 - reps * 2.5;
  return Math.round(rm1 * (pct / 100) * 2) / 2;
}

// ============================================================================
// RPE / RIR — Reps in Reserve / Rate of Perceived Exertion
// Fonte: Tuchscherer (2008) RTS Scale, validada por Helms et al. (2016)
// ============================================================================

/** Conversão RIR (reps in reserve) → RPE. */
export function rirToRpe(rir: number): number {
  return Math.max(1, 10 - rir);
}

/** Conversão RPE → RIR. */
export function rpeToRir(rpe: number): number {
  return Math.max(0, 10 - rpe);
}

/**
 * Tabela RPE × reps → % do 1RM (Tuchscherer / RTS).
 * Linha = RPE, Coluna = reps planejados.
 */
export const RPE_PCT_TABLE: Record<number, Record<number, number>> = {
  10: { 1: 100.0, 2: 95.5, 3: 92.2, 4: 89.2, 5: 86.3, 6: 83.7, 7: 81.1, 8: 78.6, 9: 76.2, 10: 73.9, 12: 69.4 },
  9.5:{ 1: 97.8,  2: 93.9, 3: 90.7, 4: 87.8, 5: 85.0, 6: 82.4, 7: 79.9, 8: 77.4, 9: 75.1, 10: 72.3, 12: 67.8 },
  9:  { 1: 95.5,  2: 92.2, 3: 89.2, 4: 86.3, 5: 83.7, 6: 81.1, 7: 78.6, 8: 76.2, 9: 73.9, 10: 70.7, 12: 66.2 },
  8.5:{ 1: 93.9,  2: 90.7, 3: 87.8, 4: 85.0, 5: 82.4, 6: 79.9, 7: 77.4, 8: 75.1, 9: 72.3, 10: 69.4, 12: 64.7 },
  8:  { 1: 92.2,  2: 89.2, 3: 86.3, 4: 83.7, 5: 81.1, 6: 78.6, 7: 76.2, 8: 73.9, 9: 70.7, 10: 68.0, 12: 63.1 },
  7.5:{ 1: 90.7,  2: 87.8, 3: 85.0, 4: 82.4, 5: 79.9, 6: 77.4, 7: 75.1, 8: 72.3, 9: 69.4, 10: 66.4, 12: 61.6 },
  7:  { 1: 89.2,  2: 86.3, 3: 83.7, 4: 81.1, 5: 78.6, 6: 76.2, 7: 73.9, 8: 70.7, 9: 68.0, 10: 64.8, 12: 60.0 },
};

export function pctFromRpe(rpe: number, reps: number): number | null {
  const linha = RPE_PCT_TABLE[rpe];
  if (!linha) return null;
  const exato = linha[reps];
  if (exato !== undefined) return exato;
  // Aproxima interpolando linearmente
  const keys = Object.keys(linha).map(Number).sort((a, b) => a - b);
  const menor = keys.filter((k) => k <= reps).pop();
  const maior = keys.find((k) => k >= reps);
  if (menor === undefined || maior === undefined) return null;
  if (menor === maior) return linha[menor];
  const ratio = (reps - menor) / (maior - menor);
  return linha[menor] + (linha[maior] - linha[menor]) * ratio;
}

// ============================================================================
// Volume semanal de um aluno — calcula séries por grupo a partir do logbook
// ============================================================================
export type SerieLog = { exercicio_id: string; data: string };
export type ExercicioInfo = {
  id: string;
  grupo_muscular: GrupoMuscular;
  grupos_secundarios: GrupoMuscular[];
};

/**
 * Conta séries diretas por grupo muscular nos últimos 7 dias.
 * Grupos secundários contam como 0.5 série cada (consenso Schoenfeld).
 */
export function volumeSemanal(
  logbook: SerieLog[],
  exercicios: ExercicioInfo[]
): Partial<Record<GrupoMuscular, number>> {
  const out: Partial<Record<GrupoMuscular, number>> = {};
  const limite = new Date();
  limite.setDate(limite.getDate() - 7);

  for (const log of logbook) {
    if (new Date(log.data) < limite) continue;
    const ex = exercicios.find((e) => e.id === log.exercicio_id);
    if (!ex) continue;
    out[ex.grupo_muscular] = (out[ex.grupo_muscular] ?? 0) + 1;
    for (const sec of ex.grupos_secundarios) {
      out[sec] = (out[sec] ?? 0) + 0.5;
    }
  }
  return out;
}

// ============================================================================
// Frequência ótima por grupo (Schoenfeld 2019 — meta-analysis frequency)
// Treinar cada grupo 2x/semana > 1x/semana para hipertrofia.
// ============================================================================
export const FREQUENCIA_RECOMENDADA: Record<GrupoMuscular, { min: number; ideal: number; max: number }> = {
  peito:            { min: 1, ideal: 2, max: 3 },
  costas:           { min: 1, ideal: 2, max: 3 },
  ombros:           { min: 1, ideal: 2, max: 4 },
  ombro_anterior:   { min: 1, ideal: 2, max: 4 },
  ombro_lateral:    { min: 1, ideal: 2, max: 4 },
  ombro_posterior:  { min: 1, ideal: 2, max: 4 },
  trapezio:         { min: 1, ideal: 2, max: 3 },
  biceps:           { min: 2, ideal: 3, max: 5 },
  triceps:          { min: 2, ideal: 3, max: 5 },
  antebraco:        { min: 1, ideal: 2, max: 4 },
  quadriceps:       { min: 1, ideal: 2, max: 3 },
  posteriores:      { min: 1, ideal: 2, max: 3 },
  gluteo:           { min: 1, ideal: 2, max: 4 },
  adutores:         { min: 1, ideal: 2, max: 3 },
  abdutores:        { min: 1, ideal: 2, max: 3 },
  panturrilha:      { min: 2, ideal: 3, max: 6 },
  abdomen:          { min: 2, ideal: 3, max: 6 },
  core:             { min: 2, ideal: 3, max: 6 },
  lombar:           { min: 1, ideal: 2, max: 3 },
  cardio:           { min: 2, ideal: 3, max: 6 },
  full_body:        { min: 2, ideal: 3, max: 4 },
  pernas:           { min: 1, ideal: 2, max: 3 },
  nao_classificado: { min: 1, ideal: 2, max: 4 },
  outro:            { min: 1, ideal: 2, max: 4 },
};

// ============================================================================
// Progressão sugerida — Double Progression Method
// Fonte: Schoenfeld, "Science and Development of Muscle Hypertrophy" (2020)
// ============================================================================
export type SugestaoProgressao = {
  acao: "aumentar_carga" | "aumentar_reps" | "manter" | "diminuir";
  detalhe: string;
};

export function sugerirProgressao(
  ultimaCarga: number,
  ultimasReps: number,
  ultimoIE: number,
  repsMin: number,
  repsMax: number,
  incrementoKg = 2.5
): SugestaoProgressao {
  if (ultimoIE >= 10) {
    return {
      acao: "diminuir",
      detalhe: `Reduzir ${incrementoKg}kg — falha total na última (RIR 0)`,
    };
  }
  if (ultimasReps >= repsMax && ultimoIE <= 8) {
    return {
      acao: "aumentar_carga",
      detalhe: `Subir para ${ultimaCarga + incrementoKg}kg e voltar ao limite inferior (${repsMin} reps)`,
    };
  }
  if (ultimasReps < repsMin) {
    return {
      acao: "diminuir",
      detalhe: `Carga muito alta — reduzir para ${Math.max(0, ultimaCarga - incrementoKg)}kg`,
    };
  }
  return {
    acao: "aumentar_reps",
    detalhe: `Manter ${ultimaCarga}kg e tentar +1 rep até bater ${repsMax}`,
  };
}

// ============================================================================
// Referências exportadas pra UI
// ============================================================================
export const REFERENCIAS_CIENTIFICAS = [
  {
    titulo: "Dose-response relationship between weekly resistance training volume and muscle mass",
    autores: "Schoenfeld, Ogborn, Krieger",
    ano: 2017,
    revista: "Journal of Sports Sciences",
    aplicacao: "Define que 10+ séries por grupo/semana é o sweet spot para hipertrofia.",
    link: "https://pubmed.ncbi.nlm.nih.gov/27433992/",
  },
  {
    titulo: "Loading recommendations for muscle strength, hypertrophy, and local endurance",
    autores: "Schoenfeld, Grgic, Van Every, Plotkin",
    ano: 2021,
    revista: "Sports",
    aplicacao: "Hipertrofia ocorre em 5-30 reps desde que proximidade da falha seja mantida (RIR 0-3).",
    link: "https://pubmed.ncbi.nlm.nih.gov/33671664/",
  },
  {
    titulo: "Scientific Principles of Strength Training",
    autores: "Israetel, Hoffmann, Smith",
    ano: 2015,
    revista: "Renaissance Periodization",
    aplicacao: "Sistema MEV/MAV/MRV — Minimum/Maximum Effective/Recoverable Volume por grupo.",
    link: "https://renaissanceperiodization.com/",
  },
  {
    titulo: "The Muscle and Strength Pyramid: Training",
    autores: "Helms, Morgan, Valdez",
    ano: 2019,
    revista: "Auto-publicado",
    aplicacao: "Hierarquia: aderência > volume > intensidade > frequência > exercício > deload.",
    link: "https://muscleandstrengthpyramids.com/",
  },
  {
    titulo: "Reactive Training Systems",
    autores: "Tuchscherer",
    ano: 2008,
    revista: "RTS Manual",
    aplicacao: "Escala RPE/RIR para prescrição autoregulada de carga.",
    link: "https://www.reactivetrainingsystems.com/",
  },
  {
    titulo: "Predicting a one-rep max from reps-to-fatigue",
    autores: "Brzycki",
    ano: 1993,
    revista: "JOPERD",
    aplicacao: "Fórmula clássica de estimativa de 1RM a partir de reps.",
    link: "https://www.tandfonline.com/doi/abs/10.1080/07303084.1993.10606684",
  },
  {
    titulo: "How Many Sets Should You Do?",
    autores: "Greg Nuckols",
    ano: 2018,
    revista: "Stronger By Science",
    aplicacao: "Síntese aplicada de volume ótimo para hipertrofia e força.",
    link: "https://www.strongerbyscience.com/how-many-sets-should-you-do/",
  },
  {
    titulo: "Science and Development of Muscle Hypertrophy (2nd ed.)",
    autores: "Schoenfeld",
    ano: 2020,
    revista: "Human Kinetics",
    aplicacao: "Texto-base. Mecanismos da hipertrofia, progressão, periodização.",
    link: "https://us.humankinetics.com/products/science-and-development-of-muscle-hypertrophy-2nd-edition",
  },
];
