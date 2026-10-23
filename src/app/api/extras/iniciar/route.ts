// Aluno começa um treino extra que o personal aprovou com exercícios (0073).
// O servidor confere de novo a liberação (dor, 48 h, dias, limites).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { iniciarExtraAprovado } from "@/lib/data/extra-gerado";
import { iniciarExtraAprovadoSchema, lerJson } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, iniciarExtraAprovadoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const s = await iniciarExtraAprovado(sessao.alunoId, { extraId: data.extra_id, clientKey: data.client_key, recuperacao: data.recuperacao ?? null });
    return NextResponse.json({ id: s.id, treinoId: s.treino_id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível começar o extra";
    return NextResponse.json({ error: msg }, { status: /não disponível|não liberado|não encontrado|não tem exercícios/i.test(msg) ? 409 : 500 });
  }
}
