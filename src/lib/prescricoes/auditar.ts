// Auditoria de uma prescrição antes/depois do cadastro: totais, posições
// (bi-set conta como 1 posição), séries individuais, descansos, RIR e bi-sets.
import type { SalvarPlanoInput } from "@/lib/data/programas";
import type { SerieConfig } from "@/lib/series";
import { estimarPrescricao } from "@/lib/tempo/prescricao";

export type SerieAuditada = { reps: string; descanso: number | null };
export type ExercicioAuditado = { posicao: number; nome: string; tecnica: string; bloco: string | null; rir: number | null; series: SerieAuditada[] };
export type TreinoAuditado = { letra: string; nome: string; exercicios: number; series: number; posicoes: number; estimadoMin: number; itens: ExercicioAuditado[]; bisets: Array<{ bloco: string; exercicios: string[]; rodadas: number; descansoEntre: number | null; descansoRodada: number | null }> };

export function seriesDe(cfg: SerieConfig | null | undefined, reps: string, n: number, descanso: number | null): SerieAuditada[] {
  if (cfg?.modo === "detalhado") return cfg.series.map((s) => ({ reps: s.reps, descanso: s.descanso_seg }));
  if (cfg?.modo === "iguais") return Array.from({ length: cfg.series }, () => ({ reps: cfg.reps, descanso: cfg.descanso_seg }));
  return Array.from({ length: n }, () => ({ reps, descanso }));
}

export function auditarPrescricao(p: Pick<SalvarPlanoInput, "treinos">): TreinoAuditado[] {
  return p.treinos.filter((t) => t.ativo).map((t) => {
    let posicao = 0;
    let blocoAnterior: string | null = null;
    const itens: ExercicioAuditado[] = t.exercicios.map((e) => {
      const bloco = e.tecnica === "biset" || e.tecnica === "superset" ? (e.bloco ?? null) : null;
      if (!bloco || bloco !== blocoAnterior) posicao++;
      blocoAnterior = bloco;
      return { posicao, nome: e.nome, tecnica: e.tecnica, bloco, rir: e.rir ?? null, series: seriesDe(e.series_config as SerieConfig | null, e.reps, e.series, e.descanso_seg) };
    });
    const blocos = [...new Set(itens.map((i) => i.bloco).filter((b): b is string => !!b))];
    return {
      letra: t.letra,
      nome: t.nome,
      exercicios: itens.length,
      series: itens.reduce((n, i) => n + i.series.length, 0),
      posicoes: posicao,
      estimadoMin: Math.round(estimarPrescricao(t.exercicios.map((e, i) => ({ ...e, id: `${t.letra}${i}` })) as never, t.tempos as never).totalSeg / 60),
      itens,
      bisets: blocos.map((b) => {
        const g = itens.filter((i) => i.bloco === b);
        return { bloco: b, exercicios: g.map((i) => i.nome), rodadas: Math.max(...g.map((i) => i.series.length)), descansoEntre: g[0].series[0]?.descanso ?? null, descansoRodada: g.at(-1)!.series[0]?.descanso ?? null };
      }),
    };
  });
}
