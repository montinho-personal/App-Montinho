// Prepara o envio direto do arquivo de avaliação ao armazenamento privado.
import { NextResponse } from "next/server";
import { requireAcessoAlunoApi } from "@/lib/auth/session";
import { prepararEnvio } from "@/lib/data/medidas";
import { lerJson, urlArquivoAvaliacaoSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { data, error: vErr } = await lerJson(request, urlArquivoAvaliacaoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const { error } = await requireAcessoAlunoApi(data.aluno_id);
  if (error) return error;
  try {
    return NextResponse.json(await prepararEnvio(data.aluno_id, data.tipo));
  } catch {
    return NextResponse.json({ error: "Não foi possível preparar o envio agora." }, { status: 500 });
  }
}
