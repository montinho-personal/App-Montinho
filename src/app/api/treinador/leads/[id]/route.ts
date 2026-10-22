import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { FEATURES, isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { lerJson, leadStatusSchema } from "@/lib/validacao/schemas";

/** PUT /api/treinador/leads/[id] — status comercial e anotação do lead (vai para o CRM se a sincronização estiver ligada). */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  if (!/^[\w-]{1,64}$/.test(id)) return NextResponse.json({ error: "Lead inválido" }, { status: 400 });
  const { data, error: vErr } = await lerJson(request, leadStatusSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (isDemoMode()) return NextResponse.json({ ok: true });
  const db = await getDb();
  const { error: e } = await db.from("leads_status").upsert({ aluno_id: id, status: data.status, anotacao: data.anotacao || null, atualizado_por: sessao.userId, updated_at: new Date().toISOString() }, { onConflict: "aluno_id" });
  if (e) return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
