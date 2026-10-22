// Índice da lupa do personal: alunos + programa e treinos ativos (RLS: só o treinador lê todos).
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore } from "@/lib/mock/store";
import { mockProfiles } from "@/lib/mock/db";
import type { AlunoIndice } from "@/lib/busca/alunos";

type LinhaEx = { nome: string; tecnica: string | null; removido_em: string | null; ordem: number };
type LinhaTreino = { letra: string; nome: string; ativo: boolean; ordem: number; exercicios: LinhaEx[] | null };
type Linha = {
  id: string;
  status: string;
  modalidade: string | null;
  profile: { nome: string | null } | null;
  treinos: LinhaTreino[] | null;
  programas: Array<{ nome: string | null; split: string | null; objetivo: string | null; ativo: boolean }> | null;
};

const treinosAtivos = (ts: LinhaTreino[]) =>
  ts
    .filter((t) => t.ativo)
    .sort((a, b) => a.ordem - b.ordem || a.letra.localeCompare(b.letra))
    .map((t) => ({ letra: t.letra, nome: t.nome, exercicios: (t.exercicios ?? []).filter((e) => !e.removido_em).sort((a, b) => a.ordem - b.ordem).map((e) => ({ nome: e.nome, tecnica: e.tecnica })) }));

export async function indiceBusca(): Promise<AlunoIndice[]> {
  if (isDemoMode()) {
    const s = demoStore();
    return s.alunos.map((a) => {
      const prog = s.programas.find((p) => p.aluno_id === a.id && p.ativo);
      return {
        id: a.id,
        nome: mockProfiles.find((p) => p.id === a.profile_id)?.nome ?? "Aluno",
        status: a.status,
        modalidade: a.modalidade === "visitante" ? "visitante" : "consultoria",
        programa: prog ? { nome: prog.nome, split: prog.split, objetivo: prog.objetivo } : null,
        treinos: treinosAtivos(s.treinos.filter((t) => t.aluno_id === a.id).map((t) => ({ letra: t.letra, nome: t.nome, ativo: t.ativo, ordem: t.ordem, exercicios: s.exercicios.filter((e) => e.treino_id === t.id).map((e) => ({ nome: e.nome, tecnica: e.tecnica ?? null, removido_em: e.removido_em, ordem: e.ordem })) }))),
      };
    });
  }
  const db = await getDb();
  const { data } = await db
    .from("alunos")
    .select("id, status, modalidade, profile:profiles(nome), treinos!treinos_aluno_id_fkey(letra, nome, ativo, ordem, exercicios!exercicios_treino_id_fkey(nome, tecnica, removido_em, ordem)), programas!programas_aluno_id_fkey(nome, split, objetivo, ativo)")
    .limit(1000);
  return ((data ?? []) as unknown as Linha[]).map((a) => {
    const prog = (a.programas ?? []).find((p) => p.ativo) ?? null;
    return {
      id: a.id,
      nome: a.profile?.nome ?? "Aluno",
      status: a.status,
      modalidade: a.modalidade === "visitante" ? "visitante" : "consultoria",
      programa: prog ? { nome: prog.nome, split: prog.split, objetivo: prog.objetivo } : null,
      treinos: treinosAtivos(a.treinos ?? []),
    };
  });
}
