import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { FEATURES, isDemoMode } from "@/lib/env";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { salvarTreinoProprio } from "@/lib/data/meus-treinos";
import { lerJson, treinoProprioSchema } from "@/lib/validacao/schemas";
import { podeRegistrar } from "@/lib/visitante/acesso";

/** POST /api/visitante/treinos — cria ou edita um treino do próprio visitante. */
export async function POST(request: Request) {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  if (!ehVisitante(sessao) && !isDemoMode()) return NextResponse.json({ error: "Seus treinos são montados pelo Montinho." }, { status: 403 });
  if (!podeRegistrar(sessao.modalidade ?? "consultoria", sessao.acessoFim ?? null)) return NextResponse.json({ error: "Seu acesso terminou. Para voltar a montar treinos, fale com o Montinho." }, { status: 403 });
  const { data: body, error: vErr } = await lerJson(request, treinoProprioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const r = await salvarTreinoProprio(sessao.alunoId, body, await listarBiblioteca());
    return NextResponse.json(r, { status: body.id ? 200 : 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível salvar o treino.";
    return NextResponse.json({ error: msg }, { status: /não encontrado/i.test(msg) ? 404 : /8 treinos/.test(msg) ? 409 : 500 });
  }
}
