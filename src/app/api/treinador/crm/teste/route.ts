import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { FEATURES, isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { entregarWebhook } from "@/lib/crm/entregar";
import { urlWebhookValida } from "@/lib/visitante/leads";

/** POST /api/treinador/crm/teste — manda um lead de exemplo (fictício) para o CRM conferir a ligação. */
export async function POST() {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { error } = await requireTreinadorApi();
  if (error) return error;
  if (isDemoMode()) return NextResponse.json({ ok: true, codigo: 200 });
  const db = await getDb();
  const { data: c } = await db.from("crm_config").select("webhook_url, token").eq("id", 1).maybeSingle();
  if (!c?.webhook_url || !urlWebhookValida(c.webhook_url)) return NextResponse.json({ error: "Salve o endereço do CRM primeiro." }, { status: 400 });
  const r = await entregarWebhook(c.webhook_url, c.token, {
    evento: "teste",
    quando: new Date().toISOString(),
    detalhes: { aviso: "Lead de exemplo enviado pelo botão “Enviar teste”." },
    lead: { id: "00000000-0000-0000-0000-000000000000", nome: "Lead de Teste", email: "teste@exemplo.com", telefone: null, modalidade: "visitante", status: "novo", anotacao: null, convite: "TESTE-0000", origem: "teste", desafio: null, cadastro_em: new Date().toISOString(), acesso_ate: null, objetivo: "hipertrofia", experiencia: "iniciante", frequencia_semanal: 3, local_treino: "academia", quer_desafios: true, treinos_feitos: 0, ultimo_treino: null },
  });
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
