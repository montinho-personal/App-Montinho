// Resumo real da sessão concluída (tela “Chalalá!”) + conquistas desta sessão.
// Recalcula e grava conquistas de forma idempotente (reabrir não duplica).
import { NextResponse } from "next/server";
import { requireAlunoDoTreinoApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { resumoChalala } from "@/lib/data/conquistas";
import { descobertaDaConclusao } from "@/lib/data/desbloqueia";
import { contextosDaConclusao } from "@/lib/desbloqueia/motor";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Aluno no app dele ou personal na aula presencial (aluno validado no servidor).
  const { sessao, error } = await requireAlunoDoTreinoApi(request);
  if (error) return error;
  const aluno = await getAluno(sessao.alunoId);
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  const r = await resumoChalala(aluno, id);
  if (!r) return NextResponse.json({ error: "Sessão não encontrada ou ainda em andamento" }, { status: 404 });
  const descoberta = await descobertaDaConclusao(aluno.id, contextosDaConclusao({ metaCumpridaAgora: r.metaCumpridaAgora, modo: r.modo, recorde: r.recordes.length > 0 || !!r.evolucao?.tipo.startsWith("recorde"), maisReps: r.evolucao?.tipo === "mais_reps" })).catch(() => null);
  return NextResponse.json({ ...r, descoberta });
}
