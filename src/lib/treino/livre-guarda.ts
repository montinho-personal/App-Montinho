// Guarda das APIs do treino livre: aluno ou visitante com login, com o acesso
// em dia (visitante vencido não começa treino — a mesma regra do banco, 0052).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { podeRegistrar } from "@/lib/visitante/acesso";

export async function requireAlunoTreinoLivreApi() {
  const { sessao, error } = await requireAlunoApi();
  if (error) return { sessao: null, error } as const;
  if (!podeRegistrar(sessao.modalidade ?? "consultoria", sessao.acessoFim ?? null)) return { sessao: null, error: NextResponse.json({ error: "Seu acesso terminou. Para voltar a treinar pelo app, fale com o Montinho." }, { status: 403 }) } as const;
  return { sessao, error: null } as const;
}
