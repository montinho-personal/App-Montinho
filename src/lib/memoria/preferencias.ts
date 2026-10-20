// ============================================================================
// Preferências recorrentes do treinador — calculadas SOMENTE a partir das
// prescrições realmente salvas na memória (estruturas desidentificadas).
// Nada é inventado: sem registros, o resultado diz que não há dados.
// São padrões descritivos ("você costuma…"), nunca uma recomendação de que a
// prescrição antiga sirva para qualquer aluno.
// ============================================================================

import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { BibliotecaPrograma } from "@/lib/supabase/types-sessoes";
import { normalizarNome } from "@/lib/grupos";

export type Contagem = { valor: string; vezes: number };

export type PreferenciasTreinador = {
  /** Quantas prescrições salvas embasam os números (0 = sem dados). */
  baseadoEm: number;
  splits: Contagem[];
  objetivos: Contagem[];
  tecnicas: Contagem[];
  repeticoes: Contagem[];
  sessoesSemana: Contagem[];
  /** Mediana de séries por exercício (null sem dados). */
  seriesPorExercicioMediana: number | null;
  /** Exercícios mais usados por músculo principal (top 3 de cada grupo). */
  exerciciosPorGrupo: Partial<Record<GrupoMuscular, Contagem[]>>;
};

function contar(valores: Array<string | null | undefined>, limite = 5): Contagem[] {
  const m = new Map<string, number>();
  for (const v of valores) {
    const t = (v ?? "").toString().trim();
    if (!t) continue;
    m.set(t, (m.get(t) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([valor, vezes]) => ({ valor, vezes }))
    .sort((a, b) => b.vezes - a.vezes || a.valor.localeCompare(b.valor, "pt-BR"))
    .slice(0, limite);
}

function mediana(xs: number[]): number | null {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

export function preferenciasRecorrentes(acervo: BibliotecaPrograma[]): PreferenciasTreinador {
  const validos = acervo.filter((p) => !p.excluido_em && p.estrutura?.treinos?.length);
  const exercicios = validos.flatMap((p) => p.estrutura.treinos.filter((t) => t.ativo !== false).flatMap((t) => t.exercicios));
  const porGrupo = new Map<GrupoMuscular, Map<string, { nome: string; vezes: number }>>();
  for (const e of exercicios) {
    if (!e.grupo_muscular || !e.nome?.trim()) continue;
    const g = porGrupo.get(e.grupo_muscular) ?? new Map();
    const k = normalizarNome(e.nome);
    const atual = g.get(k) ?? { nome: e.nome.trim(), vezes: 0 };
    atual.vezes += 1;
    g.set(k, atual);
    porGrupo.set(e.grupo_muscular, g);
  }
  const exerciciosPorGrupo: Partial<Record<GrupoMuscular, Contagem[]>> = {};
  for (const [g, m] of porGrupo) {
    exerciciosPorGrupo[g] = [...m.values()]
      .sort((a, b) => b.vezes - a.vezes || a.nome.localeCompare(b.nome, "pt-BR"))
      .slice(0, 3)
      .map((x) => ({ valor: x.nome, vezes: x.vezes }));
  }
  return {
    baseadoEm: validos.length,
    splits: contar(validos.map((p) => p.metadados?.split)),
    objetivos: contar(validos.map((p) => p.metadados?.objetivo)),
    tecnicas: contar(exercicios.map((e) => (e.tecnica && e.tecnica !== "normal" ? e.tecnica : null))),
    repeticoes: contar(exercicios.map((e) => e.reps)),
    sessoesSemana: contar(validos.map((p) => (p.metadados?.sessoes_semana ? `${p.metadados.sessoes_semana}x/semana` : null))),
    seriesPorExercicioMediana: mediana(exercicios.map((e) => Number(e.series) || 0).filter((n) => n > 0)),
    exerciciosPorGrupo,
  };
}
