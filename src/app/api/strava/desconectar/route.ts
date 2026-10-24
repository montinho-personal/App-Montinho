// Desconecta o Strava: avisa o Strava e apaga as chaves. Os resumos já
// importados continuam no histórico dos treinos.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { desconectar } from "@/lib/data/strava";

export async function POST() {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  try {
    await desconectar(sessao.alunoId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível desconectar" }, { status: 500 });
  }
}
