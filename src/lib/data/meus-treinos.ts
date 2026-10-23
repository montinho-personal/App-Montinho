// ============================================================================
// Modo Visitante — treinos montados pelo próprio visitante (autoria 'proprio').
//
// Cliente com RLS (0054: só o visitante em dia escreve, e só nos treinos
// dele com autoria 'proprio'). Nome e músculos de cada exercício vêm da
// biblioteca no servidor, nunca do navegador. Sem DELETE: treino sai com
// ativo=false; exercício com removido_em.
// ============================================================================

import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";
import type { Treino, TreinoLetra } from "@/lib/supabase/types";
import type { ExercicioPrescrito } from "@/lib/supabase/types-sessoes";
import type { TreinoProprioInput } from "@/lib/validacao/schemas";

export const LETRAS: TreinoLetra[] = ["A", "B", "C", "D", "E", "F", "G", "H"];

/** Primeira letra livre entre os treinos ativos (null = todas usadas). */
export function letraLivre(ativas: string[]): TreinoLetra | null {
  return LETRAS.find((l) => !ativas.includes(l)) ?? null;
}

const cargaTexto = (kg: number | null | undefined) => (kg ? `${String(kg).replace(".", ",")} kg` : null);

function camposDoExercicio(e: TreinoProprioInput["exercicios"][number], item: ItemBiblioteca | null, ordem: number) {
  const comuns = { ordem, series: e.series, reps: e.reps, descanso_seg: e.descanso_seg, series_aquecimento: 0, tecnica: "normal" as const, carga_alvo: cargaTexto(e.carga_kg) };
  if (!item) {
    // Exercício com o nome da pessoa: guarda o histórico pelo nome, sem músculo
    // (não entra no volume semanal nem nas contas por músculo).
    return { ...comuns, nome: (e.nome_livre ?? "").trim(), biblioteca_id: null, grupo_muscular: null, grupos_secundarios: [], grupo_origem: "manual" as const, grupo_confianca: "baixa" as const, conta_volume: false };
  }
  return {
    ...comuns,
    nome: item.nome,
    biblioteca_id: item.id.startsWith("cat-") ? null : item.id,
    grupo_muscular: item.grupo,
    grupos_secundarios: item.secundarios,
    grupo_origem: "biblioteca" as const,
    grupo_confianca: "alta" as const,
    conta_volume: item.contaVolume,
  };
}

