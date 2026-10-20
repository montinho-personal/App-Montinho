// ============================================================================
// Biblioteca de exercícios — acesso a dados (live = Supabase com RLS; demo =
// catálogo em memória). Nunca usa a service role.
// ============================================================================

import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { normalizarNome } from "@/lib/grupos";
import { CATALOGO } from "@/lib/biblioteca/catalogo";
import { indicePorNome, itemDoBanco, itemDoCatalogo, type LinhaBiblioteca } from "@/lib/biblioteca/itens";
import type { Equivalencia, ItemBiblioteca, StatusEquivalencia } from "@/lib/biblioteca/tipos";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { demoStore } from "@/lib/mock/store";
import { VIDEOS_DEMO } from "@/lib/mock/videos-demo";

const COLUNAS =
  "id, slug, nome, grupo_muscular, grupos_secundarios, equipamento, sinonimos, instrucoes, erros_comuns, padrao_movimento, articulacoes, tipo_movimento, campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, origem, video_provider, video_id, video_validado";

// ---------------------------------------------------------------------------
// Demo: estado em memória (catálogo + favoritos + revisões de equivalência)
// ---------------------------------------------------------------------------
type DemoBiblioteca = { itens: ItemBiblioteca[]; favoritos: Map<string, Set<string>>; equivalencias: Equivalencia[] };

