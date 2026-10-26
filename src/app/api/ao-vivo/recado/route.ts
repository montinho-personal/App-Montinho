// Recado do personal no meio do treino: aparece na tela do treino do aluno e
// chega como notificação no celular dele.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { enviarRecadoAoVivo } from "@/lib/data/ao-vivo";
import { limparRecado } from "@/lib/ao-vivo/regras";
import { lerJson, recadoAoVivoSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, recadoAoVivoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const texto = limparRecado(data.texto);
  if (!texto) return NextResponse.json({ error: "Escreva o recado" }, { status: 400 });
  try {
    const r = await enviarRecadoAoVivo(sessao.userId, data.sessao_id, texto);
    if (!r) return NextResponse.json({ error: "Esse treino já terminou." }, { status: 409 });
    return NextResponse.json({ ok: true, ...r }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível enviar o recado" }, { status: 500 });
  }
}
