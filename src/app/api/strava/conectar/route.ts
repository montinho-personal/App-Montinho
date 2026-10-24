// Começa a conexão com o Strava: só com o consentimento marcado na tela (dado
// de saúde, LGPD art. 11). Guarda um “state” num cookie para conferir na volta.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/env";
import { conectarDemo } from "@/lib/data/strava";
import { sincronizarConquistas } from "@/lib/data/conquistas";
import { getAluno } from "@/lib/db";
import { stravaConfigurado, urlAutorizar } from "@/lib/strava/cliente";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const perfil = (s: string) => NextResponse.redirect(new URL(`/aluno/perfil?strava=${s}#strava`, url.origin));
  const { sessao, error } = await requireAlunoApi();
  if (error) return NextResponse.redirect(new URL("/login?next=/aluno/perfil", url.origin));
  if (url.searchParams.get("consentimento") !== "1") return perfil("consentimento");
  if (isDemoMode()) {
    await conectarDemo(sessao.alunoId);
    const aluno = await getAluno(sessao.alunoId).catch(() => null);
    if (aluno) await sincronizarConquistas(aluno).catch(() => null);
    return perfil("ok");
  }
  if (!stravaConfigurado()) return perfil("indisponivel");
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(urlAutorizar(`${url.origin}/api/strava/retorno`, state));
  const opts = { httpOnly: true, secure: url.protocol === "https:", sameSite: "lax" as const, path: "/api/strava", maxAge: 600 };
  res.cookies.set("strava_state", state, opts);
  res.cookies.set("strava_consentimento", new Date().toISOString(), opts);
  return res;
}
