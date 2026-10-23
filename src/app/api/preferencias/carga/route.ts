import { NextResponse } from "next/server";
import { requireAlunoDoTreinoApi } from "@/lib/auth/session";
import { salvarPadraoCarga } from "@/lib/data/padrao-carga";
import { lerJson, padraoCargaSchema } from "@/lib/validacao/schemas";

/**
 * PUT /api/preferencias/carga — como o aluno anota o peso de anilhas e halteres
 * (total ou por lado). O próprio aluno, ou o personal na aula presencial.
 */
export async function PUT(request: Request) {
  const { sessao, error } = await requireAlunoDoTreinoApi(request);
  if (error) return error;
  const { data: body, error: vErr } = await lerJson(request, padraoCargaSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const padrao = await salvarPadraoCarga(sessao.alunoId, body);
    return NextResponse.json({ ok: true, padrao });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar agora." }, { status: 500 });
  }
}
