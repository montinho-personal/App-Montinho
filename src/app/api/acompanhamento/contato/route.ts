// Central de aderência: o personal confirmou que enviou a mensagem no WhatsApp.
// Fica na linha do tempo do aluno (sem o texto da mensagem). Abrir o WhatsApp
// sozinho não registra nada.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { criarIntervencao } from "@/lib/data/acompanhamento";
import { contatoAcompanhamentoSchema, lerJson } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, contatoAcompanhamentoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await criarIntervencao(data.aluno_id, sessao.userId, { tipo: "contato", titulo: "Contato pelo WhatsApp", descricao: "Mensagem enviada pelo WhatsApp a partir da Central de aderência.", referencia: { origem: "aderencia", motivo: data.motivo }, visivel_aluno: false });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível registrar agora." }, { status: 500 });
  }
}
