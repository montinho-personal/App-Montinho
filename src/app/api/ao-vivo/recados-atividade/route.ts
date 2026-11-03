// Recados do personal durante o cardio ou a mobilidade (o cronômetro consulta de tempos em tempos).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { recadosDaAtividade } from "@/lib/data/ao-vivo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^(cardio|mob):[\w-]{1,64}$/.test(id)) return NextResponse.json({ error: "Atividade inválida" }, { status: 400 });
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  return NextResponse.json({ recados: await recadosDaAtividade(sessao.alunoId, id).catch(() => []) });
}
