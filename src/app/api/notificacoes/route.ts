// GET /api/notificacoes — a lista do 🔔 do aluno (só leitura, pelo login dele).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { centralDoAluno } from "@/lib/data/central-notificacoes";

export async function GET() {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const itens = await centralDoAluno({ alunoId: sessao.alunoId, userId: sessao.userId }).catch(() => []);
  return NextResponse.json({ itens, agora: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
}
