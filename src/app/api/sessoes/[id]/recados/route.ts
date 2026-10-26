// Recados do personal durante este treino (a tela do treino consulta de tempos em tempos).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { recadosDaSessao } from "@/lib/data/ao-vivo";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[\w-]{1,64}$/.test(id)) return NextResponse.json({ error: "Sessão inválida" }, { status: 400 });
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  return NextResponse.json({ recados: await recadosDaSessao(sessao.alunoId, id).catch(() => []) });
}
