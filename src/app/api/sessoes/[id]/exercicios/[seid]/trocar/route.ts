import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { trocarExercicioSessao } from "@/lib/data/sessoes";
import { lerJson, trocaExercicioSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string; seid: string }> };

/** POST — o aluno troca o exercício por uma opção liberada (ou volta ao original). */
export async function POST(request: Request, { params }: Ctx) {
  const { id, seid } = await params;
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, trocaExercicioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const se = await trocarExercicioSessao(sessao.alunoId, id, seid, data.biblioteca_id, data.original);
    return NextResponse.json({ ok: true, exercicio: se });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível trocar agora" }, { status: 400 });
  }
}
