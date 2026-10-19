import { NextResponse } from "next/server";
import { requireTreinador } from "@/lib/api-auth";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { db, error } = await requireTreinador();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const { data, error: dbErr } = await db!
    .from("templates_treino")
    .update({
      nome: body.nome,
      descricao: body.descricao ?? null,
      publico_alvo: body.publico_alvo ?? null,
      numero_treinos: body.numero_treinos ?? Object.keys(body.estrutura ?? {}).length,
      estrutura: body.estrutura,
    })
    .eq("id", id)
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { db, error } = await requireTreinador();
  if (error) return error;

  const { id } = await params;
  const { error: dbErr } = await db!.from("templates_treino").delete().eq("id", id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
