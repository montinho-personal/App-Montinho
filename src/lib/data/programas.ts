// ============================================================================
// Plano prescrito: programa + treinos + exercícios, com IDs ESTÁVEIS,
// soft delete e snapshot imutável a cada salvamento.
//
// Nunca usa DELETE + INSERT: exercícios existentes são atualizados pelo id,
// novos são inseridos, removidos recebem `removido_em` (histórico preservado).
// ============================================================================

import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import type { Treino } from "@/lib/supabase/types";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type {
  ExercicioPrescrito,
  PrioridadeExercicio,
  Programa,
  ProgramaVersao,
  SnapshotPrograma,
  SnapshotTreino,
  TreinoLetra,
} from "@/lib/supabase/types-sessoes";
import type { Calendario, Frequencia, MetaVolume, Tecnica } from "@/lib/volume/calcular";
import { registrarNaMemoria } from "./memoria";

export type TreinoComExercicios = Treino & { versao?: number; programa_id?: string | null; exercicios: ExercicioPrescrito[] };

export type PlanoAtivo = {
  programa: Programa | null;
  treinos: TreinoComExercicios[];
};

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------
export async function getPlanoAtivo(alunoId: string): Promise<PlanoAtivo> {
  if (isDemoMode()) {
    const s = demoStore();
    const programa = s.programas.find((p) => p.aluno_id === alunoId && p.ativo) ?? null;
    const treinos = s.treinos
      .filter((t) => t.aluno_id === alunoId && t.ativo)
      .sort((a, b) => a.ordem - b.ordem)
      .map((t) => ({
        ...t,
        exercicios: s.exercicios.filter((e) => e.treino_id === t.id && !e.removido_em).sort((a, b) => a.ordem - b.ordem),
      }));
    return { programa, treinos };
  }
  const db = await getDb();
  const [{ data: programa }, { data: treinos }] = await Promise.all([
    db.from("programas").select("*").eq("aluno_id", alunoId).eq("ativo", true).maybeSingle(),
    db.from("treinos").select("*").eq("aluno_id", alunoId).eq("ativo", true).order("ordem"),
  ]);
  const ids = (treinos ?? []).map((t) => t.id);
  let exercicios: ExercicioPrescrito[] = [];
  if (ids.length) {
    const { data } = await db
      .from("exercicios")
      .select("*")
      .in("treino_id", ids)
      .is("removido_em", null)
      .order("ordem");
    exercicios = (data ?? []) as ExercicioPrescrito[];
  }
  return {
    programa: (programa as Programa | null) ?? null,
    treinos: (treinos ?? []).map((t) => ({ ...(t as Treino), exercicios: exercicios.filter((e) => e.treino_id === t.id) })),
  };
}

export async function getTreinoComExercicios(treinoId: string): Promise<TreinoComExercicios | null> {
  if (isDemoMode()) {
    const s = demoStore();
    const t = s.treinos.find((x) => x.id === treinoId);
    if (!t) return null;
    return { ...t, exercicios: s.exercicios.filter((e) => e.treino_id === t.id && !e.removido_em).sort((a, b) => a.ordem - b.ordem) };
  }
  const db = await getDb();
  const { data: t } = await db.from("treinos").select("*").eq("id", treinoId).maybeSingle();
  if (!t) return null;
  const { data: exs } = await db.from("exercicios").select("*").eq("treino_id", treinoId).is("removido_em", null).order("ordem");
  return { ...(t as Treino), exercicios: (exs ?? []) as ExercicioPrescrito[] };
}

export async function listTreinosFinalizados(alunoId: string): Promise<TreinoComExercicios[]> {
  if (isDemoMode()) {
    const s = demoStore();
    return s.treinos
      .filter((t) => t.aluno_id === alunoId && !t.ativo)
      .map((t) => ({ ...t, exercicios: s.exercicios.filter((e) => e.treino_id === t.id && !e.removido_em) }));
  }
  const db = await getDb();
  const { data } = await db.from("treinos").select("*, exercicios(*)").eq("aluno_id", alunoId).eq("ativo", false).order("updated_at", { ascending: false });
  return ((data ?? []) as Array<Treino & { exercicios: ExercicioPrescrito[] }>).map((t) => ({
    ...t,
    exercicios: (t.exercicios ?? []).filter((e) => !e.removido_em),
  }));
}

