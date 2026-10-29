// Mobilidade: cancelar a sessão em andamento (não conta; nada é apagado).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { cancelarMobilidade } from "@/lib/data/mobilidade";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  await cancelarMobilidade(sessao.alunoId, id).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
