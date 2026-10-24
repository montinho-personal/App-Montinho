// Busca no Strava os cardios novos do aluno (corrida, bike, caminhada…).
// No máximo 1 vez por hora (a não ser com ?forcar=1). Só o próprio aluno.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { sincronizarCardios } from "@/lib/data/strava";

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const forcar = new URL(request.url).searchParams.get("forcar") === "1";
  try {
    return NextResponse.json(await sincronizarCardios(sessao.alunoId, { forcar }));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível falar com o Strava agora" }, { status: 502 });
  }
}
