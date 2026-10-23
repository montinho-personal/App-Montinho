// Guarda das APIs do montador do visitante: Modo Visitante ligado, login de
// aluno visitante (ou demonstração) e acesso em dia.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { FEATURES, isDemoMode } from "@/lib/env";
import { podeRegistrar } from "@/lib/visitante/acesso";

export async function requireVisitanteEmDiaApi() {
  if (!FEATURES.modoVisitante) return { sessao: null, error: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) } as const;
  const { sessao, error } = await requireAlunoApi();
  if (error) return { sessao: null, error } as const;
  if (!ehVisitante(sessao) && !isDemoMode()) return { sessao: null, error: NextResponse.json({ error: "Seus treinos são montados pelo Montinho." }, { status: 403 }) } as const;
  if (!podeRegistrar(sessao.modalidade ?? "consultoria", sessao.acessoFim ?? null)) return { sessao: null, error: NextResponse.json({ error: "Seu acesso terminou. Para voltar a montar treinos, fale com o Montinho." }, { status: 403 }) } as const;
  return { sessao, error: null } as const;
}
