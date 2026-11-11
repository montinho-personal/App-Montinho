// O personal no painel OU no app como aluno (Meu treino): os dois podem cuidar dos Treinos do Montinho.
import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth/session";
import { meuAlunoId } from "@/lib/data/meu-treino";

export async function requirePersonalApi(): Promise<{ meuAluno: string | null; error: NextResponse | null }> {
  const s = await getSessao();
  if (!s) return { meuAluno: null, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (s.role === "treinador") return { meuAluno: await meuAlunoId(s.userId).catch(() => null), error: null };
  if (s.role === "aluno" && s.comoPersonal) return { meuAluno: s.alunoId, error: null };
  return { meuAluno: null, error: NextResponse.json({ error: "Só o personal pode fazer isso" }, { status: 403 }) };
}
