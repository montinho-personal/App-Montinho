// Modelos de mensagem do WhatsApp do personal (Central de aderência e Montinho Pulso).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { salvarModelosMensagem } from "@/lib/data/preferencias";
import { modelosMensagemSchema } from "@/lib/validacao/schemas";

export async function PUT(req: Request) {
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const parsed = modelosMensagemSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Modelo inválido" }, { status: 400 });
  try {
    await salvarModelosMensagem(sessao.userId, parsed.data);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar" }, { status: 500 });
  }
}
