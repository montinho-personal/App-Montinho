// Chave geral e limites do Chalalá no celular (só o treinador).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { salvarConfigChalala } from "@/lib/data/notificacoes";
import { configChalalaSchema, lerJson } from "@/lib/validacao/schemas";

export async function PUT(request: Request) {
  const { error: gErr } = await requireTreinadorApi();
  if (gErr) return gErr;
  const { data, error } = await lerJson(request, configChalalaSchema);
  if (error) return NextResponse.json(error.body, { status: error.status });
  try {
    await salvarConfigChalala(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao salvar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
