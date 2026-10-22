import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { FEATURES, isDemoMode } from "@/lib/env";
import { registrarEventoCta } from "@/lib/data/ctas";
import { ctaEventoSchema, lerJson } from "@/lib/validacao/schemas";

/** POST /api/visitante/cta — convite exibido, tocado ou dispensado (sem dado pessoal). */
export async function POST(request: Request) {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  if (!ehVisitante(sessao) && !isDemoMode()) return NextResponse.json({ error: "Apenas visitantes" }, { status: 403 });
  const { data, error: vErr } = await lerJson(request, ctaEventoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  await registrarEventoCta(sessao.alunoId, data).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
