import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { revisarEquivalencia } from "@/lib/data/biblioteca";
import { equivalenciaSchema, lerJson } from "@/lib/validacao/schemas";

/** POST /api/biblioteca/equivalencias — o personal aprova, rejeita ou cria uma substituição. */
export async function POST(request: Request) {
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, equivalenciaSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await revisarEquivalencia(sessao.userId, { exercicioId: data.exercicio_id, alternativaId: data.alternativa_id, status: data.status, nota: data.nota ?? null });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao salvar" }, { status: 500 });
  }
}
