// Aluno: quais extras estão liberados agora (avaliado no servidor).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { avaliarExtras } from "@/lib/data/extras";
import { avaliarExtraSchema, lerJson } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, avaliarExtraSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const r = await avaliarExtras(sessao.alunoId, { recuperacao: data.recuperacao ?? null, tempoDisponivelMin: data.tempo_disponivel_min ?? null });
  return NextResponse.json({ habilitado: !!r.config?.habilitado, itens: r.itens });
}
