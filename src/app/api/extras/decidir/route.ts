// Personal aprova ou recusa um pedido de treino extra.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { decidirSolicitacao } from "@/lib/data/extras";
import { decidirExtraSchema, lerJson } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, decidirExtraSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await decidirSolicitacao(data.id, data.status, data.resposta ?? null);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível registrar a decisão" }, { status: 500 });
  }
}
