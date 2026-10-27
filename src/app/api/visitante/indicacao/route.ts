import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { FEATURES } from "@/lib/env";
import { meuCodigoIndicacao } from "@/lib/data/campanhas";

/**
 * POST /api/visitante/indicacao — código pessoal do convite de amigo (0068/0102).
 * Sem corpo: a identidade vem da sessão e o banco confere as regras
 * (aluno, ou visitante com 4+ treinos concluídos). Devolve o código e o link.
 */
export async function POST(request: Request) {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  // Aluno (0102) ou visitante: o banco confere quem pode (visitante só com 4+ treinos).
  if (sessao.comoPersonal) return NextResponse.json({ error: "No “Meu treino” não há convite de indicação." }, { status: 403 });
  const codigo = await meuCodigoIndicacao().catch(() => null);
  if (!codigo) return NextResponse.json({ error: sessao.modalidade === "visitante" ? "O convite libera a partir do 4º treino concluído." : "Não foi possível gerar o seu convite agora." }, { status: 409 });
  const base = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? base.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? base.host;
  return NextResponse.json({ codigo, link: `${proto}://${host}/convite/${codigo}` });
}
