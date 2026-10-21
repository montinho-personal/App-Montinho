// ============================================================================
// Bi-set / tri-set no treino do aluno (PURO, testado).
//  • Agrupa exercícios seguidos com o mesmo bloco e técnica de bloco.
//  • Numeração: exercícios soltos 1, 2…; no bloco, mesmo número com letra
//    (3A, 3B) — deixa claro que é uma coisa só.
//  • Ao concluir uma série no bloco: vai para o próximo exercício da rodada
//    sem descanso; no último, descansa e volta ao primeiro (nova rodada).
// ============================================================================

import { ehTecnicaBloco } from "@/lib/volume/tecnicas";
import type { Tecnica } from "@/lib/volume/calcular";

export type ItemTreino = { id: string; bloco: string | null | undefined; tecnica: Tecnica | string | null | undefined };
export type GrupoTreino = { ids: string[]; tecnica: Tecnica | null };

export function gruposDoTreino(itens: ItemTreino[]): GrupoTreino[] {
  const out: GrupoTreino[] = [];
  for (const it of itens) {
    const cod = (it.bloco ?? "").trim();
    const emBloco = !!cod && ehTecnicaBloco((it.tecnica ?? "normal") as Tecnica);
    const anterior = out[out.length - 1];
    const antItem = anterior ? itens.find((x) => x.id === anterior.ids[anterior.ids.length - 1]) : null;
    if (emBloco && anterior && anterior.tecnica && (antItem?.bloco ?? "").trim() === cod) anterior.ids.push(it.id);
    else out.push({ ids: [it.id], tecnica: emBloco ? ((it.tecnica ?? null) as Tecnica | null) : null });
  }
  // Bloco com um exercício só não é bi-set.
  return out.map((g) => (g.ids.length < 2 ? { ...g, tecnica: null } : g));
}

const LETRAS = "ABCDEFGH";

export function rotulosDosExercicios(grupos: GrupoTreino[]): Record<string, string> {
  const r: Record<string, string> = {};
  grupos.forEach((g, n) => {
    if (g.ids.length < 2) r[g.ids[0]] = String(n + 1);
    else g.ids.forEach((id, k) => (r[id] = `${n + 1}${LETRAS[k] ?? k + 1}`));
  });
  return r;
}

type Contagem = Record<string, { feitas: number; planejadas: number }>;
const resta = (c: Contagem, id: string) => (c[id]?.feitas ?? 0) < (c[id]?.planejadas ?? 0);

/** Depois de concluir uma série de `atual` (contagem já inclui essa série). */
export function proximoNoBloco(grupo: GrupoTreino, atual: string, c: Contagem): { proximo: string | null; fimDaRodada: boolean } {
  const i = grupo.ids.indexOf(atual);
  if (grupo.ids.length < 2 || i < 0) return { proximo: null, fimDaRodada: true };
  // Quem ainda não fez esta rodada (primeiro os que vêm depois, depois os de antes).
  const ordem = [...grupo.ids.slice(i + 1), ...grupo.ids.slice(0, i)];
  const depois = ordem.find((id) => resta(c, id) && (c[id]?.feitas ?? 0) < (c[atual]?.feitas ?? 0));
  if (depois) return { proximo: depois, fimDaRodada: false };
  return { proximo: grupo.ids.find((id) => resta(c, id)) ?? null, fimDaRodada: true };
}

/** Rodada atual (1-based) e total de rodadas do bloco. */
export function rodadaDoBloco(grupo: GrupoTreino, c: Contagem): { atual: number; total: number; concluido: boolean } {
  const total = Math.max(0, ...grupo.ids.map((id) => c[id]?.planejadas ?? 0));
  const feitasMin = Math.min(...grupo.ids.map((id) => Math.min(c[id]?.feitas ?? 0, c[id]?.planejadas ?? 0)));
  const concluido = grupo.ids.every((id) => !resta(c, id));
  return { atual: Math.min(total, feitasMin + 1), total, concluido };
}
