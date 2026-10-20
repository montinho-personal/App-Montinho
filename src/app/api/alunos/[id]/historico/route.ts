// Importa o resumo do histórico de outro app (transcrito de prints pelo
// personal). Só o treinador; RLS; idempotente (linhas já gravadas são puladas).
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTreinadorApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { IMPORTACOES } from "@/lib/historico";
import { importarHistoricoResumo } from "@/lib/data/historico";
import { lerJson } from "@/lib/validacao/schemas";
import { normalizarNome } from "@/lib/grupos";

const schema = z.object({ importacao_id: z.string().min(1).max(80) });
type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, schema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const imp = IMPORTACOES.find((i) => i.id === data.importacao_id);
  if (!imp) return NextResponse.json({ error: "Importação não encontrada" }, { status: 404 });
  const aluno = await getAluno(id);
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  if (normalizarNome(aluno.profile?.nome) !== normalizarNome(imp.alunoNome)) return NextResponse.json({ error: `Este histórico é de ${imp.alunoNome}.` }, { status: 409 });
  try {
    const r = await importarHistoricoResumo(id, imp);
    return NextResponse.json({ ok: true, ...r }, { status: r.novas ? 201 : 200 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao importar" }, { status: 500 });
  }
}
