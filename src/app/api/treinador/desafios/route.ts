import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { FEATURES, isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { desafioSchema, lerJson } from "@/lib/validacao/schemas";

/** POST /api/treinador/desafios — cria um desafio (campanha com meta de treinos). RLS: só treinador. */
export async function POST(request: Request) {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data: body, error: vErr } = await lerJson(request, desafioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (isDemoMode()) return NextResponse.json({ error: "No modo demonstração não é possível criar desafios." }, { status: 501 });
  const db = await getDb();
  const { data, error: dbErr } = await db
    .from("campanhas")
    .insert({ nome: body.nome, descricao: body.descricao || null, inicio: body.inicio, fim: body.fim, meta_treinos: body.meta_treinos })
    .select("id, nome")
    .single();
  if (dbErr) return NextResponse.json({ error: "Não foi possível criar o desafio." }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
