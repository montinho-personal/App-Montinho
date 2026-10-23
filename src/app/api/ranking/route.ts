import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { definirRankingVisivel } from "@/lib/data/ranking";
import { lerJson, rankingVisivelSchema } from "@/lib/validacao/schemas";

/** PUT /api/ranking — o aluno escolhe se aparece (para os outros) no ranking de troféus. */
export async function PUT(request: Request) {
  const { error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, rankingVisivelSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await definirRankingVisivel(data.visivel);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar agora." }, { status: 500 });
  }
}
