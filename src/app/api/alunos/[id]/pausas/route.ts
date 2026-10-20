// Pausas justificadas do aluno (treinador): registrar e encerrar.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { encerrarPausa, registrarPausa } from "@/lib/data/aderencia";
import { encerrarPausaSchema, lerJson, pausaSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, pausaSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await registrarPausa(id, { inicio: data.inicio, fim: data.fim ?? null, tipo: data.tipo, motivo: data.motivo ?? null });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível registrar a pausa" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, encerrarPausaSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await encerrarPausa(id, data.pausa_id, data.fim);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível encerrar a pausa" }, { status: 500 });
  }
}
