// Personal coloca a mobilidade no protocolo do aluno (protocolos + dias por
// semana), troca ou desliga (vale por cima do que a anamnese indica). 0119.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { salvarPrescricaoMobilidade } from "@/lib/data/mobilidade-indicada";
import { lerJson, mobilidadePrescreverSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, mobilidadePrescreverSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (!(await getAluno(id))) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  try {
    await salvarPrescricaoMobilidade(id, { protocolos: [...new Set(data.protocolos)], dias_semana: data.dias_semana, motivo: data.motivo?.trim() || null, ativo: data.ativo });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível salvar" }, { status: 400 });
  }
}
