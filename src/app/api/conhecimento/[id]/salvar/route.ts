// O aluno salva (ou tira dos salvos) uma descoberta.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { getConteudo, salvarDescoberta } from "@/lib/data/desbloqueia";
import { lerJson, salvarConhecimentoSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, salvarConhecimentoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (!(await getConteudo(id))) return NextResponse.json({ error: "Conteúdo não encontrado" }, { status: 404 });
  try {
    await salvarDescoberta(sessao.alunoId, id, data.salvo);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível salvar." }, { status: 500 });
  }
}
