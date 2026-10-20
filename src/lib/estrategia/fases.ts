// Fase atual da estratégia a partir da data de início (semanas corridas).
import type { Fase } from "./ler";

export type FaseAtual = { fase: Fase; semana: number; semanasFase: number | null; proxima: Fase | null; fimFase: string | null; encerrada: boolean };

const somarDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function faseAtual(fases: Fase[], inicio: string | null, hoje: string): FaseAtual | null {
  if (!fases.length || !inicio || hoje < inicio) return null;
  const dias = Math.floor((Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${inicio}T12:00:00Z`)) / 86_400_000);
  let acumulado = 0;
  for (let i = 0; i < fases.length; i++) {
    const f = fases[i];
    if (!f.semanas) return { fase: f, semana: Math.floor((dias - acumulado * 7) / 7) + 1, semanasFase: null, proxima: fases[i + 1] ?? null, fimFase: null, encerrada: false };
    if (dias < (acumulado + f.semanas) * 7) {
      return { fase: f, semana: Math.floor((dias - acumulado * 7) / 7) + 1, semanasFase: f.semanas, proxima: fases[i + 1] ?? null, fimFase: somarDias(inicio, (acumulado + f.semanas) * 7 - 1), encerrada: false };
    }
    acumulado += f.semanas;
  }
  const ultima = fases[fases.length - 1];
  return { fase: ultima, semana: ultima.semanas ?? 1, semanasFase: ultima.semanas, proxima: null, fimFase: somarDias(inicio, acumulado * 7 - 1), encerrada: true };
}

/** As fases contam a partir do relatório (ou do início do aluno, se for depois). */
export function inicioDasFases(inicioAluno: string | null | undefined, dataRelatorio: string | null | undefined): string | null {
  const xs = [inicioAluno, dataRelatorio].filter((x): x is string => !!x).sort();
  return xs.at(-1) ?? null;
}
