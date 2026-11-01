// ============================================================================
// “Cargas em alta”: exercícios cuja carga máxima registrada subiu desde o
// primeiro registro. Só mostra o que os registros provam (carga do app ou do
// resumo importado); exercício sem subida não entra — nada de inventar ganho.
// ============================================================================

import { normalizarNome } from "@/lib/grupos";
import type { SessaoCompleta } from "@/lib/data/sessoes";
import { evolucaoExercicio, seriesPorExercicio, type ResumoEvolucao } from "./calcular";

export type CargaEmAlta = {
  chave: string;
  nome: string;
  /** Carga máxima por dia, em ordem de data (para a linha). */
  pontos: Array<{ data: string; carga: number }>;
  primeira: number;
  ultima: number;
  ganhoKg: number;
  ganhoPct: number;
  desde: string;
};

export function cargasEmAlta(sessoes: SessaoCompleta[], resumos: ResumoEvolucao[] = [], limite = 3): CargaEmAlta[] {
  const nomes = new Map<string, string>();
  for (const [k, v] of seriesPorExercicio(sessoes)) nomes.set(k, v.nome);
  for (const r of resumos) {
    const k = normalizarNome(r.exercicio_nome);
    if (k && !nomes.has(k)) nomes.set(k, r.exercicio_nome);
  }
  const out: CargaEmAlta[] = [];
  for (const [chave, nome] of nomes) {
    const pontos = evolucaoExercicio(sessoes, chave, resumos)
      .filter((p) => p.cargaMax != null && p.cargaMax > 0)
      .map((p) => ({ data: p.data, carga: p.cargaMax as number }));
    if (pontos.length < 2) continue;
    const primeira = pontos[0].carga;
    const ultima = pontos.at(-1)!.carga;
    const ganhoKg = Math.round((ultima - primeira) * 10) / 10;
    if (ganhoKg <= 0) continue;
    out.push({ chave, nome, pontos, primeira, ultima, ganhoKg, ganhoPct: Math.round((ganhoKg / primeira) * 100), desde: pontos[0].data });
  }
  return out.sort((a, b) => b.ganhoPct - a.ganhoPct || b.ganhoKg - a.ganhoKg).slice(0, limite);
}

// ---------------------------------------------------------------------------
// “Bora recuperar” (pedido do Montinho, 01/11/2026: “os exercícios em que a
// pessoa regrediu, no fim dos destaques, para ela se motivar a fazer melhor”).
// Exercício cujo ÚLTIMO treino com carga ficou abaixo do MELHOR anterior, e que
// foi feito nos últimos `diasRecentes` (exercício que saiu da ficha não volta).
// Só o que os registros mostram; sem julgamento — é um convite.
// ---------------------------------------------------------------------------
export type CargaParaRecuperar = { chave: string; nome: string; melhor: number; melhorEm: string; ultima: number; ultimaEm: string; quedaKg: number };

export function cargasParaRecuperar(sessoes: SessaoCompleta[], limite = 3, diasRecentes = 30, hoje: Date = new Date()): CargaParaRecuperar[] {
  const corte = new Date(hoje.getTime() - diasRecentes * 86_400_000).toISOString().slice(0, 10);
  const out: CargaParaRecuperar[] = [];
  for (const [chave, v] of seriesPorExercicio(sessoes)) {
    const pontos = evolucaoExercicio(sessoes, chave)
      .filter((p) => p.cargaMax != null && p.cargaMax > 0)
      .map((p) => ({ data: p.data, carga: p.cargaMax as number }));
    if (pontos.length < 2) continue;
    const ult = pontos.at(-1)!;
    if (ult.data < corte) continue;
    const antes = pontos.slice(0, -1);
    const melhor = antes.reduce((m, p) => (p.carga > m.carga ? p : m), antes[0]);
    const quedaKg = Math.round((melhor.carga - ult.carga) * 10) / 10;
    if (quedaKg <= 0) continue;
    out.push({ chave, nome: v.nome, melhor: melhor.carga, melhorEm: melhor.data, ultima: ult.carga, ultimaEm: ult.data, quedaKg });
  }
  return out.sort((a, b) => b.ultimaEm.localeCompare(a.ultimaEm) || a.quedaKg - b.quedaKg).slice(0, limite);
}
