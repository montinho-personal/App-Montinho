// O aluno abriu (e talvez respondeu) uma descoberta. “Acertou” é calculado no
// servidor; errar nunca tira nada e o quiz não concede medalha.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { explorarConteudo, getConteudo } from "@/lib/data/desbloqueia";
import { explorarConhecimentoSchema, lerJson } from "@/lib/validacao/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, explorarConhecimentoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const conteudo = await getConteudo(id);
  if (!conteudo || conteudo.status !== "publicado") return NextResponse.json({ error: "Conteúdo não encontrado" }, { status: 404 });
  try {
    const resultado = await explorarConteudo(sessao.alunoId, conteudo, { resposta: data.resposta ?? null, origem: data.origem ?? null });
    return NextResponse.json({ ok: true, resultado });
  } catch (e) {
    // Sem a tabela ainda: o aluno lê normalmente, só o progresso não fica guardado.
    return NextResponse.json({ ok: false, aviso: e instanceof Error ? e.message : "Não foi possível guardar." }, { status: 200 });
  }
}
