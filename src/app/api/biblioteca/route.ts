import { NextResponse } from "next/server";
import { requireTreinador } from "@/lib/api-auth";

export async function GET() {
  const { admin, error } = await requireTreinador();
  if (error) return error;
  const { data } = await admin!.from("exercicios_biblioteca").select("*").eq("arquivado", false).order("nome");
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const { admin, error } = await requireTreinador();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body?.nome || !body?.grupo_muscular) {
    return NextResponse.json({ error: "nome e grupo_muscular são obrigatórios" }, { status: 400 });
  }

  const { data, error: dbErr } = await admin!
    .from("exercicios_biblioteca")
    .insert({
      nome: body.nome,
      slug: body.slug ?? body.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      grupo_muscular: body.grupo_muscular,
      grupos_secundarios: body.grupos_secundarios ?? [],
      equipamento: body.equipamento ?? [],
      video_provider: body.video_provider ?? null,
      video_id: body.video_id ?? null,
      thumbnail_url: body.thumbnail_url ?? null,
      duracao_seg: body.duracao_seg ?? null,
      descricao: body.descricao ?? null,
      instrucoes: body.instrucoes ?? [],
      observacoes: body.observacoes ?? null,
      dificuldade: body.dificuldade ?? null,
      arquivado: false,
    })
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
