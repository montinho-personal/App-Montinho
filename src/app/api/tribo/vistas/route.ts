// Conquistas da Tribo: marca como vistas as que já foram comemoradas.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { marcarVistasTribo } from "@/lib/data/tribo";
import { lerJson, triboVistasSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, triboVistasSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  await marcarVistasTribo(sessao.alunoId, data.ids).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
