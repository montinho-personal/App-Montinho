// Login sem ficha de aluno (“conta órfã”): a pessoa pediu o link de acesso
// antes de ter cadastro, e o login ficou criado sem nada ligado. Sem isso, o
// cadastro pelo personal ou pelo convite falhava com “e-mail já tem conta”, e a
// pessoa entrava pelo link e voltava para a tela de login (caso da Camilla,
// 28/10/2026). Só vale para perfil de aluno sem nenhuma ficha: nunca personal.
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/** Id do login órfão com esse e-mail, ou null (não existe, é personal ou já tem ficha). */
export async function contaOrfa(admin: Admin, email: string): Promise<string | null> {
  const { data: perfil } = await admin.from("profiles").select("id, role").eq("email", email.trim().toLowerCase()).maybeSingle();
  if (!perfil || perfil.role !== "aluno") return null;
  const { data: ficha } = await admin.from("alunos").select("id").eq("profile_id", perfil.id).maybeSingle();
  return ficha ? null : (perfil.id as string);
}
