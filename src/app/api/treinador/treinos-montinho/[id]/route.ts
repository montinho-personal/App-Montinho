// PATCH /api/treinador/treinos-montinho/[id] — título, foco, narrativa, publicar/esconder ou arquivar.
import { NextResponse } from "next/server";
import { requirePersonalApi } from "@/lib/auth/personal-ou-meu-treino";
import { atualizarTreinoMontinho } from "@/lib/data/treinos-montinho";
import { lerJson, treinoMontinhoAtualizarSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await requirePersonalApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, treinoMontinhoAtualizarSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const ok = await atualizarTreinoMontinho(id, data);
    return ok ? NextResponse.json({ ok }) : NextResponse.json({ error: "Treino não encontrado" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível salvar agora." }, { status: 500 });
  }
}
