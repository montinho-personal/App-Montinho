// Configuração de séries: "iguais" (replica) ou "detalhado" (pirâmide, série a série).
export type SerieConfig =
  | {
      modo: "iguais";
      series: number;
      reps: string;
      ie: number | null;
      descanso_seg: number | null;
    }
  | {
      modo: "detalhado";
      series: Array<{
        ordem: number;
        reps: string;
        ie: number | null;
        descanso_seg: number | null;
      }>;
    };

/** Descanso null = usar o padrão do treino/treinador (90 s por padrão do app). */
export function configIgual(series = 3, reps = "10-12", ie: number | null = 8): SerieConfig {
  return { modo: "iguais", series, reps, ie, descanso_seg: null };
}

export function totalSeries(config: SerieConfig | null | undefined, fallback = 0): number {
  if (!config) return fallback;
  if (config.modo === "iguais") return config.series;
  return config.series.length;
}

export function repsResumo(config: SerieConfig | null | undefined, fallback = ""): string {
  if (!config) return fallback;
  if (config.modo === "iguais") return config.reps;
  return config.series.map((s) => s.reps).join("/");
}

export function detalhar(config: SerieConfig): Extract<SerieConfig, { modo: "detalhado" }> {
  if (config.modo === "detalhado") return config;
  return {
    modo: "detalhado",
    series: Array.from({ length: Math.max(config.series, 1) }, (_, i) => ({
      ordem: i + 1,
      reps: config.reps,
      ie: config.ie,
      descanso_seg: config.descanso_seg,
    })),
  };
}

/**
 * Muda o número de séries sem perder o que já foi prescrito: em “iguais” só
 * troca a quantidade; em “detalhado” (pirâmide) corta do fim ou repete a
 * última série para as novas.
 */
export function ajustarNumeroSeries(config: SerieConfig, n: number): SerieConfig {
  const alvo = Math.max(0, Math.min(30, Math.round(n) || 0));
  if (config.modo === "iguais") return { ...config, series: alvo };
  const base = config.series.at(-1) ?? { ordem: 1, reps: "10", ie: null, descanso_seg: null };
  const series = config.series.slice(0, alvo);
  while (series.length < alvo) series.push({ ...base });
  return { modo: "detalhado", series: series.map((s, i) => ({ ...s, ordem: i + 1 })) };
}
