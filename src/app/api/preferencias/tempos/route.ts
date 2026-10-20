// Padrões de tempo do treinador (descansos, s/rep, transição, preparação).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { salvarTemposTreinador } from "@/lib/data/preferencias";
import { temposSchema } from "@/lib/validacao/schemas";

export async function PUT(req: Request) {
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const parsed = temposSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Valores de tempo inválidos" }, { status: 400 });
  try {
    await salvarTemposTreinador(sessao.userId, parsed.data);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar" }, { status: 500 });
  }
}
