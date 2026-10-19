import { NextResponse } from "next/server";
import { requireTreinador } from "@/lib/api-auth";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireTreinador();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  // Atualiza aluno
  const { data, error: dbErr } = await admin!
    .from("alunos")
    .update({
      telefone: body.telefone ?? null,
      data_nascimento: body.data_nascimento ?? null,
      sexo: body.sexo ?? null,
      altura_cm: body.altura_cm ?? null,
      objetivo: body.objetivo ?? null,
      observacoes: body.observacoes ?? null,
      status: body.status,
      acesso_ate: body.acesso_ate ?? null,
    })
    .eq("id", id)
    .select("*, profile:profiles(*)")
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // Atualiza nome no profile se fornecido
  if (body.nome) {
    await admin!.from("profiles").update({ nome: body.nome }).eq("id", data.profile_id);
  }

  return NextResponse.json(data);
}
