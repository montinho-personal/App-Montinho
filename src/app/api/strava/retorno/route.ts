// Volta do Strava depois que o aluno autorizou (ou recusou). Confere o
// “state”, troca o código pelas chaves e guarda a conexão (RLS: só dele).
import { NextResponse, type NextRequest } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { salvarConexao, sincronizarCardios } from "@/lib/data/strava";
import { sincronizarConquistas } from "@/lib/data/conquistas";
import { getAluno } from "@/lib/db";
import { trocarCodigo } from "@/lib/strava/cliente";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const fim = (s: string) => {
    const res = NextResponse.redirect(new URL(`/aluno/perfil?strava=${s}#strava`, url.origin));
    res.cookies.delete({ name: "strava_state", path: "/api/strava" });
    res.cookies.delete({ name: "strava_consentimento", path: "/api/strava" });
    return res;
  };
  const { sessao, error } = await requireAlunoApi();
  if (error) return NextResponse.redirect(new URL("/login?next=/aluno/perfil", url.origin));
  if (url.searchParams.get("error")) return fim("negado");
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const consentimento = request.cookies.get("strava_consentimento")?.value;
  if (!state || !code || state !== request.cookies.get("strava_state")?.value || !consentimento) return fim("erro");
  const escopo = url.searchParams.get("scope");
  if (!escopo?.includes("activity:read")) return fim("escopo");
  try {
    const t = await trocarCodigo(code);
    await salvarConexao(sessao.alunoId, t, escopo, consentimento);
    // Troféu “Relógio no Pulso” e os cardios dos últimos 30 dias já na volta.
    const aluno = await getAluno(sessao.alunoId).catch(() => null);
    if (aluno) await sincronizarConquistas(aluno).catch(() => null);
    await sincronizarCardios(sessao.alunoId, { forcar: true }).catch(() => null);
    return fim("ok");
  } catch {
    return fim("erro");
  }
}
