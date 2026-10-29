import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { FEATURES, isDemoMode } from "@/lib/env";
import { eventosCta, registrarEventoCta } from "@/lib/data/ctas";
import { getDb } from "@/lib/supabase/rls";
import { agendarLembreteAvaliacao, CTA_AVALIACAO } from "@/lib/visitante/avaliacao";
import { avaliacaoAcaoSchema, lerJson } from "@/lib/validacao/schemas";

const EVENTO = {
  exibido: { cta: CTA_AVALIACAO.pedido, tipo: "exibido" },
  google: { cta: CTA_AVALIACAO.pedido, tipo: "clicado" },
  depois: { cta: CTA_AVALIACAO.pedido, tipo: "dispensado" },
  feita: { cta: CTA_AVALIACAO.feita, tipo: "clicado" },
  sugestao: { cta: CTA_AVALIACAO.sugestao, tipo: "clicado" },
} as const;

/**
 * POST /api/visitante/avaliacao — o que o visitante fez com o pedido de
 * avaliação no Google (0112). No 1º pedido agenda 1 lembrete no celular para o
 * dia seguinte; qualquer resposta descarta o lembrete que ainda não saiu.
 */
export async function POST(request: Request) {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  if (!ehVisitante(sessao) && !isDemoMode()) return NextResponse.json({ error: "Apenas visitantes" }, { status: 403 });
  const { data, error: vErr } = await lerJson(request, avaliacaoAcaoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const lembrete = data.acao === "exibido" ? agendarLembreteAvaliacao(await eventosCta(sessao.alunoId, 60).catch(() => [])) : false;
  await registrarEventoCta(sessao.alunoId, { ...EVENTO[data.acao], tela: data.tela }).catch(() => undefined);
  if (!isDemoMode() && (data.acao !== "exibido" || lembrete)) {
    const db = await getDb();
    await db.rpc("agendar_lembrete_avaliacao", { p_aluno: sessao.alunoId, p_agendar: data.acao === "exibido" });
  }
  return NextResponse.json({ ok: true });
}
