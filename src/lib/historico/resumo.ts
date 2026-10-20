// ============================================================================
// Resumo do histórico de outro app (transcrito de prints pelo personal).
// O app anterior mostra só o resumo do dia por exercício: séries, carga
// máxima e volume. Guardamos exatamente isso — nunca reconstruímos carga ou
// repetições por série (seria inventar dado).
// Entra: gráfico de evolução por exercício e base de carga para recordes.
// Não entra: aderência, sequência, calendário, conquistas.
// ============================================================================

import { normalizarNome } from "@/lib/grupos";

export type HistoricoResumo = {
  id: string;
  aluno_id: string;
  data: string; // YYYY-MM-DD
  exercicio_nome: string;
  nome_normalizado: string;
  nome_original: string | null;
  biblioteca_id: string | null;
  letra: string | null;
  series: number;
  carga_max_kg: number | null;
  volume_kg: number | null;
  reps_total: number | null;
  fonte: string;
  importacao: string | null;
  observacao: string | null;
  created_at: string;
};

/** Linha de um arquivo de importação (o que foi lido no print). */
export type LinhaResumo = {
  data: string;
  /** Nome do exercício como está na prescrição atual (liga ao histórico novo). */
  exercicio: string;
  /** Nome como aparecia no app anterior. */
  nomeOriginal: string;
  bibliotecaId?: string | null;
  /** Só quando dá para deduzir com segurança (ex.: exercício exclusivo de um treino). */
  letra?: string | null;
  series: number;
  cargaMax: number | null;
  volume: number | null;
  observacao?: string | null;
};

export type ImportacaoResumo = { id: string; alunoNome: string; titulo: string; fonte: string; linhas: LinhaResumo[]; avisos: string[] };

/** Linha pronta para gravar (sem aluno). Dia sem séries não é treino feito — fica de fora. */
export function linhasParaGravar(imp: ImportacaoResumo) {
  return imp.linhas
    .filter((l) => l.series > 0)
    .map((l) => ({
      data: l.data,
      exercicio_nome: l.exercicio,
      nome_normalizado: normalizarNome(l.exercicio),
      nome_original: l.nomeOriginal,
      biblioteca_id: l.bibliotecaId ?? null,
      letra: l.letra ?? null,
      series: l.series,
      carga_max_kg: l.cargaMax,
      volume_kg: l.volume,
      reps_total: null,
      fonte: imp.fonte,
      importacao: imp.id,
      observacao: l.observacao ?? null,
    }));
}

/** Dias distintos com treino registrado no resumo. */
export function diasDoResumo(linhas: Array<{ data: string; series: number }>): string[] {
  return [...new Set(linhas.filter((l) => l.series > 0).map((l) => l.data))].sort();
}

/** Base de carga para recordes: o resumo só informa a carga máxima (sem reps). */
export type BaseCarga = { data: string; nome: string; carga_max: number };

export function baseCargaDoResumo(rs: Array<Pick<HistoricoResumo, "data" | "exercicio_nome" | "carga_max_kg" | "series">>): BaseCarga[] {
  return rs.filter((r) => r.series > 0 && (r.carga_max_kg ?? 0) > 0).map((r) => ({ data: r.data, nome: r.exercicio_nome, carga_max: Number(r.carga_max_kg) }));
}

/**
 * Dias de treino do resumo como sessões (para aderência, sequência e
 * conquistas). Só dias com a letra do treino identificada. Sem séries
 * detalhadas: só a contagem (séries do resumo × séries prescritas na letra).
 */
export type DiaDeTreino = { data: string; letra: string; seriesConcluidas: number; seriesPlanejadas: number; clientKey: string };

export function diasDeTreinoDoResumo(imp: Pick<ImportacaoResumo, "id" | "linhas">, seriesPorLetra: Record<string, number>): DiaDeTreino[] {
  const porDia = new Map<string, { letra: string | null; series: number }>();
  for (const l of imp.linhas) {
    if (l.series <= 0) continue;
    const d = porDia.get(l.data) ?? { letra: null, series: 0 };
    d.series += l.series;
    d.letra ??= l.letra ?? null;
    porDia.set(l.data, d);
  }
  return [...porDia.entries()]
    .filter(([, d]) => d.letra && seriesPorLetra[d.letra] != null)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([data, d]) => ({ data, letra: d.letra!, seriesConcluidas: d.series, seriesPlanejadas: seriesPorLetra[d.letra!], clientKey: `hist:${imp.id}:${data}` }));
}

/**
 * Séries de cada exercício num dia do resumo, na ordem do treino da letra.
 * Exercício sem linha no dia (ou com 0 séries) fica como pulado.
 * Carga e repetições por série não existem no resumo: ficam vazias.
 */
export type ExercicioDoDia = { exercicioId: string; nome: string; ordem: number; grupo: string | null; bibliotecaId: string | null; planejadas: number; feitas: number; tipo: "valida" | "isometria" };

export function exerciciosDoDia(
  linhas: LinhaResumo[],
  data: string,
  treino: { exercicios: Array<{ id: string; nome: string; series: number; grupo_muscular: string | null; biblioteca_id?: string | null; tecnica?: string | null }> },
): ExercicioDoDia[] {
  const doDia = linhas.filter((l) => l.data === data);
  return treino.exercicios.map((e, i) => {
    const l = doDia.find((x) => normalizarNome(x.exercicio) === normalizarNome(e.nome));
    return { exercicioId: e.id, nome: e.nome, ordem: i, grupo: e.grupo_muscular, bibliotecaId: e.biblioteca_id ?? null, planejadas: e.series, feitas: Math.min(l?.series ?? 0, e.series), tipo: e.tecnica === "isometria" ? "isometria" : "valida" };
  });
}
