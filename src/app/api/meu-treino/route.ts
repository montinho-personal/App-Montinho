// “Meu treino” do personal: criar a própria ficha de aluno, entrar no app como
// aluno e voltar ao painel. Só o personal (o banco também só deixa ele criar alunos).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessao, requireTreinadorApi } from "@/lib/auth/session";
import { COMO_ALUNO_COOKIE } from "@/lib/auth/como-aluno";
import { criarMeuAluno, meuAlunoId } from "@/lib/data/meu-treino";

const OPCOES = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 12 };

/** Entra no app do aluno (?ir= caminho do aluno); ?sair=1 → volta ao painel (?para= tela do painel). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  if (url.searchParams.get("sair")) {
    jar.delete(COMO_ALUNO_COOKIE);
    // ?para=/treinador/… → volta ao painel já na tela certa (ex.: montar os próprios treinos).
    const para = url.searchParams.get("para");
    return NextResponse.redirect(new URL(para && /^\/treinador(\/[\w-]+)*$/.test(para) ? para : "/treinador", url));
  }
  const s = await getSessao();
  if (!s || (s.role !== "treinador" && !(s.role === "aluno" && s.comoPersonal))) return NextResponse.redirect(new URL("/login", url));
  if (!(await meuAlunoId(s.userId))) return NextResponse.redirect(new URL("/treinador/meu-treino", url));
  jar.set(COMO_ALUNO_COOKIE, "1", OPCOES);
  // ?ir=/aluno/livre → já cai no treino livre (só caminhos do app do aluno).
  const ir = url.searchParams.get("ir");
  const destino = ir && /^\/aluno(\/[\w-]+)*$/.test(ir) ? ir : "/aluno";
  return NextResponse.redirect(new URL(destino, url));
}

/** Cria a ficha de aluno do personal (uma vez). */
export async function POST() {
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  try {
    const id = await criarMeuAluno(sessao.userId);
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível criar" }, { status: 400 });
  }
}
