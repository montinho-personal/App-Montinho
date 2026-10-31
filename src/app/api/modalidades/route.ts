// POST — o aluno escolhe o que gosta de treinar (0137). Só a própria lista.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { FEATURES } from "@/lib/env";
import { salvarMinhasModalidades } from "@/lib/data/modalidades-interesse";
import { lerJson, modalidadesInteresseSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  if (!FEATURES.multimodalidade) return NextResponse.json({ error: "Indisponível" }, { status: 404 });
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, modalidadesInteresseSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    return NextResponse.json({ modalidades: await salvarMinhasModalidades(sessao.alunoId, data.modalidades) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível salvar" }, { status: 500 });
  }
}
