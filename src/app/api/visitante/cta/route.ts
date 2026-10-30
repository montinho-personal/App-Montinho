import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { FEATURES, isDemoMode } from "@/lib/env";
import { registrarEventoCta } from "@/lib/data/ctas";
import { ctaEventoSchema, lerJson } from "@/lib/validacao/schemas";

/** POST /api/visitante/cta — convite exibido, tocado ou dispensado (sem dado pessoal). Alunos: só as ofertas dos planos. */
export async function POST(request: Request) {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, ctaEventoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  // Aluno da consultoria só registra as ofertas dos planos (conversão por lugar, 30/10/2026);
  // o CRM ignora quem não é visitante. O personal no app como aluno não conta.
  const doPlano = data.cta === "consultoria" || data.cta === "pacote" || data.cta === "presencial";
  if (!ehVisitante(sessao) && !isDemoMode() && (!doPlano || sessao.comoPersonal)) return NextResponse.json({ error: "Apenas visitantes" }, { status: 403 });
  await registrarEventoCta(sessao.alunoId, data).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