export async function listVersoes(alunoId: string, limite = 20): Promise<ProgramaVersao[]> {
  if (isDemoMode()) {
    return demoStore()
      .versoes.filter((v) => v.aluno_id === alunoId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limite);
  }
  const db = await getDb();
  const { data } = await db.from("programa_versoes").select("*").eq("aluno_id", alunoId).order("created_at", { ascending: false }).limit(limite);
  return (data ?? []) as ProgramaVersao[];
}

export async function getVersao(id: string): Promise<ProgramaVersao | null> {
  if (isDemoMode()) return demoStore().versoes.find((v) => v.id === id) ?? null;
  const db = await getDb();
  const { data } = await db.from("programa_versoes").select("*").eq("id", id).maybeSingle();
  return (data as ProgramaVersao | null) ?? null;
}

// ---------------------------------------------------------------------------
// Escrita (treinador)
// ---------------------------------------------------------------------------
export type ExercicioInput = {
  id?: string | null; // id existente → update; ausente → insert
  nome: string;
  series: number;
  reps: string;
  ie: number | null;
  rir: number | null;
  descanso_seg: number | null;
  observacoes: string | null;
  series_config?: unknown;
  biblioteca_id?: string | null;
  grupo_muscular: GrupoMuscular | null;
  grupos_secundarios: GrupoMuscular[];
  grupo_origem: "biblioteca" | "manual" | "heuristica" | "correcao" | null;
  grupo_confianca: "alta" | "media" | "baixa" | null;
  series_aquecimento: number;
  tecnica: Tecnica;
  tecnica_extras?: number | null;
  tecnica_series?: number | null;
  tecnica_config?: unknown;
  descanso_apos_seg?: number | null;
  cadencia?: string | null;
  /** Treino possível hoje: essencial nunca sai; adiável sai primeiro. */
  prioridade?: PrioridadeExercicio;
  bloco: string | null;
  unilateral: boolean;
  carga_alvo: string | null;
  conta_volume: boolean;
};

export type TreinoInput = {
  id?: string | null;
  letra: TreinoLetra;
  nome: string;
  ativo: boolean;
  observacoes: string | null;
  duracao_estimada_min?: number | null;
  tempo_alvo_min?: number | null;
  tempos?: Record<string, number | boolean>;
  tempos_efetivos?: Record<string, number | boolean>;
  exercicios: ExercicioInput[];
};

export type ProgramaInput = {
  nome: string;
  objetivo: string | null;
  nivel: string | null;
  split: string | null;
  modo_semana: "fixa" | "rotativo";
  frequencia: Frequencia;
  calendario: Calendario | Record<string, never>;
  metas_volume: Partial<Record<GrupoMuscular, MetaVolume>>;
  prioridades: string[];
  equipamentos: string[];
  duracao_min: number | null;
  permite_versao_reduzida: boolean;
  observacoes: string | null;
  fase?: "adaptacao" | "intensificacao" | "consolidacao" | null;
};

export type SalvarPlanoInput = {
  programa: ProgramaInput;
  treinos: TreinoInput[];
  motivo?: string | null;
  volume?: unknown;
  /** Guardar automaticamente na memória de prescrições (padrão true). */
  registrarMemoria?: boolean;
};

export type SalvarPlanoResultado = {
  programa: Programa;
  treinos: TreinoComExercicios[];
  versao: ProgramaVersao;
};

function montarSnapshot(programa: Programa, treinos: TreinoComExercicios[]): SnapshotPrograma {
  const snapTreinos: SnapshotTreino[] = treinos.map((t) => ({
    id: t.id,
    letra: t.letra as TreinoLetra,
    nome: t.nome,
    observacoes: t.observacoes,
    ativo: t.ativo,
    exercicios: t.exercicios.map((e) => ({
      id: e.id,
      ordem: e.ordem,
      nome: e.nome,
      series: e.series,
      reps: e.reps,
      ie: e.ie,
      rir: e.rir ?? null,
      descanso_seg: e.descanso_seg,
      observacoes: e.observacoes,
      grupo_muscular: e.grupo_muscular,
      grupos_secundarios: e.grupos_secundarios ?? [],
      series_aquecimento: e.series_aquecimento ?? 0,
      tecnica: e.tecnica ?? "normal",
      tecnica_extras: e.tecnica_extras ?? null,
      tecnica_series: e.tecnica_series ?? null,
      tecnica_config: e.tecnica_config ?? null,
      descanso_apos_seg: e.descanso_apos_seg ?? null,
      cadencia: e.cadencia ?? null,
      prioridade: e.prioridade ?? "normal",
      bloco: e.bloco ?? null,
      unilateral: e.unilateral ?? false,
      carga_alvo: e.carga_alvo ?? null,
      series_config: e.series_config ?? null,
    })),
  }));
  return {
    programa: {
      nome: programa.nome,
      objetivo: programa.objetivo,
      nivel: programa.nivel,
      split: programa.split,
      modo_semana: programa.modo_semana,
      frequencia: programa.frequencia,
      calendario: programa.calendario,
      metas_volume: programa.metas_volume,
      prioridades: programa.prioridades,
      equipamentos: programa.equipamentos,
      duracao_min: programa.duracao_min,
      observacoes: programa.observacoes,
      fase: programa.fase ?? null,
    },
    treinos: snapTreinos,
  };
}

