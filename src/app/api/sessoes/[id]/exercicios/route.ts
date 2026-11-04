// POST /api/sessoes/[id]/exercicios — “＋ Exercício extra”: entra um exercício
// da biblioteca no treino em andamento (aluno, visitante ou o personal na aula).
import { NextResponse } from "next/server";
import { requireAlunoDoTreinoApi } from "@/lib/auth/session";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { adicionarExercicioExtra } from "@/lib/data/exercicio-extra";
import { ultimasExecucoes } from "@/lib/data/sessoes";
import { exercicioExtraSchema, lerJson } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireAlunoDoTreinoApi(request);
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, exercicioExtraSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const item = (await listarBiblioteca()).find((i) => i.id === data.biblioteca_id) ?? null;
  if (!item) return NextResponse.json({ error: "Exercício não encontrado na biblioteca." }, { status: 404 });
  try {
    const se = await adicionarExercicioExtra(sessao.alunoId, id, { clientKey: data.client_key, item });
    // Última vez que fez esse exercício (pelo nome/biblioteca), para já vir com o peso apagadinho.
    const ultimas = await ultimasExecucoes(sessao.alunoId, [{ id: se.id, nome: se.nome, biblioteca_id: se.biblioteca_id ?? null }]).catch(() => ({}) as Record<string, unknown>);
    return NextResponse.json({ exercicio: se, ultima: (ultimas as Record<string, unknown>)[se.id] ?? null }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível adicionar agora.";
    return NextResponse.json({ error: msg }, { status: /não encontrado/i.test(msg) ? 404 : /finalizado|Limite|livre/i.test(msg) ? 409 : 500 });
  }
}
