import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { responderAdaptacao } from "@/lib/data/acompanhamento";
import { lerJson, responderAdaptacaoSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH — treinador responde ao pedido (gera intervenção visível ao aluno). */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, responderAdaptacaoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const a = await responderAdaptacao(id, sessao.userId, data.resposta, data.status);
  if (!a) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  return NextResponse.json(a);
}
