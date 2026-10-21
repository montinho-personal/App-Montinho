// ============================================================================
// Escolher o método de um exercício no montador (PURO, testado).
//  • Métodos de bloco (bi-set, tri-set, super-set, combinado, pré-exaustão):
//    ligam este exercício aos seguintes (2 ou 3) com o mesmo código de bloco.
//  • Pirâmide crescente/decrescente: se as séries estão “iguais”, passa para
//    série a série com repetições sugeridas (o personal ajusta depois).
//  • Sair de um método de bloco desfaz o bloco deste exercício.
// ============================================================================

import type { Tecnica } from "@/lib/volume/calcular";
import { ehTecnicaBloco, TAMANHO_BLOCO } from "@/lib/volume/tecnicas";
import type { SerieConfig } from "@/lib/series";

type LinhaMetodo = { tecnica: Tecnica; bloco: string; seriesConfig: SerieConfig };

const REPS_CRESCENTE = ["20", "15", "12", "10", "8", "6", "6", "6"];

function repsPiramide(n: number, decrescente: boolean): string[] {
  const base = REPS_CRESCENTE.slice(0, Math.max(1, n));
  return decrescente ? [...base].reverse() : base;
}

/** Próximo código livre de bloco no treino (ex.: “A1”, “A2”…). */
export function proximoBloco<R extends Pick<LinhaMetodo, "bloco">>(rows: R[], letra: string): string {
  const usados = new Set(rows.map((r) => r.bloco.trim()).filter(Boolean));
  let i = 1;
  while (usados.has(`${letra}${i}`)) i++;
  return `${letra}${i}`;
}

export function aplicarMetodo<R extends LinhaMetodo>(rows: R[], indice: number, metodo: Tecnica, letra: string): R[] {
  const atual = rows[indice];
  if (!atual) return rows;
  const out = rows.map((r) => ({ ...r }));

  if (ehTecnicaBloco(metodo)) {
    const tamanho = TAMANHO_BLOCO[metodo] ?? 2;
    // Reaproveita o bloco se este exercício já está em um; senão cria um novo.
    const codigo = ehTecnicaBloco(atual.tecnica) && atual.bloco.trim() ? atual.bloco.trim() : proximoBloco(rows, letra);
    for (let k = indice; k < Math.min(out.length, indice + tamanho); k++) out[k] = { ...out[k], tecnica: metodo, bloco: codigo };
    return out;
  }

  const saiuDeBloco = ehTecnicaBloco(atual.tecnica);
  let seriesConfig = atual.seriesConfig;
  if ((metodo === "piramide" || metodo === "piramide_decrescente") && seriesConfig.modo === "iguais") {
    const reps = repsPiramide(seriesConfig.series, metodo === "piramide_decrescente");
    seriesConfig = { modo: "detalhado", series: reps.map((r, i) => ({ ordem: i + 1, reps: r, ie: seriesConfig.modo === "iguais" ? seriesConfig.ie : null, descanso_seg: seriesConfig.modo === "iguais" ? seriesConfig.descanso_seg : null })) };
  }
  out[indice] = { ...out[indice], tecnica: metodo, bloco: saiuDeBloco ? "" : out[indice].bloco, seriesConfig };
  return out;
}
