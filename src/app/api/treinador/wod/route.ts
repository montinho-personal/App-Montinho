// POST — o personal publica ou edita o WOD do dia (0134).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { FEATURES } from "@/lib/env";
import { salvarWod } from "@/lib/data/wod-dia";
import type { BlocoTreino } from "@/lib/modalidades/tipos";
import { lerJson, wodSalvarSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  if (!FEATURES.multimodalidade) return NextResponse.json({ error: "Indisponível" }, { status: 404 });
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, wodSalvarSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    return NextResponse.json(await salvarWod(sessao.userId, { ...data, blocos: data.blocos as BlocoTreino[] }), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível salvar" }, { status: 500 });
  }
}
