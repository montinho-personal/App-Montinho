import { NextResponse } from "next/server";
import { requireAcessoAlunoApi, requireTreinadorApi } from "@/lib/auth/session";
import { criarIntervencao, listIntervencoes } from "@/lib/data/acompanhamento";
import { intervencaoSchema, lerJson } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await requireAcessoAlunoApi(id);
  if (error) return error;
  return NextResponse.json(await listIntervencoes(id));
}

/** POST — registro de decisão/nota do treinador com autoria e data. */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, intervencaoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const i = await criarIntervencao(id, sessao.userId, data);
    return NextResponse.json(i, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao registrar" }, { status: 500 });
  }
}
