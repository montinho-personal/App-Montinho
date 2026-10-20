import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { criarExercicio, listarBiblioteca } from "@/lib/data/biblioteca";
import { exercicioBibliotecaSchema, lerJson } from "@/lib/validacao/schemas";

/** GET /api/biblioteca — biblioteca completa (só treinador). */
export async function GET() {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  return NextResponse.json(await listarBiblioteca());
}

/** POST /api/biblioteca — cria exercício próprio do treinador (recusa duplicata). */
export async function POST(request: Request) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, exercicioBibliotecaSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    return NextResponse.json(await criarExercicio(data), { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao salvar";
    return NextResponse.json({ error: msg }, { status: msg.startsWith("Já existe") ? 409 : 500 });
  }
}
