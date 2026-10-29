// Perfil de quem está no ranking: troféus e fatores de desempate (0117).
// O banco decide quem pode ver quem (a mesma regra da lista do ranking).
import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth/session";
import { perfilRanking } from "@/lib/data/ranking";

type Ctx = { params: Promise<{ ref: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { ref } = await params;
  const sessao = await getSessao();
  if (!sessao) return NextResponse.json({ error: "Entre no app." }, { status: 401 });
  if (!/^[A-Za-z0-9-]{1,64}$/.test(ref)) return NextResponse.json({ error: "Pessoa inválida." }, { status: 400 });
  const p = await perfilRanking(ref, sessao.role === "aluno" ? sessao.alunoId : null).catch(() => null);
  if (!p) return NextResponse.json({ error: "Perfil indisponível." }, { status: 404 });
  return NextResponse.json({ ok: true, perfil: p });
}
