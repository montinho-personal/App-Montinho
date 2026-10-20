// “Usar o descanso padrão”: limpa os descansos individuais de um treino para
// valer o padrão (do treinador ou do app: 1min30 entre séries, 2 min após o
// exercício). Em bi-set/superset, a ausência de descanso entre os exercícios
// do bloco é a própria técnica: os exercícios antes do último do bloco
// continuam com descanso 0; o último recebe o padrão (descanso da rodada).
import type { SerieConfig } from "@/lib/series";

type RowDescanso = { seriesConfig: SerieConfig; descansoApos: string; bloco: string };

function limparSeries(c: SerieConfig): SerieConfig {
  return c.modo === "iguais" ? { ...c, descanso_seg: null } : { ...c, series: c.series.map((s) => ({ ...s, descanso_seg: null })) };
}

export function aplicarDescansoPadrao<R extends RowDescanso>(rows: R[]): R[] {
  return rows.map((r, i) => {
    const bloco = r.bloco.trim();
    const proximoMesmoBloco = bloco && rows[i + 1]?.bloco.trim() === bloco;
    if (proximoMesmoBloco) return r; // dentro do bi-set: mantém (técnica)
    return { ...r, seriesConfig: limparSeries(r.seriesConfig), descansoApos: "" };
  });
}
