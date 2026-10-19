import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAlunoApi } from "@/lib/auth/session";
import { salvarCheckIn } from "@/lib/data/acompanhamento";
import { lerJson } from "@/lib/validacao/schemas";

const nota = z.coerce.number().int().min(1).max(10).nullable().optional();
const schema = z.object({ energia: nota, sono: nota, dor: nota, motivacao: nota, estresse: nota, notas: z.string().trim().max(300).nullable().optional() });

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, schema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const salvo = await salvarCheckIn(sessao.alunoId, data);
    return NextResponse.json(salvo, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao salvar check-in" }, { status: 500 });
  }
}
