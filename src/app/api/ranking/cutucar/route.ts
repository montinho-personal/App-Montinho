// Cutucar alguém do ranking (1 por pessoa por dia; aviso no celular pelo canal dos desafios).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { cutucarNoRanking } from "@/lib/data/ranking";
import { cutucarRankingSchema, lerJson } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  if (sessao.comoPersonal) return NextResponse.json({ error: "No “Meu treino” você fica fora do ranking." }, { status: 403 });
  const { data, error: vErr } = await lerJson(request, cutucarRankingSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const ok = await cutucarNoRanking(sessao.alunoId, data.ref, data.emoji);
    return NextResponse.json({ ok, jaHoje: !ok });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não deu para cutucar" }, { status: 500 });
  }
}
