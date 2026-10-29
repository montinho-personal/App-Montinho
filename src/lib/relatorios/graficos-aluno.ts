// ============================================================================
// Gráficos fáceis da Evolução do aluno (pedido do Montinho, 29/10/2026):
// antes do relatório completo, ver de cara (1) o total de cada treino — todos
// os exercícios, séries e repetições somados — e (2) a evolução de cada
// exercício. Puro (sem rede).
// ============================================================================
import type { SessaoCompleta } from "@/lib/data/sessoes";
import { normalizarNome } from "@/lib/grupos";

const doDia = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3_600_000).toISOString().slice(0, 10);

export type BarraTreino = { id: string; data: string; rotulo: string; nome: string; series: number; reps: number; volumeKg: number };

/** Cada treino concluído, em ordem de data: séries, repetições e volume (carga × reps), sem aquecimento. */
export function totaisPorTreino(sessoes: SessaoCompleta[]): BarraTreino[] {
  const out: BarraTreino[] = [];
  for (const s of sessoes) {
    if (s.status !== "concluida") continue;
    let series = 0;
    let reps = 0;
    let vol = 0;
    for (const e of s.exercicios)
      for (const x of e.series) {
        if (x.tipo === "aquecimento") continue;
        series++;
        reps += x.reps ?? 0;
        vol += (x.carga_kg ?? 0) * (x.reps ?? 0);
      }
    if (!series) continue;
    const modo = (s as { modo?: string }).modo;
    const rotulo = s.letra && modo !== "extra" ? s.letra : modo === "extra" ? "Extra" : "Livre";
    out.push({ id: s.id, data: doDia(s.iniciado_em), rotulo, nome: s.nome_treino ?? (rotulo.length === 1 ? `Treino ${rotulo}` : `Treino ${rotulo.toLowerCase()}`), series, reps, volumeKg: Math.round(vol) });
  }
  return out.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}

/** Variação do primeiro para o último (em %), ou null. */
export function variacao(primeiro: number, ultimo: number): number | null {
  if (!primeiro) return null;
  return Math.round(((ultimo - primeiro) / primeiro) * 100);
}

/** Exercícios com carga anotada, do mais feito para o menos feito. */
export function exerciciosComCarga(sessoes: SessaoCompleta[]): Array<{ chave: string; nome: string; vezes: number }> {
  const m = new Map<string, { nome: string; dias: Set<string> }>();
  for (const s of sessoes) {
    if (s.status !== "concluida") continue;
    for (const e of s.exercicios) {
      if (!e.series.some((x) => x.tipo !== "aquecimento" && (x.carga_kg ?? 0) > 0)) continue;
      const k = normalizarNome(e.nome);
      const v = m.get(k) ?? { nome: e.nome, dias: new Set<string>() };
      v.dias.add(doDia(s.iniciado_em));
      m.set(k, v);
    }
  }
  return [...m.entries()].map(([chave, v]) => ({ chave, nome: v.nome, vezes: v.dias.size })).sort((a, b) => b.vezes - a.vezes || a.nome.localeCompare(b.nome));
}

// ---------------------------------------------------------------------------
// Repetições com a mesma carga (pedido do Montinho, 29/10/2026): a forma mais
// comum de evoluir é fazer mais repetições com o mesmo peso.
// ---------------------------------------------------------------------------
type ComReps = { data: string; repsPorCarga?: Record<string, number> | null };

/** Cargas usadas em 2 dias ou mais (as que dá para comparar): mais dias primeiro; empate, a maior carga. */
export function cargasRepetidas(pontos: ComReps[]): number[] {
  const dias = new Map<number, number>();
  for (const p of pontos) for (const k of Object.keys(p.repsPorCarga ?? {})) dias.set(Number(k), (dias.get(Number(k)) ?? 0) + 1);
  return [...dias.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || b[0] - a[0]).map(([c]) => c);
}

/** Dias em que a carga apareceu, com o maior nº de repetições feito nela. */
export function repsNaCarga(pontos: ComReps[], carga: number): Array<{ data: string; reps: number }> {
  return pontos.flatMap((p) => {
    const r = p.repsPorCarga?.[String(carga)];
    return r ? [{ data: p.data, reps: r }] : [];
  });
}

/**
 * Dias de recorde no gráfico (🏆): o valor passou de TODOS os dias anteriores,
 * com pelo menos REGRAS_CONQUISTAS.registrosParaRecorde dias antes (mesma regra
 * do troféu de recorde). Devolve os índices dos pontos.
 */
export function indicesDeRecorde(valores: number[], minAntes = 2): number[] {
  const out: number[] = [];
  let max = -Infinity;
  valores.forEach((v, i) => {
    if (i >= minAntes && v > max) out.push(i);
    max = Math.max(max, v);
  });
  return out;
}
