// Resumo real da sessão concluída (tela “Chalalá!”) + conquistas desta sessão.
// Recalcula e grava conquistas de forma idempotente (reabrir não duplica).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { resumoChalala } from "@/lib/data/conquistas";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const aluno = await getAluno(sessao.alunoId);
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  const r = await resumoChalala(aluno, id);
  if (!r) return NextResponse.json({ error: "Sessão não encontrada ou ainda em andamento" }, { status: 404 });
  return NextResponse.json(r);
}
