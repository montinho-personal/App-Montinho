import { NextResponse } from "next/server";
import { requireAlunoDoTreinoApi } from "@/lib/auth/session";
import { atualizarExercicioSessao } from "@/lib/data/sessoes";
import { exercicioSessaoPatchSchema, lerJson } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string; seid: string }> };

/** PATCH — status do exercício na sessão (pulado, não consegui, concluído) e observação do aluno. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id, seid } = await params;
  const { sessao, error } = await requireAlunoDoTreinoApi(request);
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, exercicioSessaoPatchSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const ok = await atualizarExercicioSessao(sessao.alunoId, id, seid, data);
  if (!ok) return NextResponse.json({ error: "Exercício da sessão não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
