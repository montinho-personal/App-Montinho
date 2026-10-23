// Prepara o envio direto do arquivo do treino ao armazenamento privado.
import { NextResponse } from "next/server";
import { prepararEnvioTreino } from "@/lib/data/treinos-enviados";
import { requireVisitanteEmDiaApi } from "@/lib/visitante/guarda-api";
import { lerJson, urlTreinoEnviadoSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireVisitanteEmDiaApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, urlTreinoEnviadoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    return NextResponse.json(await prepararEnvioTreino(sessao.alunoId, data.tipo));
  } catch {
    return NextResponse.json({ error: "Não foi possível preparar o envio agora." }, { status: 500 });
  }
}
