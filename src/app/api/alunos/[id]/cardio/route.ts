// Personal prescreve, troca (a antiga é desativada, nunca apagada) ou encerra o cardio do aluno.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { desativarPrescricaoCardio, salvarPrescricaoCardio } from "@/lib/data/cardio";
import { desativarPrescricaoCardioSchema, lerJson, prescricaoCardioSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, prescricaoCardioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (!(await getAluno(id))) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  try {
    const { substitui_id, ...p } = data;
    const prescricao = await salvarPrescricaoCardio(id, p, substitui_id ?? null);
    return NextResponse.json({ prescricao }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível salvar" }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, desativarPrescricaoCardioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await desativarPrescricaoCardio(id, data.prescricao_id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível encerrar" }, { status: 400 });
  }
}