export async function salvarTreinoProprio(alunoId: string, input: TreinoProprioInput, biblioteca: ItemBiblioteca[]): Promise<{ id: string }> {
  const porId = new Map(biblioteca.map((i) => [i.id, i]));
  const itens = input.exercicios.map((e) => {
    if (!e.biblioteca_id) return { e, item: null };
    const item = porId.get(e.biblioteca_id);
    if (!item) throw new Error("Exercício não encontrado na biblioteca");
    return { e, item };
  });
  const agora = new Date().toISOString();

  if (isDemoMode()) {
    const s = demoStore();
    let treino = input.id ? s.treinos.find((t) => t.id === input.id && t.aluno_id === alunoId && t.autoria === "proprio") : undefined;
    if (input.id && !treino) throw new Error("Treino não encontrado");
    if (!treino) {
      const letra = letraLivre(s.treinos.filter((t) => t.aluno_id === alunoId && t.ativo).map((t) => t.letra));
      if (!letra) throw new Error("Você já tem 8 treinos ativos. Arquive um para criar outro.");
      treino = { id: uid(), aluno_id: alunoId, letra, nome: input.nome, observacoes: null, ordem: LETRAS.indexOf(letra), ativo: true, autoria: "proprio", versao: 1, programa_id: null, created_at: agora, updated_at: agora };
      s.treinos.push(treino);
    } else Object.assign(treino, { nome: input.nome, versao: (treino.versao ?? 1) + 1, updated_at: agora });
    const tid = treino.id;
    const existentes = s.exercicios.filter((x) => x.treino_id === tid && !x.removido_em);
    const mantidos = new Set<string>();
    itens.forEach(({ e, item }, ordem) => {
      const ex = e.id ? existentes.find((x) => x.id === e.id) : undefined;
      if (ex) {
        Object.assign(ex, camposDoExercicio(e, item, ordem), { updated_at: agora });
        mantidos.add(ex.id);
      } else {
        const novo = { id: uid(), treino_id: tid, created_at: agora, updated_at: agora, video_url: null, removido_em: null, ie: null, rir: null, observacoes: null, bloco: null, unilateral: false, cadencia: null, ...camposDoExercicio(e, item, ordem) } as ExercicioPrescrito;
        s.exercicios.push(novo);
        mantidos.add(novo.id);
      }
    });
    for (const x of existentes) if (!mantidos.has(x.id)) x.removido_em = agora;
    return { id: tid };
  }

  const db = await getDb();
  let treinoId: string;
  if (input.id) {
    const { data: atual } = await db.from("treinos").select("id, versao, autoria").eq("id", input.id).eq("aluno_id", alunoId).maybeSingle();
    if (!atual || atual.autoria !== "proprio") throw new Error("Treino não encontrado");
    const { error } = await db.from("treinos").update({ nome: input.nome, versao: (atual.versao ?? 1) + 1 }).eq("id", input.id);
    if (error) throw new Error(`Não foi possível salvar o treino: ${error.message}`);
    treinoId = input.id;
  } else {
    const { data: ativos } = await db.from("treinos").select("letra").eq("aluno_id", alunoId).eq("ativo", true);
    const letra = letraLivre((ativos ?? []).map((t) => t.letra as string));
    if (!letra) throw new Error("Você já tem 8 treinos ativos. Arquive um para criar outro.");
    const { data, error } = await db.from("treinos").insert({ aluno_id: alunoId, letra, nome: input.nome, ordem: LETRAS.indexOf(letra), ativo: true, autoria: "proprio", versao: 1 }).select("id").single();
    if (error || !data) throw new Error(`Não foi possível criar o treino: ${error?.message ?? ""}`);
    treinoId = data.id;
  }

  const { data: existentes } = await db.from("exercicios").select("id").eq("treino_id", treinoId).is("removido_em", null);
  const ids = new Set((existentes ?? []).map((x) => x.id as string));
  const mantidos = new Set<string>();
  for (let ordem = 0; ordem < itens.length; ordem++) {
    const { e, item } = itens[ordem];
    const campos = camposDoExercicio(e, item, ordem);
    if (e.id && ids.has(e.id)) {
      const { error } = await db.from("exercicios").update(campos).eq("id", e.id).eq("treino_id", treinoId);
      if (error) throw new Error(`Não foi possível salvar o exercício: ${error.message}`);
      mantidos.add(e.id);
    } else {
      const { error } = await db.from("exercicios").insert({ treino_id: treinoId, ...campos });
      if (error) throw new Error(`Não foi possível salvar o exercício: ${error.message}`);
    }
  }
  const removidos = [...ids].filter((id) => !mantidos.has(id));
  if (removidos.length) await db.from("exercicios").update({ removido_em: agora }).in("id", removidos);
  return { id: treinoId };
}

/** Tira o treino da lista (ativo=false); o histórico das sessões continua. */
export async function arquivarTreinoProprio(alunoId: string, treinoId: string): Promise<boolean> {
  if (isDemoMode()) {
    const t = demoStore().treinos.find((x) => x.id === treinoId && x.aluno_id === alunoId && x.autoria === "proprio");
    if (!t) return false;
    t.ativo = false;
    return true;
  }
  const db = await getDb();
  const { data, error } = await db.from("treinos").update({ ativo: false }).eq("id", treinoId).eq("aluno_id", alunoId).eq("autoria", "proprio").select("id");
  return !error && (data?.length ?? 0) > 0;
}

export type TreinoProprioResumo = Pick<Treino, "id" | "letra" | "nome"> & { exercicios: Array<Pick<ExercicioPrescrito, "id" | "nome" | "series" | "reps" | "descanso_seg" | "biblioteca_id" | "grupo_muscular">> };