function demo(): DemoBiblioteca {
  const g = globalThis as unknown as { __montinhoBiblioteca?: DemoBiblioteca };
  if (!g.__montinhoBiblioteca) {
    g.__montinhoBiblioteca = {
      itens: CATALOGO.map((e) => {
        const item = itemDoCatalogo(e);
        const v = VIDEOS_DEMO[e.slug];
        return v ? { ...item, midia: { provider: "youtube", id: v, verificada: true } } : item;
      }),
      favoritos: new Map(),
      equivalencias: CATALOGO.flatMap((e) =>
        e.substituicoes.map((s) => ({ exercicioId: `cat-${e.slug}`, alternativaId: `cat-${s}`, origem: "catalogo" as const, status: "sugerida" as const, nota: null }))
      ),
    };
  }
  return g.__montinhoBiblioteca;
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------
export async function listarBiblioteca(): Promise<ItemBiblioteca[]> {
  if (isDemoMode()) return demo().itens;
  const db = await getDb();
  const { data } = await db.from("exercicios_biblioteca").select(COLUNAS).eq("arquivado", false).order("nome");
  return ((data ?? []) as LinhaBiblioteca[]).map(itemDoBanco);
}

export async function listarEquivalencias(): Promise<Equivalencia[]> {
  if (isDemoMode()) return demo().equivalencias;
  const db = await getDb();
  const { data } = await db.from("exercicio_equivalencias").select("exercicio_id, alternativa_id, origem, status, nota");
  return (data ?? []).map((r) => ({
    exercicioId: r.exercicio_id as string,
    alternativaId: r.alternativa_id as string,
    origem: r.origem === "catalogo" ? "catalogo" : "treinador",
    status: r.status as StatusEquivalencia,
    nota: (r.nota as string | null) ?? null,
  }));
}

/** Completa o grupo muscular que faltar (exercícios antigos) pelo nome na biblioteca. */
export async function completarGrupos<T extends { nome: string; biblioteca_id?: string | null; grupo_muscular: GrupoMuscular | null }>(exs: T[]): Promise<T[]> {
  if (exs.every((e) => e.grupo_muscular)) return exs;
  const itens = await listarBiblioteca();
  const porId = new Map(itens.map((i) => [i.id, i]));
  const porNome = indicePorNome(itens);
  return exs.map((e) => (e.grupo_muscular ? e : { ...e, grupo_muscular: ((e.biblioteca_id ? porId.get(e.biblioteca_id) : undefined) ?? porNome.get(normalizarNome(e.nome)))?.grupo ?? null }));
}

/** Equivalências para o app do aluno (função 0032: sem notas; a tabela é fechada para o aluno). */
export async function listarEquivalenciasParaAluno(): Promise<Equivalencia[]> {
  if (isDemoMode()) return demo().equivalencias;
  const db = await getDb();
  const { data, error } = await db.rpc("equivalencias_revisadas");
  if (error) return []; // banco sem a 0032: só as regras (mesmo padrão + mesmo músculo)
  return ((data ?? []) as Array<{ exercicio_id: string; alternativa_id: string; origem: string; status: string }>).map((r) => ({
    exercicioId: r.exercicio_id,
    alternativaId: r.alternativa_id,
    origem: r.origem === "catalogo" ? "catalogo" : "treinador",
    status: r.status as StatusEquivalencia,
    nota: null,
  }));
}

export async function listarFavoritos(userId: string): Promise<string[]> {
  if (isDemoMode()) return [...(demo().favoritos.get(userId) ?? new Set<string>())];
  const db = await getDb();
  const { data } = await db.from("exercicio_favoritos").select("exercicio_id").eq("treinador_id", userId);
  return (data ?? []).map((r) => r.exercicio_id as string);
}

export type UsoExercicio = { vezes: number; alunos: number };

/**
 * Uso REAL de cada exercício da biblioteca nas prescrições já feitas
 * (inclusive exercícios depois removidos do plano: continuam sendo histórico).
 * Liga pela biblioteca_id; sem ela, pelo nome ou sinônimo normalizado.
 */
export async function usoDosExercicios(itens: ItemBiblioteca[]): Promise<Record<string, UsoExercicio>> {
  let linhas: Array<{ nome: string; biblioteca_id: string | null; aluno_id: string | null }> = [];
  if (isDemoMode()) {
    const s = demoStore();
    const alunoPorTreino = new Map(s.treinos.map((t) => [t.id, t.aluno_id]));
    linhas = s.exercicios.map((e) => ({ nome: e.nome, biblioteca_id: null, aluno_id: alunoPorTreino.get(e.treino_id) ?? null }));
  } else {
    const db = await getDb();
    const { data } = await db.from("exercicios").select("nome, biblioteca_id, treinos(aluno_id)").limit(5000);
    linhas = (data ?? []).map((r) => {
      const t = r.treinos as unknown as { aluno_id?: string } | Array<{ aluno_id?: string }> | null;
      const aluno = Array.isArray(t) ? t[0]?.aluno_id : t?.aluno_id;
      return { nome: r.nome as string, biblioteca_id: (r.biblioteca_id as string | null) ?? null, aluno_id: aluno ?? null };
    });
  }
  const indice = indicePorNome(itens);
  const ids = new Set(itens.map((i) => i.id));
  const acc = new Map<string, { vezes: number; alunos: Set<string> }>();
  for (const l of linhas) {
    const id = l.biblioteca_id && ids.has(l.biblioteca_id) ? l.biblioteca_id : indice.get(normalizarNome(l.nome))?.id;
    if (!id) continue;
    const a = acc.get(id) ?? { vezes: 0, alunos: new Set<string>() };
    a.vezes += 1;
    if (l.aluno_id) a.alunos.add(l.aluno_id);
    acc.set(id, a);
  }
  return Object.fromEntries([...acc.entries()].map(([id, a]) => [id, { vezes: a.vezes, alunos: a.alunos.size }]));
}

// ---------------------------------------------------------------------------
// Escrita (somente treinador; RLS garante no banco)
// ---------------------------------------------------------------------------
export async function definirFavorito(userId: string, exercicioId: string, favorito: boolean): Promise<void> {
  if (isDemoMode()) {
    const m = demo().favoritos;
    const set = m.get(userId) ?? new Set<string>();
    if (favorito) set.add(exercicioId);
    else set.delete(exercicioId);
    m.set(userId, set);
    return;
  }
  const db = await getDb();
  if (favorito) {
    const { error } = await db.from("exercicio_favoritos").upsert({ treinador_id: userId, exercicio_id: exercicioId }, { onConflict: "treinador_id,exercicio_id" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.from("exercicio_favoritos").delete().eq("treinador_id", userId).eq("exercicio_id", exercicioId);
    if (error) throw new Error(error.message);
  }
}

export async function revisarEquivalencia(
  userId: string,
  v: { exercicioId: string; alternativaId: string; status: StatusEquivalencia; nota: string | null }
): Promise<void> {
  if (isDemoMode()) {
    const lista = demo().equivalencias;
    const atual = lista.find((e) => e.exercicioId === v.exercicioId && e.alternativaId === v.alternativaId);
    if (atual) Object.assign(atual, { status: v.status, nota: v.nota });
    else lista.push({ ...v, origem: "treinador" });
    return;
  }
  const db = await getDb();
  const { error } = await db.from("exercicio_equivalencias").upsert(
    { exercicio_id: v.exercicioId, alternativa_id: v.alternativaId, status: v.status, nota: v.nota, autor_id: userId },
    { onConflict: "exercicio_id,alternativa_id" }
  );
  if (error) throw new Error(error.message);
}

export type EntradaExercicio = {
  nome: string;
  sinonimos: string[];
  grupo_muscular: ItemBiblioteca["grupo"];
  pesos_secundarios: Partial<Record<ItemBiblioteca["grupo"], number>>;
  padrao_movimento: ItemBiblioteca["padrao"];
  articulacoes: ItemBiblioteca["articulacoes"];
  equipamento: ItemBiblioteca["equipamento"];
  tipo_movimento: ItemBiblioteca["tipo"];
  nivel_minimo: ItemBiblioteca["nivel"];
  instrucoes: string[];
  erros_comuns: string[];
  campos_registro: ItemBiblioteca["registro"];
  estresse_articular: ItemBiblioteca["estresse"];
  conta_volume: boolean;
  video_provider: string | null;
  video_id: string | null;
  video_validado: boolean;
};

function slugDe(nome: string): string {
  return `${normalizarNome(nome).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
}

function paraLinha(e: EntradaExercicio) {
  return {
    ...e,
    grupos_secundarios: Object.keys(e.pesos_secundarios),
    // Mídia só é marcada verificada quando houver vídeo.
    video_validado: !!(e.video_id && e.video_validado),
  };
}

/** Cria um exercício próprio do treinador (origem 'treinador'). Recusa nome duplicado. */
export async function criarExercicio(e: EntradaExercicio): Promise<ItemBiblioteca> {
  const existentes = await listarBiblioteca();
  const n = normalizarNome(e.nome);
  const dup = existentes.find((i) => normalizarNome(i.nome) === n || i.sinonimos.some((s) => normalizarNome(s) === n));
  if (dup) throw new Error(`Já existe na biblioteca: ${dup.nome}`);
  if (isDemoMode()) {
    const item = itemDoBanco({ ...paraLinha(e), id: `trein-${Date.now().toString(36)}`, slug: slugDe(e.nome), origem: "treinador" } as LinhaBiblioteca);
    demo().itens.push(item);
    return item;
  }
  const db = await getDb();
  const { data, error } = await db
    .from("exercicios_biblioteca")
    .insert({ ...paraLinha(e), slug: slugDe(e.nome), origem: "treinador", fonte_classificacao: "manual", arquivado: false })
    .select(COLUNAS)
    .single();
  if (error) throw new Error(error.message);
  return itemDoBanco(data as LinhaBiblioteca);
}

/**
 * Atualiza um exercício. Itens do catálogo editados passam a ser do treinador
 * (origem 'treinador'): futuras versões do catálogo não sobrescrevem a edição.
 * Prescrições já feitas (tabela exercicios) não são alteradas.
 */
export async function atualizarExercicio(id: string, e: EntradaExercicio): Promise<ItemBiblioteca> {
  if (isDemoMode()) {
    const lista = demo().itens;
    const idx = lista.findIndex((i) => i.id === id);
    if (idx < 0) throw new Error("Exercício não encontrado");
    const novo = itemDoBanco({ ...paraLinha(e), id, slug: lista[idx].slug, origem: "treinador" } as LinhaBiblioteca);
    lista[idx] = novo;
    return novo;
  }
  const db = await getDb();
  const { data, error } = await db.from("exercicios_biblioteca").update({ ...paraLinha(e), origem: "treinador" }).eq("id", id).select(COLUNAS).single();
  if (error) throw new Error(error.message);
  return itemDoBanco(data as LinhaBiblioteca);
}

/** Arquiva (nunca apaga): prescrições que usam o exercício continuam íntegras. */
export async function arquivarExercicio(id: string): Promise<void> {
  if (isDemoMode()) {
    const lista = demo().itens;
    const idx = lista.findIndex((i) => i.id === id);
    if (idx >= 0) lista.splice(idx, 1);
    return;
  }
  const db = await getDb();
  const { error } = await db.from("exercicios_biblioteca").update({ arquivado: true }).eq("id", id);
  if (error) throw new Error(error.message);
}
