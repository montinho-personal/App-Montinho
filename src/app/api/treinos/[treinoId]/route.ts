import { NextResponse } from "next/server";
import { requireTreinador } from "@/lib/api-auth";

/** PATCH /api/treinos/[treinoId] — finalizar/arquivar (ativo:false), renomear, obs. */
export async function PATCH(req: Request, { params }: { params: Promise<{ treinoId: string }> }) {
  const { admin, error } = await requireTreinador();
  if (error) return error;

  const { treinoId } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const { data, error: dbErr } = await admin!
    .from("treinos")
    .update({
      ativo: typeof body.ativo === "boolean" ? body.ativo : undefined,
      nome: typeof body.nome === "string" ? body.nome : undefined,
      observacoes: body.observacoes ?? undefined,
    })
    .eq("id", treinoId)
    .select("*")
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}

/** DELETE /api/treinos/[treinoId] — remove treino + exercícios (cascade). */
export async function DELETE(_: Request, { params }: { params: Promise<{ treinoId: string }> }) {
  const { admin, error } = await requireTreinador();
  if (error) return error;

  const { treinoId } = await params;
  const { error: dbErr } = await admin!.from("treinos").delete().eq("id", treinoId);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
