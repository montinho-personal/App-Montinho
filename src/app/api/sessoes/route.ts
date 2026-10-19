import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { getSessaoEmAndamento, iniciarSessao, listSessoes } from "@/lib/data/sessoes";
import { iniciarSessaoSchema, lerJson } from "@/lib/validacao/schemas";

/** GET /api/sessoes?status=em_andamento|concluida&limite=n — sessões do PRÓPRIO aluno. */
export async function GET(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  if (status === "em_andamento") return NextResponse.json(await getSessaoEmAndamento(sessao.alunoId));
  const limite = Math.min(100, Math.max(1, Number(url.searchParams.get("limite")) || 30));
  return NextResponse.json(await listSessoes(sessao.alunoId, { limite }));
}

/** POST /api/sessoes — inicia (idempotente por client_key). */
export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, iniciarSessaoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const s = await iniciarSessao(sessao.alunoId, { treinoId: data.treino_id, clientKey: data.client_key });
    return NextResponse.json(s, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao iniciar sessão";
    return NextResponse.json({ error: msg }, { status: /não encontrado|não está mais/i.test(msg) ? 404 : 500 });
  }
}
