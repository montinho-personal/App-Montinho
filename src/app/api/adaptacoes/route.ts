import { NextResponse } from "next/server";
import { getSessao, requireAlunoApi } from "@/lib/auth/session";
import { criarAdaptacao, listAdaptacoes } from "@/lib/data/acompanhamento";
import { adaptacaoSchema, lerJson } from "@/lib/validacao/schemas";

/** GET — treinador: todas (ou abertas); aluno: só as suas. */
export async function GET(request: Request) {
  const s = await getSessao();
  if (!s) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const abertas = new URL(request.url).searchParams.get("abertas") === "1";
  const lista = s.role === "treinador" ? await listAdaptacoes(undefined, abertas) : await listAdaptacoes(s.alunoId, abertas);
  return NextResponse.json(lista);
}

/** POST — aluno pede adaptação ("não consegui este exercício"). */
export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, adaptacaoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const a = await criarAdaptacao(sessao.alunoId, {
      session_id: data.session_id ?? null,
      session_exercise_id: data.session_exercise_id ?? null,
      exercicio_id: data.exercicio_id ?? null,
      exercicio_nome: data.exercicio_nome ?? null,
      motivo: data.motivo,
      descricao: data.descricao ?? null,
    });
    return NextResponse.json(a, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao registrar pedido" }, { status: 500 });
  }
}
