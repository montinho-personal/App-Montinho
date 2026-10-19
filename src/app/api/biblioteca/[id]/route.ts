import { NextResponse } from "next/server";
import { requireTreinador } from "@/lib/api-auth";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireTreinador();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const { data, error: dbErr } = await admin!
    .from("exercicios_biblioteca")
    .update({
      nome: body.nome,
      grupo_muscular: body.grupo_muscular,
      grupos_secundarios: body.grupos_secundarios ?? [],
      equipamento: body.equipamento ?? [],
      video_provider: body.video_provider ?? null,
      video_id: body.video_id ?? null,
      descricao: body.descricao ?? null,
      instrucoes: body.instrucoes ?? [],
      observacoes: body.observacoes ?? null,
      dificuldade: body.dificuldade ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireTreinador();
  if (error) return error;

  const { id } = await params;
  const { error: dbErr } = await admin!
    .from("exercicios_biblioteca")
    .update({ arquivado: true })
    .eq("id", id);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
