import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { FEATURES, isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { lerJson, perfilVisitanteSchema } from "@/lib/validacao/schemas";

/** PUT /api/visitante/perfil — respostas do questionário inicial do visitante (RLS: só o próprio). */
export async function PUT(request: Request) {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  if (!ehVisitante(sessao) && !isDemoMode()) return NextResponse.json({ error: "Apenas visitantes" }, { status: 403 });
  const { data: body, error: vErr } = await lerJson(request, perfilVisitanteSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (isDemoMode()) return NextResponse.json({ ok: true });

  const db = await getDb();
  const agora = new Date().toISOString();
  const { error: dbErr } = await db
    .from("perfil_visitante")
    .upsert({ aluno_id: sessao.alunoId, ...body, onboarding_concluido_em: agora, updated_at: agora }, { onConflict: "aluno_id" });
  if (dbErr) return NextResponse.json({ error: "Não foi possível salvar agora." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
