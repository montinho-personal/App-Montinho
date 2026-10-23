// Personal: regras de treino extra do aluno e extras liberados.
// PUT = configuração · POST = cria/edita extra · PATCH = ativa/desativa (nunca apaga).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { definirExtraAtivo, salvarConfigExtra, salvarExtra } from "@/lib/data/extras";
import { configExtraSchema, extraAtivoSchema, extraLiberadoSchema, lerJson } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Ctx) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, configExtraSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await salvarConfigExtra(id, { ...data, observacao: data.observacao ?? null });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar as regras" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, extraLiberadoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const { id: extraId, ...resto } = data;
  try {
    const x = await salvarExtra(id, { ...resto, descricao: resto.descricao ?? null, treino_id: resto.treino_id ?? null, ...(resto.exercicios !== undefined ? { exercicios: resto.exercicios } : {}) }, extraId ?? null);
    return NextResponse.json(x);
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar o treino extra" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, extraAtivoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await definirExtraAtivo(id, data.id, data.ativo);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar" }, { status: 500 });
  }
}
