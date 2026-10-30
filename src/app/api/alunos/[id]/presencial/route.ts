// PATCH /api/alunos/[id]/presencial — o personal marca se a pessoa pode fazer aula presencial (0130).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { definirPresencial } from "@/lib/data/ofertas";
import { lerJson, presencialSchema } from "@/lib/validacao/schemas";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await ctx.params;
  const { data, error: vErr } = await lerJson(request, presencialSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await definirPresencial(id, data.pode_presencial);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
