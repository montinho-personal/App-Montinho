import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { FEATURES, isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { crmConfigSchema, lerJson } from "@/lib/validacao/schemas";
import { urlWebhookValida } from "@/lib/visitante/leads";

/** PUT /api/treinador/crm — endereço de recebimento do CRM e liga/desliga a sincronização. */
export async function PUT(request: Request) {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, crmConfigSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const url = data.webhook_url || null;
  if (url && !urlWebhookValida(url)) return NextResponse.json({ error: "Use o endereço que começa com https:// que o seu CRM (ou o Zapier/Make) te deu." }, { status: 400 });
  if (data.ativo && !url) return NextResponse.json({ error: "Cole o endereço antes de ligar a sincronização." }, { status: 400 });
  if (isDemoMode()) return NextResponse.json({ ok: true });
  const db = await getDb();
  const { error: e } = await db.from("crm_config").update({ webhook_url: url, ativo: data.ativo, updated_at: new Date().toISOString() }).eq("id", 1);
  if (e) return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
