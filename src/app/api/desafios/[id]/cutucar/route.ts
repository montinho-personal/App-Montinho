import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { cutucar } from "@/lib/data/desafios";
import { cutucarSchema, lerJson } from "@/lib/validacao/schemas";

/** POST /api/desafios/[id]/cutucar — provocação com emoji para quem está no mesmo desafio (1 por dia). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, cutucarSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const ok = await cutucar(sessao.alunoId, id, data.para, data.emoji);
    return NextResponse.json({ ok, mensagem: ok ? "Cutucada enviada!" : "Você já cutucou essa pessoa hoje." });
  } catch {
    return NextResponse.json({ error: "Não foi possível cutucar agora." }, { status: 400 });
  }
}
