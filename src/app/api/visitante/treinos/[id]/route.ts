import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { FEATURES, isDemoMode } from "@/lib/env";
import { arquivarTreinoProprio } from "@/lib/data/meus-treinos";

/** DELETE /api/visitante/treinos/[id] — arquiva (ativo=false); o histórico continua. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  if (!ehVisitante(sessao) && !isDemoMode()) return NextResponse.json({ error: "Apenas visitantes" }, { status: 403 });
  const { id } = await params;
  if (!/^[\w-]{1,64}$/.test(id)) return NextResponse.json({ error: "Treino inválido" }, { status: 400 });
  const ok = await arquivarTreinoProprio(sessao.alunoId, id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Treino não encontrado" }, { status: 404 });
}
