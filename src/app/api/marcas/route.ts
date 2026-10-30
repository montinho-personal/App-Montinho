// POST — o aluno anota uma marca pessoal (1RM testado, máx. reps…). “Primeiro movimento técnico” só o personal.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { FEATURES } from "@/lib/env";
import { salvarMarca } from "@/lib/data/recordes";
import { lerJson, marcaSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  if (!FEATURES.multimodalidade) return NextResponse.json({ error: "Indisponível" }, { status: 404 });
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, marcaSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (data.tipo === "primeiro") return NextResponse.json({ error: "O primeiro movimento técnico é registrado pelo Montinho." }, { status: 403 });
  try {
    return NextResponse.json(await salvarMarca(sessao.alunoId, data, "aluno"), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível salvar" }, { status: 500 });
  }
}
