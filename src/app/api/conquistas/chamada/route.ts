// Chamada “faça isso agora e ganhe o troféu” no lugar da ação (compartilhar,
// indicar, criar desafio, conectar o relógio…). Só lê; o troféu sai pelas regras de sempre.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { chamadaParaAcao } from "@/lib/data/conquistas";
import { chamadaTrofeuSchema } from "@/lib/validacao/schemas";

export async function GET(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const url = new URL(request.url);
  const p = chamadaTrofeuSchema.safeParse({ acao: url.searchParams.get("acao"), ref: url.searchParams.get("ref") ?? undefined });
  if (!p.success) return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  const chamada = await chamadaParaAcao(sessao, p.data.acao, p.data.ref ?? null).catch(() => null);
  return NextResponse.json({ chamada }, { headers: { "Cache-Control": "no-store" } });
}