function resumoDiff(anterior: SnapshotPrograma | null, atual: SnapshotPrograma): string {
  if (!anterior) return "Primeira versão registrada.";
  const partes: string[] = [];
  const contar = (s: SnapshotPrograma) => s.treinos.filter((t) => t.ativo).reduce((n, t) => n + t.exercicios.length, 0);
  const series = (s: SnapshotPrograma) => s.treinos.filter((t) => t.ativo).reduce((n, t) => n + t.exercicios.reduce((m, e) => m + (e.series || 0), 0), 0);
  const dExs = contar(atual) - contar(anterior);
  const dSeries = series(atual) - series(anterior);
  if (dExs !== 0) partes.push(`${dExs > 0 ? "+" : ""}${dExs} exercício(s)`);
  if (dSeries !== 0) partes.push(`${dSeries > 0 ? "+" : ""}${dSeries} série(s)`);
  const nomesAntes = new Set(anterior.treinos.flatMap((t) => t.exercicios.map((e) => e.nome.toLowerCase())));
  const nomesDepois = new Set(atual.treinos.flatMap((t) => t.exercicios.map((e) => e.nome.toLowerCase())));
  const novos = [...nomesDepois].filter((n) => !nomesAntes.has(n));
  const removidos = [...nomesAntes].filter((n) => !nomesDepois.has(n));
  if (novos.length) partes.push(`novo: ${novos.slice(0, 3).join(", ")}${novos.length > 3 ? "…" : ""}`);
  if (removidos.length) partes.push(`saiu: ${removidos.slice(0, 3).join(", ")}${removidos.length > 3 ? "…" : ""}`);
  if (JSON.stringify(anterior.programa.frequencia) !== JSON.stringify(atual.programa.frequencia)) partes.push("frequência alterada");
  return partes.length ? partes.join(" · ") : "Ajustes sem mudança de estrutura.";
}

