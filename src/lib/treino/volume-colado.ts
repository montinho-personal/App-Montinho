// ============================================================================
// “Colar do site” (pedido do Montinho, 28/10/2026): a calculadora de volume do
// site copia um texto e o app lê as faixas de séries por semana de cada
// músculo. Leitor PURO e tolerante: uma linha por músculo, com o nome (com ou
// sem acento) e “min-max”, “min a max” ou um número só. O resto é ignorado.
// Formato que o site copia (exemplo):
//   Montinho · séries por semana
//   Peito: 10-14
//   Costas: 12-16
// ============================================================================
import { normalizarNome } from "@/lib/grupos";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { MetaVolume } from "@/lib/volume/calcular";

/** Página do site que ensina a calcular o volume (o Montinho manda o endereço; vazio = link escondido). */
export const LINK_CALCULADORA_VOLUME: string | null = null;

const NOMES: Array<[GrupoMuscular, string[]]> = [
  ["ombro_anterior", ["ombro anterior", "deltoide anterior", "deltoides anterior"]],
  ["ombro_lateral", ["ombro lateral", "deltoide lateral", "deltoides lateral", "deltoide medio"]],
  ["ombro_posterior", ["ombro posterior", "deltoide posterior", "deltoides posterior"]],
  ["peito", ["peito", "peitoral", "peitorais"]],
  ["costas", ["costas", "dorsal", "dorsais", "latissimo"]],
  ["ombros", ["ombros", "ombro", "deltoides", "deltoide"]],
  ["trapezio", ["trapezio", "trapezios"]],
  ["biceps", ["biceps"]],
  ["triceps", ["triceps"]],
  ["antebraco", ["antebraco", "antebracos"]],
  ["quadriceps", ["quadriceps", "quadricipes", "coxa anterior"]],
  ["posteriores", ["posteriores de coxa", "posterior de coxa", "posteriores", "posterior", "isquiotibiais", "isquios"]],
  ["gluteo", ["gluteos", "gluteo"]],
  ["adutores", ["adutores", "adutor"]],
  ["abdutores", ["abdutores", "abdutor"]],
  ["panturrilha", ["panturrilhas", "panturrilha"]],
  ["abdomen", ["abdomen", "abdominal", "abdominais", "abdome"]],
  ["core", ["core"]],
  ["lombar", ["lombar", "lombares"]],
];

export type VolumeColado = { metas: Partial<Record<GrupoMuscular, MetaVolume>>; naoEntendi: string[] };

function grupoDaLinha(linha: string): GrupoMuscular | null {
  const t = ` ${normalizarNome(linha).replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ")} `;
  for (const [g, nomes] of NOMES) if (nomes.some((n) => t.includes(` ${n} `))) return g;
  return null;
}

export function lerVolumeColado(texto: string): VolumeColado {
  const metas: VolumeColado["metas"] = {};
  const naoEntendi: string[] = [];
  for (const bruta of texto.split(/\r?\n|;/)) {
    const linha = bruta.trim();
    if (!linha) continue;
    const nums = [...linha.matchAll(/\d{1,2}/g)].map((m) => Number(m[0]));
    const g = grupoDaLinha(linha);
    if (!g || !nums.length) {
      if (g || nums.length) naoEntendi.push(linha);
      continue;
    }
    const [a, b = a] = nums;
    const min = Math.min(a, b), max = Math.max(a, b);
    if (max <= 0 || max > 60) { naoEntendi.push(linha); continue; }
    metas[g] = { min, max };
  }
  return { metas, naoEntendi };
}
