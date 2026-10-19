import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { data: aluno } = await admin
    .from("alunos")
    .select("id")
    .eq("profile_id", user!.id)
    .maybeSingle();

  if (!aluno) return NextResponse.json({ error: "Perfil de aluno não encontrado" }, { status: 404 });

  const hoje = new Date().toISOString().slice(0, 10);

  const { data, error: dbErr } = await admin
    .from("check_ins")
    .upsert(
      {
        aluno_id: aluno.id,
        data: hoje,
        energia: body.energia ?? null,
        sono: body.sono ?? null,
        dor: body.dor ?? null,
        motivacao: body.motivacao ?? null,
        estresse: body.estresse ?? null,
        notas: body.notas ?? null,
      },
      { onConflict: "aluno_id,data" }
    )
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
