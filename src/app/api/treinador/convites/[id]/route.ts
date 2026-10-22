import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { FEATURES, isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { conviteAtivoSchema, lerJson } from "@/lib/validacao/schemas";

/** PATCH /api/treinador/convites/[id] — pausa ou reativa o código (nunca apaga: guarda o histórico). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  const { data: body, error: vErr } = await lerJson(request, conviteAtivoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (isDemoMode()) return NextResponse.json({ ok: true });
  const db = await getDb();
  const { error: dbErr } = await db.from("convites").update({ ativo: body.ativo }).eq("id", id);
  if (dbErr) return NextResponse.json({ error: "Não foi possível alterar o convite." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
