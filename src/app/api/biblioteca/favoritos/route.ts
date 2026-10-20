import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { definirFavorito } from "@/lib/data/biblioteca";
import { favoritoSchema, lerJson } from "@/lib/validacao/schemas";

/** POST /api/biblioteca/favoritos — marca/desmarca favorito do treinador logado. */
export async function POST(request: Request) {
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, favoritoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await definirFavorito(sessao.userId, data.exercicio_id, data.favorito);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao salvar favorito" }, { status: 500 });
  }
}
