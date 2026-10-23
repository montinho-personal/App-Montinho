// PATCH /api/livre/[id]/exercicios/[seid] — técnica e anotação do exercício no treino livre.
import { NextResponse } from "next/server";
import { ajustarExercicioLivre } from "@/lib/data/livre";
import { requireAlunoTreinoLivreApi } from "@/lib/treino/livre-guarda";
import { lerJson, livreAjusteSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string; seid: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id, seid } = await params;
  const { sessao, error } = await requireAlunoTreinoLivreApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, livreAjusteSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const ok = await ajustarExercicioLivre(sessao.alunoId, id, seid, { tecnica: data.tecnica, ...(data.observacao !== undefined ? { observacao: data.observacao } : {}) });
    return ok ? NextResponse.json({ ok }) : NextResponse.json({ error: "Exercício não encontrado" }, { status: 404 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível salvar agora.";
    return NextResponse.json({ error: msg }, { status: /não encontrado/i.test(msg) ? 404 : /finalizado/.test(msg) ? 409 : 500 });
  }
}
