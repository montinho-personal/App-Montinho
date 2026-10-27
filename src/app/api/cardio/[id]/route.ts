// Aluno corrige ou exclui (removido_em) um cardio que ele mesmo registrou.
// Troféus já ganhos ficam (regra do app); o registro só deixa de contar daqui em diante.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { corrigirCardio } from "@/lib/data/cardio";
import { correcaoCardioSchema, lerJson } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, correcaoCardioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await corrigirCardio(sessao.alunoId, id, data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível corrigir" }, { status: 400 });
  }
}
