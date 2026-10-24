// Batimento do relógio para um treino: busca no Strava (se conectado) a
// atividade no horário do treino e guarda o resumo. Só o próprio aluno.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { sincronizarSessao } from "@/lib/data/strava";
import { idSessaoStravaSchema } from "@/lib/validacao/schemas";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const v = idSessaoStravaSchema.safeParse((await params).id);
  if (!v.success) return NextResponse.json({ error: "Treino inválido" }, { status: 400 });
  try {
    return NextResponse.json(await sincronizarSessao(sessao.alunoId, v.data));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível falar com o Strava agora" }, { status: 502 });
  }
}
