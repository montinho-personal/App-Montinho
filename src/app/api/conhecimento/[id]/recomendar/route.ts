// Personal recomenda uma descoberta a um aluno (fica disponível na hora).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { getConteudo, recomendarConteudo } from "@/lib/data/desbloqueia";
import { lerJson, recomendarConhecimentoSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, recomendarConhecimentoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const c = await getConteudo(id);
  if (!c) return NextResponse.json({ error: "Conteúdo não encontrado" }, { status: 404 });
  if (c.status !== "publicado") return NextResponse.json({ error: "Publique o conteúdo antes de recomendar." }, { status: 400 });
  try {
    await recomendarConteudo(data.aluno_id, id, sessao.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível recomendar." }, { status: 500 });
  }
}
