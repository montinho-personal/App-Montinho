// Aluno registra um extra de atividade (cardio, mobilidade…) já liberado.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { registrarAtividadeExtra } from "@/lib/data/extras";
import { lerJson, registrarAtividadeExtraSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, registrarAtividadeExtraSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const s = await registrarAtividadeExtra(sessao.alunoId, { extraId: data.extra_id, clientKey: data.client_key, duracaoMin: data.duracao_min, recuperacao: data.recuperacao ?? null });
    return NextResponse.json(s, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível registrar";
    return NextResponse.json({ error: msg }, { status: /não liberado/i.test(msg) ? 409 : 400 });
  }
}