export async function salvarPlano(alunoId: string, autorId: string, input: SalvarPlanoInput): Promise<SalvarPlanoResultado> {
  const agora = new Date().toISOString();

  if (isDemoMode()) {
    const s = demoStore();
    let programa = s.programas.find((p) => p.aluno_id === alunoId && p.ativo);
    if (!programa) {
      programa = { id: uid(), aluno_id: alunoId, versao: 0, ativo: true, created_at: agora, updated_at: agora, ...input.programa };
      s.programas.push(programa);
    }
    Object.assign(programa, input.programa, { versao: programa.versao + 1, updated_at: agora });

    const resultado: TreinoComExercicios[] = [];
    input.treinos.forEach((t, ordem) => {
      let treino = t.id ? s.treinos.find((x) => x.id === t.id && x.aluno_id === alunoId) : undefined;
      if (!treino) {
        treino = { id: uid(), aluno_id: alunoId, letra: t.letra as Treino["letra"], nome: t.nome, observacoes: t.observacoes, ordem, ativo: t.ativo, created_at: agora, updated_at: agora, versao: 1, programa_id: programa!.id };
        s.treinos.push(treino);
      } else {
        Object.assign(treino, { nome: t.nome, observacoes: t.observacoes, ordem, ativo: t.ativo, letra: t.letra, versao: (treino.versao ?? 1) + 1, programa_id: programa!.id, updated_at: agora });
      }
      const existentes = s.exercicios.filter((e) => e.treino_id === treino!.id && !e.removido_em);
      const mantidos = new Set<string>();
      const exercicios: ExercicioPrescrito[] = [];
      t.exercicios.forEach((e, ordemEx) => {
        let ex = e.id ? existentes.find((x) => x.id === e.id) : undefined;
        if (!ex) {
          ex = { id: uid(), treino_id: treino!.id, created_at: agora, video_url: null, removido_em: null, ...camposExercicio(e, ordemEx), updated_at: agora } as ExercicioPrescrito;
          s.exercicios.push(ex);
        } else {
          Object.assign(ex, camposExercicio(e, ordemEx), { updated_at: agora });
        }
        mantidos.add(ex.id);
        exercicios.push(ex);
      });
      for (const e of existentes) if (!mantidos.has(e.id)) e.removido_em = agora;
      resultado.push({ ...treino, exercicios });
    });

    const anterior = s.versoes.filter((v) => v.aluno_id === alunoId).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0] ?? null;
    const snapshot = montarSnapshot(programa, resultado);
    const versao: ProgramaVersao = {
      id: uid(),
      aluno_id: alunoId,
      programa_id: programa.id,
      versao: programa.versao,
      autor_id: autorId,
      motivo: input.motivo ?? null,
      snapshot,
      volume: input.volume ?? null,
      diff_resumo: resumoDiff(anterior?.snapshot ?? null, snapshot),
      created_at: agora,
    };
    s.versoes.push(versao);
    if (input.registrarMemoria !== false) await registrarNaMemoria(snapshot, versao.id, autorId, input.volume);
    return { programa, treinos: resultado, versao };
  }

  // ---------------- LIVE (RLS: só o treinador passa nas policies) ----------------
  const db = await getDb();
  const { data: progAtual } = await db.from("programas").select("*").eq("aluno_id", alunoId).eq("ativo", true).maybeSingle();
  let programa: Programa;
  if (progAtual) {
    const { data, error } = await db
      .from("programas")
      .update({ ...input.programa, versao: (progAtual.versao ?? 0) + 1 })
      .eq("id", progAtual.id)
      .select("*")
      .single();
    if (error) throw new Error(`Falha ao atualizar programa: ${error.message}`);
    programa = data as Programa;
  } else {
    const { data, error } = await db
      .from("programas")
      .insert({ aluno_id: alunoId, ...input.programa, versao: 1, ativo: true })
      .select("*")
      .single();
    if (error) throw new Error(`Falha ao criar programa: ${error.message}`);
    programa = data as Programa;
  }

  // Arquiva primeiro: só pode haver um treino ativo por letra (idx_treinos_aluno_letra_ativo_unique),
  // então o “A” antigo precisa sair de cena antes de o “A” novo ser criado.
  for (const t of input.treinos) {
    if (!t.id || t.ativo) continue;
    const { error } = await db.from("treinos").update({ ativo: false }).eq("id", t.id).eq("aluno_id", alunoId);
    if (error) throw new Error(`Falha ao arquivar treino ${t.letra}: ${error.message}`);
  }

  const resultado: TreinoComExercicios[] = [];
  for (let ordem = 0; ordem < input.treinos.length; ordem++) {
    const t = input.treinos[ordem];
    const payload = { aluno_id: alunoId, letra: t.letra, nome: t.nome, observacoes: t.observacoes, ordem, ativo: t.ativo, programa_id: programa.id, duracao_estimada_min: t.duracao_estimada_min ?? null, tempo_alvo_min: t.tempo_alvo_min ?? null, tempos: t.tempos ?? {}, ...(t.tempos_efetivos ? { tempos_efetivos: t.tempos_efetivos } : {}) };
    let treino: Treino & { versao?: number };
    if (t.id) {
      const { data: existente } = await db.from("treinos").select("versao").eq("id", t.id).eq("aluno_id", alunoId).maybeSingle();
      if (!existente) throw new Error("Treino não encontrado para este aluno");
      const { data, error } = await db.from("treinos").update({ ...payload, versao: (existente.versao ?? 1) + 1 }).eq("id", t.id).eq("aluno_id", alunoId).select("*").single();
      if (error) throw new Error(`Falha ao atualizar treino ${t.letra}: ${error.message}`);
      treino = data as Treino;
    } else {
      const { data, error } = await db.from("treinos").insert({ ...payload, versao: 1 }).select("*").single();
      if (error) throw new Error(`Falha ao criar treino ${t.letra}: ${error.message}`);
      treino = data as Treino;
    }

    const { data: existentes } = await db.from("exercicios").select("id").eq("treino_id", treino.id).is("removido_em", null);
    const idsExistentes = new Set((existentes ?? []).map((e) => e.id));
    const mantidos = new Set<string>();
    const exercicios: ExercicioPrescrito[] = [];
    for (let ordemEx = 0; ordemEx < t.exercicios.length; ordemEx++) {
      const e = t.exercicios[ordemEx];
      const campos = camposExercicio(e, ordemEx);
      if (e.id && idsExistentes.has(e.id)) {
        const { data, error } = await db.from("exercicios").update(campos).eq("id", e.id).eq("treino_id", treino.id).select("*").single();
        if (error) throw new Error(`Falha ao atualizar exercício: ${error.message}`);
        mantidos.add(e.id);
        exercicios.push(data as ExercicioPrescrito);
      } else {
        const { data, error } = await db.from("exercicios").insert({ treino_id: treino.id, ...campos }).select("*").single();
        if (error) throw new Error(`Falha ao inserir exercício: ${error.message}`);
        mantidos.add(data.id);
        exercicios.push(data as ExercicioPrescrito);
      }
    }
    const removidos = [...idsExistentes].filter((id) => !mantidos.has(id));
    if (removidos.length) {
      const { error } = await db.from("exercicios").update({ removido_em: agora }).in("id", removidos);
      if (error) throw new Error(`Falha ao arquivar exercícios: ${error.message}`);
    }
    resultado.push({ ...treino, exercicios });
  }

  const { data: anterior } = await db.from("programa_versoes").select("snapshot").eq("aluno_id", alunoId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const snapshot = montarSnapshot(programa, resultado);
  const { data: versao, error: vErr } = await db
    .from("programa_versoes")
    .insert({
      aluno_id: alunoId,
      programa_id: programa.id,
      versao: programa.versao,
      autor_id: autorId,
      motivo: input.motivo ?? null,
      snapshot,
      volume: input.volume ?? null,
      diff_resumo: resumoDiff((anterior?.snapshot as SnapshotPrograma | null) ?? null, snapshot),
    })
    .select("*")
    .single();
  if (vErr) throw new Error(`Falha ao registrar versão: ${vErr.message}`);
  if (input.registrarMemoria !== false) {
    try {
      await registrarNaMemoria(snapshot, versao.id, autorId, input.volume);
    } catch (e) {
      console.warn("[memoria] falha ao registrar programa (não bloqueia o salvamento)", e instanceof Error ? e.message : e);
    }
  }
  return { programa, treinos: resultado, versao: versao as ProgramaVersao };
}

