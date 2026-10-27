// Placar da semana do protocolo livre (por metas) (o treino em andamento entra na conta).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { placarDoAluno } from "@/lib/data/livre-metas";

export async function GET(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const id = new URL(request.url).searchParams.get("sessao");
  const p = await placarDoAluno(sessao.alunoId, id && /^[\w-]{1,64}$/.test(id) ? id : null).catch(() => null);
  return NextResponse.json(p ?? { placar: [], sugestao: null });
}
