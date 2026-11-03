// Recado do personal no meio do treino: aparece na tela do treino do aluno e
// chega como notificação no celular dele.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { enviarRecadoAoVivo, enviarRecadoAtividade, enviarRecadoDemoComAudio, TEXTO_AUDIO } from "@/lib/data/ao-vivo";
import { isDemoMode } from "@/lib/env";
import { limparRecado } from "@/lib/ao-vivo/regras";
import { lerJson, recadoAoVivoSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, recadoAoVivoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const temAudio = !!data.audio || (isDemoMode() && !!data.audio_demo);
  const texto = limparRecado(data.texto ?? "") || (temAudio ? TEXTO_AUDIO : "");
  if (!texto) return NextResponse.json({ error: "Escreva o recado" }, { status: 400 });
  // Cardio ou mobilidade em andamento: só texto.
  if (data.atividade_id) {
    if (temAudio) return NextResponse.json({ error: "No cardio e na mobilidade, só recado escrito." }, { status: 400 });
    try {
      const r = await enviarRecadoAtividade(sessao.userId, data.atividade_id, texto);
      if (!r) return NextResponse.json({ error: "Essa atividade já terminou." }, { status: 409 });
      return NextResponse.json({ ok: true, ...r }, { status: 201 });
    } catch {
      return NextResponse.json({ error: "Não foi possível enviar o recado" }, { status: 500 });
    }
  }
  const sessaoId = data.sessao_id!;
  try {
    const r = isDemoMode() && data.audio_demo ? await enviarRecadoDemoComAudio(sessao.userId, sessaoId, texto, data.audio_demo) : await enviarRecadoAoVivo(sessao.userId, sessaoId, texto, data.audio ?? null);
    if (!r) return NextResponse.json({ error: "Esse treino já terminou." }, { status: 409 });
    return NextResponse.json({ ok: true, ...r }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível enviar o recado" }, { status: 500 });
  }
}
