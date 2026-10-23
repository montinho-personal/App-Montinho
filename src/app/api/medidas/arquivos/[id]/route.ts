// Abre um arquivo de avaliação: link temporário (5 min). A RLS decide quem vê.
import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth/session";
import { linkDoArquivo } from "@/lib/data/medidas";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const s = await getSessao();
  if (!s) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  if (!/^[\w-]{1,64}$/.test(id)) return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 });
  const url = await linkDoArquivo(id).catch(() => null);
  if (!url) return NextResponse.json({ error: "Arquivo não encontrado (na demonstração os arquivos não são guardados)." }, { status: 404 });
  return NextResponse.redirect(url);
}
