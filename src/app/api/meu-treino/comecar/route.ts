// POST /api/meu-treino/comecar — o personal, no app como aluno (Meu treino),
// começa um treino livre já com os exercícios de um treino pronto da vitrine
// ou do protocolo de um aluno (pedido do Montinho, 04/11/2026). Só o personal:
// aluno comum não vê o protocolo dos outros.
import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth/session";
import { comecarComBase, treinoBasePorChave } from "@/lib/data/treino-base";
import { comecarComBaseSchema, lerJson } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const s = await getSessao();
  if (!s) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (s.role !== "aluno" || !s.comoPersonal) return NextResponse.json({ error: "Só no Meu treino do personal" }, { status: 403 });
  const { data, error } = await lerJson(request, comecarComBaseSchema);
  if (error) return NextResponse.json(error.body, { status: error.status });
  const base = await treinoBasePorChave(data.chave, s.alunoId);
  if (!base) return NextResponse.json({ error: "Esse treino não foi encontrado." }, { status: 404 });
  try {
    const sessao = await comecarComBase(s.alunoId, data.client_key, base);
    return NextResponse.json({ id: sessao.id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível começar agora.";
    return NextResponse.json({ error: msg }, { status: /em andamento/.test(msg) ? 409 : 500 });
  }
}
