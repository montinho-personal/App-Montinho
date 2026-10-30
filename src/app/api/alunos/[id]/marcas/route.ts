// POST — o personal anota uma marca do aluno (inclusive o “primeiro movimento técnico”).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { FEATURES } from "@/lib/env";
import { salvarMarca } from "@/lib/data/recordes";
import { lerJson, marcaSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  if (!FEATURES.multimodalidade) return NextResponse.json({ error: "Indisponível" }, { status: 404 });
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, marcaSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    return NextResponse.json(await salvarMarca(id, data, "personal"), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível salvar" }, { status: 500 });
  }
}
