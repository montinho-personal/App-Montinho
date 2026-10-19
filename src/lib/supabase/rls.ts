// Cliente AUTENTICADO (anon key + cookies do usuário): todas as consultas de
// páginas e APIs passam por RLS. A chave service_role (admin.ts) fica restrita
// a processos internos explicitamente auditados (convite de aluno, cron).
import { createSupabaseServerClient } from "./server";

export async function getDb() {
  return createSupabaseServerClient();
}
