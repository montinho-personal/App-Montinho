// Eventos do “Meu Chalalá” (métricas agregadas). Sem foto, sem texto livre.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { registrarEvento } from "@/lib/data/conquistas";
import { eventoChalalaSchema, lerJson } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, eventoChalalaSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  await registrarEvento(sessao.alunoId, data).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
