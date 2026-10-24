import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { entrarNoDesafio } from "@/lib/data/desafios";
import { entrarDesafioSchema, lerJson } from "@/lib/validacao/schemas";

/** POST /api/desafios/entrar — entrar num desafio pelo código do link. */
export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, entrarDesafioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    return NextResponse.json({ id: await entrarNoDesafio(sessao.alunoId, data.codigo) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error && /encerrado|cheio|não encontrado/.test(e.message) ? e.message : "Não foi possível entrar agora." }, { status: 400 });
  }
}
