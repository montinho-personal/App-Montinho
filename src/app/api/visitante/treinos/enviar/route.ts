// Registra o treino enviado: entra na lista “Treinos para montar” do personal.
import { NextResponse } from "next/server";
import { registrarTreinoEnviado } from "@/lib/data/treinos-enviados";
import { requireVisitanteEmDiaApi } from "@/lib/visitante/guarda-api";
import { lerJson, registrarTreinoEnviadoSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireVisitanteEmDiaApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, registrarTreinoEnviadoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const t = await registrarTreinoEnviado(sessao.alunoId, { caminho: data.caminho, tipo: data.tipo, tamanho: data.tamanho, observacao: data.observacao ?? null });
    return NextResponse.json({ ok: true, id: t.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível enviar agora." }, { status: 500 });
  }
}
