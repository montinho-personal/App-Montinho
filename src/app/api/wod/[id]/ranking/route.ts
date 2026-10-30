// GET — ranking do dia do WOD (o aluno vê o nome curto de quem está no ranking; 0134).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { FEATURES } from "@/lib/env";
import { rankingWodDia } from "@/lib/data/wod-dia";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  if (!FEATURES.multimodalidade) return NextResponse.json({ error: "Indisponível" }, { status: 404 });
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { id } = await params;
  if (!/^[\w-]{1,64}$/.test(id)) return NextResponse.json({ error: "WOD inválido" }, { status: 400 });
  return NextResponse.json({ linhas: await rankingWodDia(id, { alunoId: sessao.alunoId, treinador: false }) });
}
