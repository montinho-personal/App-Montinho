import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { arquivarExercicio, atualizarExercicio } from "@/lib/data/biblioteca";
import { exercicioBibliotecaSchema, lerJson } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** PUT /api/biblioteca/:id — edita (itens do catálogo editados viram "personalizados"). */
export async function PUT(request: Request, { params }: Ctx) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, exercicioBibliotecaSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    return NextResponse.json(await atualizarExercicio(id, data));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao salvar" }, { status: 500 });
  }
}

/** DELETE /api/biblioteca/:id — arquiva; prescrições existentes não mudam. */
export async function DELETE(_: Request, { params }: Ctx) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  try {
    await arquivarExercicio(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao arquivar" }, { status: 500 });
  }
}
