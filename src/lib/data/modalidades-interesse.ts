// O que a pessoa gosta de treinar (0137). O aluno grava a própria lista pela
// RPC salvar_minhas_modalidades (nunca a de outra pessoa); o personal lê pela
// RLS de alunos. Sem a 0137 no banco, tudo vem vazio e nada trava.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore } from "@/lib/mock/store";
import { normalizarInteresse } from "@/lib/modalidades/interesse";
import type { ModalidadeTreino } from "@/lib/modalidades/tipos";

export async function modalidadesDoAluno(alunoId: string): Promise<ModalidadeTreino[]> {
  if (isDemoMode()) return normalizarInteresse(demoStore().alunos.find((a) => a.id === alunoId)?.modalidades_interesse);
  const db = await getDb();
  const { data, error } = await db.from("alunos").select("modalidades_interesse").eq("id", alunoId).maybeSingle();
  if (error) return [];
  return normalizarInteresse((data as { modalidades_interesse?: string[] } | null)?.modalidades_interesse);
}

export async function salvarMinhasModalidades(alunoId: string, lista: string[]): Promise<ModalidadeTreino[]> {
  const v = normalizarInteresse(lista);
  if (isDemoMode()) {
    const a = demoStore().alunos.find((x) => x.id === alunoId);
    if (a) a.modalidades_interesse = v;
    return v;
  }
  const db = await getDb();
  const { data, error } = await db.rpc("salvar_minhas_modalidades", { p_modalidades: v });
  if (error) throw new Error(/salvar_minhas_modalidades/.test(error.message) ? "Essa escolha está sendo ativada no banco (0137)." : error.message);
  if (data === false) throw new Error("Não foi possível salvar agora.");
  return v;
}
