// ============================================================================
// Divisão semanal da estratégia → dias de treino com os músculos de cada dia.
// Divisões conhecidas têm um modelo (Push/Pull/Legs, Upper/Lower…). As séries
// semanais de cada grupo são repartidas entre os dias que treinam o grupo; a
// sobra vai para os primeiros dias (“prioritário no início da semana”).
// Grupos fora de todos os dias (ex.: abdômen) são espalhados por todos.
// Divisão desconhecida → nenhum dia é inventado (o personal monta no montador).
// ============================================================================

import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { GRUPO_LABEL } from "@/lib/grupos";
import { semAcento, type EstrategiaImportada } from "./ler";

export type DiaModelo = { nome: string; grupos: GrupoMuscular[] };
export type DiaEstrategia = { letra: string; nome: string; grupos: Array<{ grupo: GrupoMuscular; series: number; max: number }> };

const PEITO_OMBRO_TRI: GrupoMuscular[] = ["peito", "ombros", "ombro_anterior", "ombro_lateral", "triceps"];
const COSTAS_BI: GrupoMuscular[] = ["costas", "ombro_posterior", "trapezio", "biceps", "antebraco"];
const PERNAS: GrupoMuscular[] = ["quadriceps", "posteriores", "gluteo", "adutores", "abdutores", "panturrilha"];
const SUPERIORES: GrupoMuscular[] = [...PEITO_OMBRO_TRI, ...COSTAS_BI];

const PUSH: DiaModelo = { nome: "Push — Peito, ombros e tríceps", grupos: PEITO_OMBRO_TRI };
const PULL: DiaModelo = { nome: "Pull — Costas e bíceps", grupos: COSTAS_BI };
const LEGS: DiaModelo = { nome: "Legs — Pernas", grupos: PERNAS };
const UPPER: DiaModelo = { nome: "Superiores", grupos: SUPERIORES };
const LOWER: DiaModelo = { nome: "Inferiores", grupos: PERNAS };
const FULL: DiaModelo = { nome: "Corpo inteiro", grupos: [...SUPERIORES, ...PERNAS] };

/** Modelos pelo nome da divisão (sem acento, minúsculo, sem espaços). */
export function modeloDaDivisao(divisao: string | null, dias: number | null): DiaModelo[] | null {
  if (!divisao) return null;
  const d = semAcento(divisao).replace(/\s+/g, "").replace(/[–—-]/g, "/");
  const has = (...xs: string[]) => xs.every((x) => d.includes(x));
  if (has("push", "pull", "legs") && (d.includes("superior") || d.includes("upper"))) return [PUSH, PULL, LEGS, UPPER];
  if (has("push", "pull", "legs") && (d.includes("inferior") || d.includes("lower"))) return [PUSH, PULL, LEGS, LOWER];
  if (has("push", "pull", "legs")) return dias === 6 ? [PUSH, PULL, LEGS, PUSH, PULL, LEGS] : [PUSH, PULL, LEGS];
  if ((d.includes("upper") && d.includes("lower")) || (d.includes("superior") && d.includes("inferior"))) return dias && dias >= 4 ? [UPPER, LOWER, UPPER, LOWER] : [UPPER, LOWER];
  if (d.includes("fullbody") || d.includes("corpointeiro")) return Array.from({ length: Math.min(Math.max(dias ?? 3, 1), 6) }, () => FULL);
  return null;
}

const LETRAS = ["A", "B", "C", "D", "E", "F"];

export function diasDaEstrategia(e: Pick<EstrategiaImportada, "divisao" | "diasPorSemana" | "volume">): DiaEstrategia[] {
  const modelo = modeloDaDivisao(e.divisao, e.diasPorSemana);
  if (!modelo) return [];
  const dias: DiaEstrategia[] = modelo.map((m, i) => ({ letra: LETRAS[i], nome: m.nome, grupos: [] }));
  for (const v of e.volume) {
    if (!v.grupo || v.series <= 0) continue;
    let idx = modelo.map((m, i) => (m.grupos.includes(v.grupo!) ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) idx = modelo.map((_, i) => i);
    // Mínimo e máximo da faixa repartidos do mesmo jeito (sobra nos primeiros dias).
    const repartir = (total: number) => {
      const base = Math.floor(total / idx.length);
      let sobra = total - base * idx.length;
      return idx.map(() => base + (sobra-- > 0 ? 1 : 0));
    };
    const mins = repartir(v.series);
    const maxs = repartir(Math.max(v.series, v.max ?? v.series));
    idx.forEach((i, k) => {
      if (maxs[k] > 0) dias[i].grupos.push({ grupo: v.grupo!, series: mins[k], max: maxs[k] });
    });
  }
  return dias;
}

/** Texto curto do foco do dia (vai nas observações do treino). */
export function focoDoDia(d: DiaEstrategia): string {
  return d.grupos.map((g) => `${GRUPO_LABEL[g.grupo]} ${g.max > g.series ? `${g.series}–${g.max}` : g.series}`).join(" · ");
}
