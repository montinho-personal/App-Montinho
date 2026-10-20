// Personal muda o status editorial (publicar, revisar, arquivar). Vira versão.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { mudarStatusConteudo } from "@/lib/data/desbloqueia";
import { lerJson, statusConhecimentoSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, statusConhecimentoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    return NextResponse.json({ ok: true, ...(await mudarStatusConteudo(id, data.status)) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível mudar o status." }, { status: 500 });
  }
}
