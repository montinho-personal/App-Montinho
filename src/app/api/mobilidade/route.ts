// Mobilidade: “Começar” — cria a sessão com a hora do SERVIDOR (0116).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { iniciarMobilidade } from "@/lib/data/mobilidade";
import { lerJson, mobilidadeIniciarSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, mobilidadeIniciarSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const s = await iniciarMobilidade(sessao.alunoId, data.protocolo, data.nota_antes ?? null);
    return NextResponse.json({ ok: true, id: s.id, iniciado_em: s.iniciado_em });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao começar" }, { status: 500 });
  }
}
