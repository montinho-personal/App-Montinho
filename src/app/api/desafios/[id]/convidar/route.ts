import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { convidarParaDesafio } from "@/lib/data/desafios";
import { convidarDesafioSchema, lerJson } from "@/lib/validacao/schemas";

/** POST /api/desafios/[id]/convidar — quem já participa convida outras pessoas pelo nome. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, convidarDesafioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    return NextResponse.json({ convidados: await convidarParaDesafio(sessao.alunoId, id, data.alunos) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error && /encerrado|participa/.test(e.message) ? e.message : "Não foi possível convidar agora." }, { status: 400 });
  }
}
