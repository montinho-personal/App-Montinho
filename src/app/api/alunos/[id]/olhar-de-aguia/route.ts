// Olhar de Águia: só o personal ativa, depois de receber o vídeo pelo WhatsApp.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { ativarOlharDeAguia } from "@/lib/data/conquistas";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  if (!/^[\w-]{1,64}$/.test(id) || !(await getAluno(id))) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  try {
    return NextResponse.json({ ok: true, ...(await ativarOlharDeAguia(id)) });
  } catch {
    return NextResponse.json({ error: "Não foi possível ativar agora." }, { status: 500 });
  }
}
