// Personal registra um cardio pelo aluno (aula presencial, correção pelo WhatsApp…).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { registrarCardio } from "@/lib/data/cardio";
import { sincronizarConquistas } from "@/lib/data/conquistas";
import { lerJson, registroCardioSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, registroCardioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const aluno = await getAluno(id);
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  try {
    const registro = await registrarCardio(id, data, "personal");
    await sincronizarConquistas(aluno).catch(() => null);
    return NextResponse.json({ registro }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível registrar" }, { status: 400 });
  }
}
