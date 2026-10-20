// Aluno pede liberação de um extra ao personal (idempotente por client_key).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { criarSolicitacao } from "@/lib/data/extras";
import { lerJson, solicitarExtraSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, solicitarExtraSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const s = await criarSolicitacao(sessao.alunoId, { extraId: data.extra_id, clientKey: data.client_key, recuperacao: data.recuperacao ?? null, tempoDisponivelMin: data.tempo_disponivel_min ?? null, mensagem: data.mensagem ?? null });
    return NextResponse.json(s, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível enviar o pedido" }, { status: 400 });
  }
}
