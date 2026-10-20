// Marca “Primeiro relatório consultado” (idempotente).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { registrarRelatorioVisto } from "@/lib/data/conquistas";

export async function POST() {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  await registrarRelatorioVisto(sessao.alunoId).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
