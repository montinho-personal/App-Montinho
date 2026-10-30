// PATCH /api/treinador/ofertas — o personal liga/desliga uma oferta e escreve a vantagem (0130).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { salvarOfertaConfig } from "@/lib/data/ofertas";
import { lerJson, ofertaConfigSchema } from "@/lib/validacao/schemas";

export async function PATCH(request: Request) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, ofertaConfigSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await salvarOfertaConfig(data.id, { ativo: data.ativo, promo: data.promo ?? null });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
