import { NextResponse } from "next/server";
import { requireTreinador } from "@/lib/api-auth";

export async function POST(request: Request) {
  const { db, error } = await requireTreinador();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body?.nome || !body?.estrutura) {
    return NextResponse.json({ error: "nome e estrutura são obrigatórios" }, { status: 400 });
  }

  const { data, error: dbErr } = await db!
    .from("templates_treino")
    .insert({
      nome: body.nome,
      descricao: body.descricao ?? null,
      publico_alvo: body.publico_alvo ?? null,
      numero_treinos: body.numero_treinos ?? Object.keys(body.estrutura).length,
      estrutura: body.estrutura,
      uso_count: 0,
    })
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
