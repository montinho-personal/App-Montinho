// Regras dos sinais de acompanhamento do treinador (Central de aderência).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { salvarRegrasAcompanhamento } from "@/lib/data/preferencias";
import { regrasAcompanhamentoSchema } from "@/lib/validacao/schemas";

export async function PUT(req: Request) {
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const parsed = regrasAcompanhamentoSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Valores fora dos limites permitidos" }, { status: 400 });
  try {
    await salvarRegrasAcompanhamento(sessao.userId, parsed.data);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar" }, { status: 500 });
  }
}
