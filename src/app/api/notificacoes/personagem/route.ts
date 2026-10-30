// GET /api/notificacoes/personagem — o recado do personagem do dia (só leitura, pelo login do aluno).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { recadoPersonagemDoAluno } from "@/lib/data/recado-personagem";

export async function GET() {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const recado = await recadoPersonagemDoAluno(sessao.alunoId).catch(() => null);
  return NextResponse.json({ recado, agora: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
}
