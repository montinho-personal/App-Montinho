// Notificação de teste para os aparelhos do PRÓPRIO usuário (com limite no banco).
import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth/session";
import { enviarTeste } from "@/lib/data/notificacoes";

export async function POST() {
  const s = await getSessao();
  if (!s) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const r = await enviarTeste(s.userId, { treinador: s.role === "treinador" });
  return NextResponse.json(r, { status: r.ok || r.demo ? 200 : 400 });
}
