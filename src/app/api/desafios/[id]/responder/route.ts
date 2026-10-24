import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { responderDesafio } from "@/lib/data/desafios";
import { lerJson, responderDesafioSchema } from "@/lib/validacao/schemas";

/** POST /api/desafios/[id]/responder — aceitar ou recusar um convite recebido. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, responderDesafioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await responderDesafio(sessao.alunoId, id, data.aceitar);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível responder agora." }, { status: 500 });
  }
}
