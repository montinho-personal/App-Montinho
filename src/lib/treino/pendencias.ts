// ============================================================================
// Conferência antes de concluir o treino: quais séries válidas ficaram sem
// marcar. Exercícios pulados ou "não consegui" não contam como pendência;
// aquecimento também não.
// ============================================================================

export type StatusExercicioSessao = "pendente" | "concluido" | "pulado" | "nao_consegui" | string;

export type SerieConferida = { serie: number; tipo: string; concluida: boolean; carga: string; reps: string };

export type Pendencia = {
  seId: string;
  nome: string;
  /** Séries válidas sem ✓. */
  faltam: number[];
  /** Destas, as que já têm carga ou reps digitadas (o aluno só esqueceu de marcar). */
  preenchidas: number[];
};

export function verificarPendencias(
  exercicios: Array<{ seId: string; nome: string; status?: StatusExercicioSessao | null }>,
  series: Record<string, SerieConferida[]>
): Pendencia[] {
  const out: Pendencia[] = [];
  for (const ex of exercicios) {
    if (ex.status === "pulado" || ex.status === "nao_consegui") continue;
    const abertas = (series[ex.seId] ?? []).filter((s) => s.tipo === "valida" && !s.concluida);
    if (!abertas.length) continue;
    out.push({
      seId: ex.seId,
      nome: ex.nome,
      faltam: abertas.map((s) => s.serie),
      preenchidas: abertas.filter((s) => s.carga.trim() || s.reps.trim()).map((s) => s.serie),
    });
  }
  return out;
}

/** "série 3", "séries 3 e 4", "séries 2, 3 e 4". */
export function listarSeries(ns: number[]): string {
  if (ns.length === 1) return `série ${ns[0]}`;
  return `séries ${ns.slice(0, -1).join(", ")} e ${ns.at(-1)}`;
}
