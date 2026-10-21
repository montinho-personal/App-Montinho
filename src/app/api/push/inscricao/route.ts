// Inscrição do aparelho para notificações (aluno: lembretes e Chalalá; treinador: teste no próprio celular).
import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { inscricaoPushSchema } from "@/lib/validacao/schemas";

export async function POST(req: Request) {
  if (!(await getSessao())) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const parsed = inscricaoPushSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inscrição inválida" }, { status: 400 });
  if (isDemoMode()) return NextResponse.json({ ok: true, demo: true });
  const db = await getDb();
  const { error: e } = await db.rpc("push_registrar", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.keys.p256dh,
    p_auth: parsed.data.keys.auth,
    p_user_agent: req.headers.get("user-agent"),
  });
  if (e) return NextResponse.json({ error: "Não foi possível ativar os lembretes" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await getSessao())) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : null;
  if (!endpoint) return NextResponse.json({ error: "Endpoint ausente" }, { status: 400 });
  if (isDemoMode()) return NextResponse.json({ ok: true, demo: true });
  const db = await getDb();
  await db.from("push_inscricoes").delete().eq("endpoint", endpoint); // RLS: só as próprias
  return NextResponse.json({ ok: true });
}
