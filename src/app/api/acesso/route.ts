import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { registrarAcesso } from "@/lib/data/acessos";

/** POST /api/acesso — o aluno abriu o app hoje (1 registro por dia; sem corpo). */
export async function POST() {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  try {
    await registrarAcesso(sessao.alunoId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível registrar" }, { status: 500 });
  }
}
