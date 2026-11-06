import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { criarIntervencao } from "@/lib/data/acompanhamento";
import { lerJson, palavraRelatorioSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST — o personal salva a “Palavra do Montinho” do relatório de evolução
 * (06/11/2026). Fica numa intervenção visível ao aluno (sem tabela nova), com os
 * textos em `referencia.palavra_relatorio`; o relatório usa a mais recente por 30 dias.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, palavraRelatorioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (!(await getAluno(id))) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  try {
    await criarIntervencao(id, sessao.userId, {
      tipo: "nota",
      titulo: "📄 Recado no seu relatório de evolução",
      descricao: data.frase || data.missao || data.continuar || "O Montinho deixou um recado no seu relatório de evolução.",
      referencia: { palavra_relatorio: data },
      visivel_aluno: true,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao salvar" }, { status: 500 });
  }
}
