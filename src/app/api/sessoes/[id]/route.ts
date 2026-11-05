import { NextResponse, after } from "next/server";
import { requireAlunoDoTreinoApi } from "@/lib/auth/session";
import { finalizarSessao, getSessao } from "@/lib/data/sessoes";
import { sincronizarObra } from "@/lib/data/academia";
import { finalizarSessaoSchema, lerJson } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireAlunoDoTreinoApi(request);
  if (error) return error;
  const s = await getSessao(sessao.alunoId, id);
  if (!s) return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
  return NextResponse.json(s);
}

/** PATCH — finaliza (concluída/abandonada) e/ou registra feedback. Idempotente. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireAlunoDoTreinoApi(request);
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, finalizarSessaoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const s = await finalizarSessao(sessao.alunoId, id, data);
    // Academia da Tribo (0146): o banco confere se o treino vale e soma na obra (uma vez só).
    after(() => sincronizarObra(id).catch(() => undefined));
    return NextResponse.json(s);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao finalizar";
    return NextResponse.json({ error: msg }, { status: /não encontrada/i.test(msg) ? 404 : 500 });
  }
}
