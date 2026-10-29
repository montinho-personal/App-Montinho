// Cutucadas recebidas no ranking: marcar como vistas.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { verCutucadasRanking } from "@/lib/data/ranking";

export async function POST() {
  const { error } = await requireAlunoApi();
  if (error) return error;
  await verCutucadasRanking().catch(() => undefined);
  return NextResponse.json({ ok: true });
}
