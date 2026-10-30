// Resultado dos blocos do WOD/HYROX/circuito (Multimodalidade, 0133).
// GET — os já registrados nesta sessão; POST — grava ou corrige um bloco.
import { after, NextResponse } from "next/server";
import { requireAlunoDoTreinoApi } from "@/lib/auth/session";
import { blocosDaSessao, salvarBlocoSessao, sincronizarCorridaHyrox } from "@/lib/data/wod";
import { lerJson, resultadoBlocoSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireAlunoDoTreinoApi(request);
  if (error) return error;
  return NextResponse.json({ blocos: await blocosDaSessao(sessao.alunoId, id).catch(() => []) });
}

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireAlunoDoTreinoApi(request);
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, resultadoBlocoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const r = await salvarBlocoSessao(sessao.alunoId, id, data);
    // HYROX: a corrida vira 1 cardio ligado à sessão (decisão 4), sem atrasar a resposta.
    if (data.tipo === "corrida") after(() => sincronizarCorridaHyrox(sessao.alunoId, id).catch(() => undefined));
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível salvar o resultado";
    const status = /não encontrada/i.test(msg) ? 404 : /terminou/i.test(msg) ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
