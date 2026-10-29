// Mobilidade: “Concluir” — o banco confere o tempo mínimo e grava a hora do
// servidor; depois os troféus são recalculados e os novos voltam para comemorar.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { CedoDemais, concluirMobilidade } from "@/lib/data/mobilidade";
import { sincronizarConquistas } from "@/lib/data/conquistas";
import { paraComemorar } from "@/lib/conquistas/comemorar";
import { CODIGOS_MOBILIDADE } from "@/lib/mobilidade/regras";
import { lerJson, mobilidadeConcluirSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, mobilidadeConcluirSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const s = await concluirMobilidade(sessao.alunoId, id, data.nota_depois ?? null, data.feitos ?? null);
    const aluno = await getAluno(sessao.alunoId).catch(() => null);
    const sync = aluno ? await sincronizarConquistas(aluno).catch(() => null) : null;
    // Só os troféus da mobilidade (os outros são comemorados nas telas deles / no Início).
    const comemorar = sync ? paraComemorar(sync.todas, s.iniciado_em, (c) => (CODIGOS_MOBILIDADE as string[]).includes(c)) : [];
    return NextResponse.json({ ok: true, sessao: s, comemorar });
  } catch (e) {
    if (e instanceof CedoDemais) return NextResponse.json({ error: e.message, faltam: e.minutos }, { status: 409 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao concluir" }, { status: 500 });
  }
}
