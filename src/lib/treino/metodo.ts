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

/**
 * Aplica o método a vários exercícios selecionados de uma vez.
 *  • Método de bloco: junta os selecionados em sequência (a partir do primeiro,
 *    mantendo a ordem entre eles) e liga todos no mesmo bloco novo.
 *  • Outros métodos: aplica a cada selecionado (pirâmide vira série a série etc.).
 */
export function aplicarMetodoEmVarios<R extends LinhaMetodo & { key: string }>(rows: R[], keys: string[], metodo: Tecnica, letra: string): R[] {
  const sel = new Set(keys);
  if (!rows.some((r) => sel.has(r.key))) return rows;
  if (!ehTecnicaBloco(metodo)) {
    let out = rows;
    for (const k of keys) {
      const i = out.findIndex((r) => r.key === k);
      if (i >= 0) out = aplicarMetodo(out, i, metodo, letra);
    }
    return out;
  }
  const primeiro = rows.findIndex((r) => sel.has(r.key));
  const escolhidos = rows.filter((r) => sel.has(r.key));
  const resto = rows.filter((r) => !sel.has(r.key));
  const codigo = proximoBloco(rows, letra);
  const ligados = escolhidos.map((r) => ({ ...r, tecnica: metodo, bloco: codigo }));
  const antes = resto.slice(0, rows.slice(0, primeiro).filter((r) => !sel.has(r.key)).length);
  const depois = resto.slice(antes.length);
  const out = [...antes, ...ligados, ...depois];
  // Quem estava num bloco que perdeu integrantes volta a ser tradicional se ficou sozinho.
  const contagem = new Map<string, number>();
  for (const r of out) if (ehTecnicaBloco(r.tecnica) && r.bloco.trim()) contagem.set(r.bloco.trim(), (contagem.get(r.bloco.trim()) ?? 0) + 1);
  return out.map((r) => (ehTecnicaBloco(r.tecnica) && r.bloco.trim() && contagem.get(r.bloco.trim()) === 1 ? { ...r, tecnica: "normal" as Tecnica, bloco: "" } : r));
}
