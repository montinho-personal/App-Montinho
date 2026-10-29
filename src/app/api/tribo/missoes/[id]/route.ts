// Liga/desliga uma missão coletiva (nada é apagado: o histórico fica).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { ativarMissao } from "@/lib/data/tribo";
import { lerJson, triboMissaoAtivaSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, triboMissaoAtivaSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await ativarMissao(id, data.ativa);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao alterar" }, { status: 500 });
  }
}
