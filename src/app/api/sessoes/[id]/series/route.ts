import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAlunoApi } from "@/lib/auth/session";
import { registrarSerie, removerSerie } from "@/lib/data/sessoes";
import { lerJson, serieSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** POST — registra/atualiza uma série. Mesma client_key → mesma série (sem duplicar). */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, serieSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const set = await registrarSerie(sessao.alunoId, id, data);
    return NextResponse.json(set, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao registrar série";
    const status = /não encontrada|não pertence/i.test(msg) ? 404 : /finalizada/i.test(msg) ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, z.object({ client_key: z.string().min(4).max(80) }));
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const ok = await removerSerie(sessao.alunoId, id, data.client_key);
  return NextResponse.json({ ok });
}
