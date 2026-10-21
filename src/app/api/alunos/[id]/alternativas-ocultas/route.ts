// Personal: oculta (ou volta a mostrar) uma alternativa de troca só para este aluno.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { definirAlternativaOculta } from "@/lib/data/alternativas-ocultas";
import { alternativaOcultaSchema, lerJson } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Ctx) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, alternativaOcultaSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await definirAlternativaOculta(id, { exercicio_id: data.exercicio_id, alternativa_id: data.alternativa_id }, data.oculta);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar" }, { status: 500 });
  }
}
