// “Por que esse exercício está no meu treino?” — texto do personal (vazio apaga).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { alunoDoExercicio, salvarPorque } from "@/lib/data/desbloqueia";
import { lerJson, porqueExercicioSchema } from "@/lib/validacao/schemas";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, porqueExercicioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const alunoId = await alunoDoExercicio(id);
  if (!alunoId) return NextResponse.json({ error: "Salve o treino antes de escrever o porquê deste exercício." }, { status: 404 });
  try {
    await salvarPorque(id, alunoId, data.texto);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível salvar." }, { status: 500 });
  }
}
