import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { FEATURES, isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { lerJson, whatsappVisitanteSchema } from "@/lib/validacao/schemas";

/**
 * PUT /api/visitante/whatsapp — visitante que se cadastrou antes do WhatsApp
 * obrigatório informa o número. A função do banco (0063) grava só no próprio
 * cadastro e só quando ainda está vazio.
 */
export async function PUT(request: Request) {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  if (!ehVisitante(sessao) && !isDemoMode()) return NextResponse.json({ error: "Apenas visitantes" }, { status: 403 });
  const { data: body, error: vErr } = await lerJson(request, whatsappVisitanteSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (isDemoMode()) return NextResponse.json({ ok: true });

  const db = await getDb();
  const { error: dbErr } = await db.rpc("salvar_meu_whatsapp", { p_telefone: body.whatsapp });
  if (dbErr) return NextResponse.json({ error: "Não foi possível salvar agora." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
