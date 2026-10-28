// ============================================================================
// Volume total (pedido do Montinho, 28/10/2026): séries válidas acumuladas.
// Série válida = série registrada que não é de aquecimento (é o que a sessão
// guarda em series_concluidas). Conta todo treino feito no app, inclusive o
// extra e o que terminou antes do fim; não conta treino importado nem o que
// o personal tirou da aderência. Cada marco vale uma vez.
// ============================================================================
import type { SessaoAderencia } from "@/lib/aderencia/calcular";

export const MARCOS_SERIES = [500, 1000] as const;
export type CodigoSeries = "series_500" | "series_1000";
export const CODIGOS_SERIES: CodigoSeries[] = MARCOS_SERIES.map((n) => `series_${n}` as CodigoSeries);

type SessaoSeries = SessaoAderencia & { conta_aderencia?: boolean | null };
export type TrofeuSeries = { codigo: CodigoSeries; data: string; sessaoId: string; descricao: string; evidencia: Record<string, unknown> };

const fmt = (n: number) => n.toLocaleString("pt-BR");

/** Sessões que entram na conta, em ordem. */
function contam(sessoes: SessaoSeries[]): SessaoSeries[] {
  return sessoes
    .filter((s) => s.status !== "em_andamento" && s.origem !== "importado" && s.origem !== "legado_logbook" && s.conta_aderencia !== false && (s.series_concluidas ?? 0) > 0)
    .sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
}

/** Total de séries válidas já feitas. */
export function totalDeSeries(sessoes: SessaoSeries[]): number {
  return contam(sessoes).reduce((t, s) => t + (s.series_concluidas ?? 0), 0);
}

export function trofeusDeSeries(sessoes: SessaoSeries[]): TrofeuSeries[] {
  const out: TrofeuSeries[] = [];
  let soma = 0;
  for (const s of contam(sessoes)) {
    const antes = soma;
    soma += s.series_concluidas ?? 0;
    for (const n of MARCOS_SERIES) {
      if (antes < n && soma >= n) out.push({ codigo: `series_${n}` as CodigoSeries, data: s.iniciado_em, sessaoId: s.id, descricao: `${fmt(n)} séries válidas feitas no app.`, evidencia: { total: soma } });
    }
  }
  return out;
}