function camposExercicio(e: ExercicioInput, ordem: number) {
  return {
    ordem,
    nome: e.nome.trim(),
    series: Math.max(0, Math.floor(Number(e.series) || 0)),
    reps: (e.reps ?? "").trim(),
    ie: e.ie,
    rir: e.rir,
    descanso_seg: e.descanso_seg,
    observacoes: e.observacoes,
    series_config: e.series_config ?? null,
    biblioteca_id: e.biblioteca_id ?? null,
    grupo_muscular: e.grupo_muscular,
    grupos_secundarios: e.grupos_secundarios ?? [],
    grupo_origem: e.grupo_origem,
    grupo_confianca: e.grupo_confianca,
    series_aquecimento: Math.max(0, Math.floor(Number(e.series_aquecimento) || 0)),
    tecnica: e.tecnica ?? "normal",
    tecnica_extras: e.tecnica_extras ?? null,
    tecnica_series: e.tecnica_series ?? null,
    tecnica_config: e.tecnica_config ?? null,
    descanso_apos_seg: e.descanso_apos_seg ?? null,
    cadencia: e.cadencia?.trim() || null,
    prioridade: e.prioridade ?? "normal",
    bloco: e.bloco,
    unilateral: Boolean(e.unilateral),
    carga_alvo: e.carga_alvo,
    conta_volume: e.conta_volume !== false,
  };
}

/** Finaliza (arquiva) um treino: sai dos ativos, histórico preservado. */
export async function arquivarTreino(alunoId: string, treinoId: string): Promise<boolean> {
  if (isDemoMode()) {
    const t = demoStore().treinos.find((x) => x.id === treinoId && x.aluno_id === alunoId);
    if (!t) return false;
    t.ativo = false;
    return true;
  }
  const db = await getDb();
  const { error, count } = await db.from("treinos").update({ ativo: false }, { count: "exact" }).eq("id", treinoId).eq("aluno_id", alunoId);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}
