// Disparado pelo agendador do banco (pg_cron, a cada 5 min) em /api/cron/lembretes: envia o lembrete
// de treino em aberto. Protegido pela chave do agendador (LEMBRETE_CHAVE); o
// banco também confere a mesma chave antes de devolver qualquer dado.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { MINUTOS_SEM_ATIVIDADE, mensagemTreinoAberto, type LembreteDevido } from "@/lib/push/mensagem";

export const dynamic = "force-dynamic";

type Linha = LembreteDevido & { endpoint: string; p256dh: string; auth: string };

export async function POST(req: Request) {
  const chave = process.env.LEMBRETE_CHAVE;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!chave || !publica || !privada || !url || !anon) return NextResponse.json({ error: "Lembretes não configurados" }, { status: 503 });
  if (req.headers.get("x-montinho-chave") !== chave) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // Sem sessão de usuário: o acesso é só às funções protegidas pela chave.
  const db = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.rpc("lembretes_devidos", { p_chave: chave, p_minutos: MINUTOS_SEM_ATIVIDADE });
  if (error) return NextResponse.json({ error: "Falha ao consultar lembretes" }, { status: 500 });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://app-montinho.vercel.app", publica, privada);
  let enviados = 0;
  let falhas = 0;
  for (const l of (data ?? []) as Linha[]) {
    try {
      await webpush.sendNotification({ endpoint: l.endpoint, keys: { p256dh: l.p256dh, auth: l.auth } }, JSON.stringify(mensagemTreinoAberto(l)), { TTL: 60 * 60, urgency: "normal" });
      enviados++;
    } catch (e) {
      falhas++;
      const status = (e as { statusCode?: number }).statusCode;
      // 404/410: o aparelho cancelou a inscrição — não tentar de novo.
      if (status === 404 || status === 410) await db.rpc("push_desativar", { p_chave: chave, p_endpoint: l.endpoint });
    }
  }
  return NextResponse.json({ ok: true, enviados, falhas });
}
