import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { listMemoria } from "@/lib/data/memoria";
import { buscarSemelhantes } from "@/lib/memoria/similaridade";
import { buscaMemoriaSchema, lerJson } from "@/lib/validacao/schemas";

/** GET /api/memoria — acervo completo (só treinador). */
export async function GET() {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  return NextResponse.json(await listMemoria());
}

/**
 * POST /api/memoria — busca estruturada ("Montinho, já montei algo parecido?").
 * Determinística, explicável e funcional sem provedor de IA.
 */
export async function POST(request: Request) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, buscaMemoriaSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const acervo = await listMemoria();
  const resultados = buscarSemelhantes(acervo, {
    texto: data.q ?? null,
    dias: data.dias ?? null,
    objetivo: data.objetivo ?? null,
    nivel: data.nivel ?? null,
    split: data.split ?? null,
    prioridades: data.prioridades ?? null,
    equipamentos: data.equipamentos ?? null,
    restricoes: data.restricoes ?? null,
    duracao_min: data.duracao_min ?? null,
    somenteFavoritos: data.favoritos ?? false,
  });
  return NextResponse.json({ motor: "busca_estruturada", ia: false, total_acervo: acervo.length, resultados });
}
