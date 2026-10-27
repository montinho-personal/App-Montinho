// “Meu treino”: a ficha de aluno do próprio personal (alunos.profile_id = o
// login dele). Criada uma vez pelo próprio personal; fica fora do ranking.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import { dataLocal } from "@/lib/aderencia/calcular";

export async function meuAlunoId(userId: string): Promise<string | null> {
  if (isDemoMode()) return demoStore().alunos.find((a) => a.profile_id === userId)?.id ?? null;
  const db = await getDb();
  const { data } = await db.from("alunos").select("id").eq("profile_id", userId).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function criarMeuAluno(userId: string): Promise<string> {
  const ja = await meuAlunoId(userId);
  if (ja) return ja;
  const agora = new Date().toISOString();
  const linha = { profile_id: userId, status: "ativo" as const, modalidade: "consultoria" as const, ranking_visivel: false, data_inicio: dataLocal(new Date()), objetivo: "Meu treino" };
  if (isDemoMode()) {
    const id = uid();
    demoStore().alunos.push({ id, telefone: null, data_nascimento: null, sexo: null, altura_cm: null, observacoes: null, acesso_ate: null, ultimo_treino_em: null, created_at: agora, updated_at: agora, ...linha });
    return id;
  }
  const db = await getDb();
  const { data, error } = await db.from("alunos").insert(linha).select("id").single();
  if (error) throw new Error(`Não foi possível criar a sua ficha: ${error.message}`);
  return data.id as string;
}
