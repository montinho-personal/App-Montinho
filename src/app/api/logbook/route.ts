import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body?.exercicio_id || !body?.serie || body?.reps == null) {
    return NextResponse.json({ error: "exercicio_id, serie e reps são obrigatórios" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Resolve aluno_id a partir do profile do usuário autenticado
  const { data: aluno } = await admin
    .from("alunos")
    .select("id")
    .eq("profile_id", user!.id)
    .maybeSingle();

  if (!aluno) {
    return NextResponse.json({ error: "Perfil de aluno não encontrado" }, { status: 404 });
  }

  const { data, error: dbErr } = await admin
    .from("logbook")
    .upsert(
      {
        aluno_id: aluno.id,
        exercicio_id: body.exercicio_id,
        data: body.data ?? new Date().toISOString().slice(0, 10),
        serie: body.serie,
        carga_kg: body.carga_kg ?? null,
        reps: body.reps,
        ie: body.ie ?? null,
        observacoes: body.observacoes ?? null,
      },
      { onConflict: "aluno_id,exercicio_id,data,serie" }
    )
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
