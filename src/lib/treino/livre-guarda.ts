// Guarda das APIs do treino livre: aluno ou visitante com login, com o acesso
// em dia (visitante vencido não começa treino — a mesma regra do banco, 0052).
import { NextResponse } from "next/server";
import { getSessao, requireAlunoApi, requireAlunoDoTreinoApi } from "@/lib/auth/session";
import { podeRegistrar } from "@/lib/visitante/acesso";

export async function requireAlunoTreinoLivreApi() {
  const { sessao, error } = await requireAlunoApi();
  if (error) return { sessao: null, error } as const;
  if (!podeRegistrar(sessao.modalidade ?? "consultoria", sessao.acessoFim ?? null)) return { sessao: null, error: NextResponse.json({ error: "Seu acesso terminou. Para voltar a treinar pelo app, fale com o Montinho." }, { status: 403 }) } as const;
  return { sessao, error: null } as const;
}

/**
 * Treino livre do aluno OU da aula presencial (12/11/2026, pedido do Montinho: “preciso do
 * treino livre quando dou aula para aluno particular”): o personal manda o cabeçalho com o
 * aluno da aula (o mesmo do treino da ficha); o aluno segue pela regra de sempre.
 */
export async function requireTreinoLivreApi(request: Request) {
  const s = await getSessao();
  if (s && s.role !== "aluno") {
    const r = await requireAlunoDoTreinoApi(request);
    if (r.error) return { sessao: null, error: r.error } as const;
    return { sessao: { alunoId: r.sessao.alunoId, presencial: true as const }, error: null } as const;
  }
  const r = await requireAlunoTreinoLivreApi();
  if (r.error) return { sessao: null, error: r.error } as const;
  return { sessao: { ...r.sessao, presencial: false as const }, error: null } as const;
}
