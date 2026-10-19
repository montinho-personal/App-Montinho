import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export async function POST(_req: Request, { params }: { params: Promise<{ treinoId: string }> }) {
  const { user, admin, error } = await requireAuth();
  if (error) return error;

  const { treinoId } = await params;
  const { data: aluno } = await admin!
    .from("alunos")
    .select("id")
    .eq("profile_id", user!.id)
    .maybeSingle();

  if (!aluno) {
    return NextResponse.json({ error: "Perfil de aluno não encontrado" }, { status: 404 });
  }

  const { data: treino } = await admin!
    .from("treinos")
    .select("id, aluno_id")
    .eq("id", treinoId)
    .maybeSingle();

  if (!treino || treino.aluno_id !== aluno.id) {
    return NextResponse.json({ error: "Treino não encontrado para este aluno" }, { status: 404 });
  }

  const finalizadoEm = new Date().toISOString();
  const { error: updateErr } = await admin!
    .from("alunos")
    .update({ ultimo_treino_em: finalizadoEm })
    .eq("id", aluno.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, finalizado_em: finalizadoEm });
}
