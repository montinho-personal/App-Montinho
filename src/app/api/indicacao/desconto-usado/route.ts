// O personal marca que já aplicou o desconto de indicação de alguém (0102).
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTreinadorApi } from "@/lib/auth/session";
import { marcarDescontoUsado } from "@/lib/data/indicacao";
import { lerJson } from "@/lib/validacao/schemas";

const schema = z.object({ indicadorId: z.string().min(1).max(64) });

export async function POST(request: Request) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, schema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const pct = await marcarDescontoUsado(data.indicadorId);
    return NextResponse.json({ ok: true, pct });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível salvar" }, { status: 400 });
  }
}
