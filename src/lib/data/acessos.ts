// Acessos do dia (0072): o aluno registra que abriu o app (1 vez por dia, pela
// função do banco); o personal vê só os números.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore } from "@/lib/mock/store";
import { diaBrasilia, resumirAcessos, somarDias, type AcessoDia, type ResumoAcessos } from "@/lib/acessos/contar";

function demoAcessos(): Map<string, Set<string>> {
  const g = globalThis as unknown as { __montinhoAcessos?: Map<string, Set<string>> };
  g.__montinhoAcessos ??= new Map();
  return g.__montinhoAcessos;
}

export async function registrarAcesso(alunoId: string): Promise<void> {
  if (isDemoMode()) {
    const m = demoAcessos();
    const dia = diaBrasilia();
    m.set(dia, (m.get(dia) ?? new Set()).add(alunoId));
    return;
  }
  const db = await getDb();
  const { error } = await db.rpc("registrar_acesso");
  if (error) throw new Error(error.message);
}

export async function resumoDeAcessos(): Promise<ResumoAcessos> {
  const hoje = diaBrasilia();
  const desde = somarDias(hoje, -29);
  if (isDemoMode()) {
    // Demonstração: um histórico fictício e estável + os acessos desta execução.
    const alunos = demoStore().alunos;
    const lista: AcessoDia[] = [];
    for (let i = 0; i < 30; i++) {
      const dia = somarDias(hoje, -i);
      alunos.forEach((a, k) => {
        if ((i * 7 + k * 3) % 5 < 3) lista.push({ alunoId: a.id, dia, visitante: a.modalidade === "visitante" });
      });
    }
    for (const [dia, ids] of demoAcessos()) for (const id of ids) lista.push({ alunoId: id, dia, visitante: alunos.find((a) => a.id === id)?.modalidade === "visitante" });
    return resumirAcessos(lista, hoje);
  }
  const db = await getDb();
  const [{ data: acessos }, { data: alunos }] = await Promise.all([
    db.from("acessos_diarios").select("aluno_id, dia").gte("dia", desde).limit(20000),
    db.from("alunos").select("id, modalidade"),
  ]);
  const visitante = new Map((alunos ?? []).map((a) => [a.id as string, a.modalidade === "visitante"]));
  return resumirAcessos(
    (acessos ?? []).map((a) => ({ alunoId: a.aluno_id as string, dia: String(a.dia), visitante: visitante.get(a.aluno_id as string) ?? false })),
    hoje
  );
}
