// ============================================================================
// Opções de treino extra para o personal aprovar (PURO, testado).
// Junta até 3 propostas — “abaixo da meta” (volume dos últimos 7 dias),
// “músculos prioridade”, “full body leve” e “músculos pequenos” — sem repetir
// a mesma lista. O personal edita (troca, tira, põe exercício) e aprova; o
// aprovado vira um extra liberado com os exercícios (0073).
// ============================================================================

import type { ItemExtraAprovado } from "@/lib/treino/extra";

export type OpcaoExtra = {
  chave: string;
  titulo: string;
  /** Por que o app propôs (uma linha). */
  motivo: string;
  itens: ItemExtraAprovado[];
};

export const LIMITES_OPCOES = { maxOpcoes: 3, maxExercicios: 8, maxSeries: 5, minutosPorSerie: 2.5, minutosPreparo: 5 };

/** Duração estimada (múltiplo de 5, mínimo 10 min). */
export function duracaoEstimada(itens: ItemExtraAprovado[]): number {
  const series = itens.reduce((n, i) => n + i.series, 0);
  return Math.max(10, Math.ceil((series * LIMITES_OPCOES.minutosPorSerie + LIMITES_OPCOES.minutosPreparo) / 5) * 5);
}

export const seriesTotais = (itens: ItemExtraAprovado[]) => itens.reduce((n, i) => n + i.series, 0);

/** Texto curto para o aluno (aparece no cartão do extra). */
export function descricaoDosItens(itens: ItemExtraAprovado[]): string {
  return itens.map((i) => `${i.nome}: ${i.series} × ${i.reps}.`).join(" ").slice(0, 600);
}

const assinatura = (o: OpcaoExtra) => o.itens.map((i) => (i.biblioteca_id ?? i.nome).toLowerCase()).sort().join("|");

/** Até 3 opções, na ordem recebida, sem listas vazias nem repetidas. */
export function juntarOpcoes(candidatas: Array<OpcaoExtra | null>): OpcaoExtra[] {
  const vistas = new Set<string>();
  const out: OpcaoExtra[] = [];
  for (const o of candidatas) {
    if (!o || !o.itens.length) continue;
    const a = assinatura(o);
    if (vistas.has(a)) continue;
    vistas.add(a);
    out.push({ ...o, itens: o.itens.slice(0, LIMITES_OPCOES.maxExercicios).map((i) => ({ ...i, series: Math.min(LIMITES_OPCOES.maxSeries, Math.max(1, i.series)) })) });
    if (out.length >= LIMITES_OPCOES.maxOpcoes) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Faixas de repetições sugeridas (toque rápido no editor): primeiro as que o
// personal mais usa nas fichas, depois o padrão do Montinho.
// ---------------------------------------------------------------------------
export const FAIXAS_PADRAO = ["20/15/12/10", "20", "15", "12", "10", "10-12", "12-15", "8-10", "8-12", "15-20"] as const;
const FAIXA_VALIDA = /^(\d{1,2}(-\d{1,2})?)(\/\d{1,2}(-\d{1,2})?)*$/;

export function faixasSugeridas(historico: string[], max = 12): string[] {
  const conta = new Map<string, number>();
  for (const r of historico) {
    const f = (r ?? "").replace(/\s+/g, "").replace(/–/g, "-");
    if (f.length > 20 || !FAIXA_VALIDA.test(f)) continue;
    conta.set(f, (conta.get(f) ?? 0) + 1);
  }
  const usadas = [...conta.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([f]) => f);
  return [...new Set([...usadas.slice(0, 6), ...FAIXAS_PADRAO])].slice(0, max);
}
