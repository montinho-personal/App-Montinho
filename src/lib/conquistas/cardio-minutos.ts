// ============================================================================
// Minutos de Fôlego (pedido do Montinho, 09/11/2026): troféus que somam os
// MINUTOS de cardio da pessoa, de todo cardio que vale (10+ minutos, feito):
// anotado no app, cronômetro, treino extra de cardio, corrida do HYROX e
// Strava — a mesma lista de `juntarCardios`, sem contar a mesma atividade
// duas vezes. Cada marco vale uma vez e conta no ranking.
//   300 min (5 h) → 1.000 → 3.000 (50 h) → 6.000 (100 h) → 15.000 (250 h)
//   → 30.000 (500 h, lendário).
// ============================================================================
import { LIMITES_CARDIO, type CardioFeito } from "@/lib/cardio/regras";

export const MARCOS_MINUTOS = [300, 1000, 3000, 6000, 15000, 30000] as const;
export type CodigoMinutosCardio = `minutos_cardio_${(typeof MARCOS_MINUTOS)[number]}`;
export const CODIGOS_MINUTOS_CARDIO: CodigoMinutosCardio[] = MARCOS_MINUTOS.map((n) => `minutos_cardio_${n}` as CodigoMinutosCardio);

/** Comparações divertidas (aproximadas, só ilustração; caminhada a 5 km/h). */
export const COMPARACAO_MINUTOS: Record<(typeof MARCOS_MINUTOS)[number], string> = {
  300: "uns 25 km de caminhada: mais que uma meia maratona",
  1000: "uns 80 km de caminhada: quase de São Paulo a Campinas",
  3000: "uns 250 km de caminhada: mais que de São Paulo a Ubatuba",
  6000: "uns 500 km de caminhada: mais que de São Paulo ao Rio de Janeiro",
  15000: "uns 1.250 km de caminhada: mais que de São Paulo a Brasília",
  30000: "uns 2.500 km de caminhada: mais que de São Paulo a Salvador",
};

export type TrofeuMinutosCardio = { codigo: CodigoMinutosCardio; data: string; descricao: string; evidencia: Record<string, unknown> };

const vale = (f: CardioFeito) => f.status !== "nao_realizado" && f.duracaoMin >= LIMITES_CARDIO.minutosMin;
const fmt = (n: number) => n.toLocaleString("pt-BR");
const horas = (min: number) => {
  const h = Math.round((min / 60) * 10) / 10;
  return `${String(h).replace(".", ",")} ${h === 1 ? "hora" : "horas"}`;
};
export const textoHoras = horas;

/** Minutos somados de todo cardio que vale (10+ min). */
export function minutosDeCardio(feitos: CardioFeito[]): number {
  return Math.round(feitos.filter(vale).reduce((t, f) => t + f.duracaoMin, 0));
}

export function trofeusMinutosCardio(feitos: CardioFeito[]): TrofeuMinutosCardio[] {
  const out: TrofeuMinutosCardio[] = [];
  let soma = 0;
  for (const f of [...feitos].filter(vale).sort((a, b) => (a.realizadoEm < b.realizadoEm ? -1 : 1))) {
    const antes = soma;
    soma += f.duracaoMin;
    for (const n of MARCOS_MINUTOS) {
      if (antes < n && soma >= n) out.push({ codigo: `minutos_cardio_${n}`, data: f.realizadoEm, descricao: `${fmt(n)} minutos de cardio somados (${horas(n)}).`, evidencia: { minutos: Math.round(soma), cardio: f.id } });
    }
  }
  return out;
}
