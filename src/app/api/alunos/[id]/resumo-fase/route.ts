import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { resumoFaseQuerySchema } from "@/lib/validacao/schemas";
import { resumoDaFaseDoAluno, trechosDeFaseDoAluno } from "@/lib/data/resumo-fase";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET — “Copiar resumo da fase” (pedido do Montinho, 14/11/2026): o JSON do
 * período para o Montinho Strategy (formato montinho-resumo-fase). Sem datas,
 * devolve só os períodos das fases para as sugestões. Só o personal.
 */
export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const url = new URL(request.url);
  if (!url.searchParams.get("inicio") && !url.searchParams.get("fim")) {
    return NextResponse.json({ trechos: await trechosDeFaseDoAluno(id).catch(() => []) });
  }
  const v = resumoFaseQuerySchema.safeParse({ inicio: url.searchParams.get("inicio"), fim: url.searchParams.get("fim") });
  if (!v.success) return NextResponse.json({ error: v.error.issues[0]?.message ?? "Datas inválidas" }, { status: 400 });
  try {
    const resumo = await resumoDaFaseDoAluno(id, v.data.inicio, v.data.fim);
    if (!resumo) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
    return NextResponse.json({ resumo });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao montar o resumo" }, { status: 500 });
  }
}
