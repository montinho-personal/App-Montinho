// Meta semanal do aluno (treinador). Cada alteração cria uma nova versão.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { definirMetaSemanal } from "@/lib/data/aderencia";
import { lerJson, metaSemanalSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, metaSemanalSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await definirMetaSemanal(id, data.meta, data.vigente_desde, data.observacao ?? null);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar a meta" }, { status: 500 });
  }
}
