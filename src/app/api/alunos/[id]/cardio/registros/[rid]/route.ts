// Personal corrige ou exclui (removido_em) um cardio do aluno.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { corrigirCardio } from "@/lib/data/cardio";
import { correcaoCardioSchema, lerJson } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string; rid: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id, rid } = await params;
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, correcaoCardioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await corrigirCardio(id, rid, data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível corrigir" }, { status: 400 });
  }
}
