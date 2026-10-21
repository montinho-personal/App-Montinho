// Registra que a pessoa tocou na notificação (só a própria; sem dado pessoal).
import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth/session";
import { marcarAberta } from "@/lib/data/notificacoes";
import { aberturaNotificacaoSchema, lerJson } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const s = await getSessao();
  if (!s) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { data, error } = await lerJson(request, aberturaNotificacaoSchema);
  if (error) return NextResponse.json(error.body, { status: error.status });
  await marcarAberta(data.id).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
