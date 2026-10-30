// POST /api/ao-vivo/audio — o personal pede o link para enviar o áudio do recado (0132).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { linkEnvioAudio } from "@/lib/data/ao-vivo";
import { audioRecadoSchema, lerJson } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, audioRecadoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const r = await linkEnvioAudio(data.sessao_id, data.tipo);
    if (!r) return NextResponse.json({ error: "Esse treino já terminou." }, { status: 409 });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
