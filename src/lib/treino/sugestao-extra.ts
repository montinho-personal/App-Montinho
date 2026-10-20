// ============================================================================
// Sugestão automática de treino extra (PURO, testado).
//
// Ideia: olhar o que o aluno REALMENTE treinou nos últimos 7 dias (séries
// válidas diretas) e comparar com o mínimo da meta semanal que o personal
// definiu. Os grupos mais abaixo da meta — e que não foram treinados nas
// últimas 48 h — viram uma proposta curta de extra com carga.
//
// Regras de segurança:
//   • Só sugere quando há meta definida e falta real (≥ 2 séries).
//   • Respeita 48 h de recuperação do grupo e o limite semanal de séries
//     extras que o personal configurou.
//   • Proposta pequena: até 2 grupos, até 4 séries por grupo, até 8 no total.
//   • NUNCA é liberada sozinha: é sempre uma sugestão para o personal aprovar.
// ============================================================================

import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { MetaVolume } from "@/lib/volume/calcular";
import { GRUPO_LABEL } from "@/lib/grupos";

export const REGRAS_SUGESTAO = { minimoFalta: 2, maxGrupos: 2, maxSeriesPorGrupo: 4, maxSeriesTotal: 8, horasRecuperacao: 48, minutosPorSerie: 2.5, minutosPreparo: 5 };

export type CandidatoExercicio = { nome: string; grupo: GrupoMuscular; doPlano: boolean; temVideo: boolean };

export type SugestaoExtra = {
  grupos: Array<{ grupo: GrupoMuscular; rotulo: string; meta: number; feito: number; falta: number; series: number }>;
  exercicios: Array<{ nome: string; grupo: GrupoMuscular; series: number; reps: string }>;
  seriesTotal: number;
  duracaoMin: number;
  titulo: string;
  descricao: string;
};

export type ResultadoSugestao = { sugestao: SugestaoExtra | null; motivo: string };

export function sugerirExtraPorVolume(e: {
  metas: Partial<Record<GrupoMuscular, MetaVolume>>;
  /** Séries válidas diretas nos últimos 7 dias, por grupo. */
  feito7d: Partial<Record<GrupoMuscular, number>>;
  /** Grupos treinados nas últimas 48 h. */
  recentes48h: GrupoMuscular[];
  /** Séries extras ainda permitidas nesta semana (limite do personal − já feitas). */
  seriesExtrasDisponiveis: number;
  /** Exercícios possíveis (do plano do aluno e da biblioteca). */
  candidatos: CandidatoExercicio[];
  prioridades?: string[];
}): ResultadoSugestao {
  const R = REGRAS_SUGESTAO;
  const comMeta = (Object.entries(e.metas) as Array<[GrupoMuscular, MetaVolume | undefined]>).filter(([, m]) => m && m.min > 0);
  if (!comMeta.length) return { sugestao: null, motivo: "Sem metas de volume definidas no plano: defina as metas no montador para o app conseguir sugerir." };
  const orcamento = Math.min(R.maxSeriesTotal, Math.max(0, e.seriesExtrasDisponiveis));
  if (orcamento < 2) return { sugestao: null, motivo: "O limite de séries extras da semana já foi atingido." };

  const faltas = comMeta
    .map(([grupo, m]) => ({ grupo, meta: m!.min, feito: Math.round((e.feito7d[grupo] ?? 0) * 10) / 10 }))
    .map((x) => ({ ...x, falta: Math.round((x.meta - x.feito) * 10) / 10 }))
    .filter((x) => x.falta >= R.minimoFalta);
  if (!faltas.length) return { sugestao: null, motivo: "Todos os grupos com meta já atingiram o mínimo nos últimos 7 dias." };

  const recentes = new Set(e.recentes48h);
  const aptos = faltas.filter((x) => !recentes.has(x.grupo) && e.candidatos.some((c) => c.grupo === x.grupo));
  if (!aptos.length) return { sugestao: null, motivo: "Os grupos abaixo da meta foram treinados há menos de 48 h (ou não há exercício disponível para eles)." };

  const prio = (g: string) => (e.prioridades?.includes(g) ? 0 : 1);
  aptos.sort((a, b) => prio(a.grupo) - prio(b.grupo) || b.falta - a.falta);

  const grupos: SugestaoExtra["grupos"] = [];
  let resta = orcamento;
  for (const x of aptos.slice(0, R.maxGrupos)) {
    const series = Math.min(R.maxSeriesPorGrupo, Math.ceil(x.falta), resta);
    if (series < 2) break;
    grupos.push({ ...x, rotulo: GRUPO_LABEL[x.grupo] ?? x.grupo, series });
    resta -= series;
  }
  if (!grupos.length) return { sugestao: null, motivo: "Sobraram poucas séries extras na semana para uma sugestão útil." };

  // Exercício: primeiro o que o aluno já faz no plano (familiar), depois o da biblioteca com vídeo.
  const exercicios = grupos.map((g) => {
    const c = [...e.candidatos].filter((x) => x.grupo === g.grupo).sort((a, b) => Number(b.doPlano) - Number(a.doPlano) || Number(b.temVideo) - Number(a.temVideo))[0];
    return { nome: c.nome, grupo: g.grupo, series: g.series, reps: "10-12" };
  });
  const seriesTotal = grupos.reduce((n, g) => n + g.series, 0);
  const duracaoMin = Math.max(10, Math.ceil((seriesTotal * R.minutosPorSerie + R.minutosPreparo) / 5) * 5);
  const titulo = `Extra sugerido: ${grupos.map((g) => g.rotulo).join(" + ")}`.slice(0, 80);
  const descricao = [
    ...exercicios.map((x) => `${x.nome}: ${x.series} × ${x.reps}.`),
    `Motivo: ${grupos.map((g) => `${g.rotulo} ${fmt(g.feito)} de ${g.meta} séries nos últimos 7 dias`).join("; ")}.`,
  ]
    .join(" ")
    .slice(0, 600);
  return { sugestao: { grupos, exercicios, seriesTotal, duracaoMin, titulo, descricao }, motivo: "Grupos abaixo da meta semanal, fora da janela de 48 h de recuperação." };
}

const fmt = (n: number) => String(n).replace(".", ",");
