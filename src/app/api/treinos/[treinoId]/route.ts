import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTreinadorApi } from "@/lib/auth/session";
import { arquivarTreino, getTreinoComExercicios } from "@/lib/data/programas";
import { lerJson } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ treinoId: string }> };

/**
 * PATCH /api/treinos/[treinoId] — finalizar/arquivar um treino (ativo:false).
 * Não existe DELETE: exercícios com histórico nunca são apagados.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const { treinoId } = await params;
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, z.object({ ativo: z.literal(false) }));
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const treino = await getTreinoComExercicios(treinoId);
  if (!treino) return NextResponse.json({ error: "Treino não encontrado" }, { status: 404 });
  const ok = await arquivarTreino(treino.aluno_id, treinoId);
  if (!ok) return NextResponse.json({ error: "Treino não encontrado" }, { status: 404 });
  void data;
  return NextResponse.json({ ok: true });
}
