import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { definirConsentimentoPulso, salvarPulso } from "@/lib/data/pulso";
import { lerJson, pulsoSchema } from "@/lib/validacao/schemas";

/** Montinho Pulso do aluno logado: grava as respostas de hoje (e o consentimento, se veio junto). */
export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, pulsoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    if (data.consentimento !== undefined) await definirConsentimentoPulso(sessao.alunoId, data.consentimento);
    const r = await salvarPulso(sessao.alunoId, { respostas: data.respostas, pulou: data.pulou, sessaoId: data.sessao_id ?? null });
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar agora." }, { status: 500 });
  }
}
