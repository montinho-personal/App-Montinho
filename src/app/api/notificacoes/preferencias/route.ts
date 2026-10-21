// Preferências de notificação do PRÓPRIO usuário (aluno ou treinador).
import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth/session";
import { getPreferencias, salvarPreferencias } from "@/lib/data/notificacoes";
import { lerJson, preferenciasNotificacaoSchema } from "@/lib/validacao/schemas";

export async function GET() {
  const s = await getSessao();
  if (!s) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  return NextResponse.json(await getPreferencias(s.userId));
}

export async function PUT(request: Request) {
  const s = await getSessao();
  if (!s) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { data, error } = await lerJson(request, preferenciasNotificacaoSchema);
  if (error) return NextResponse.json(error.body, { status: error.status });
  try {
    await salvarPreferencias(s.userId, data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao salvar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
