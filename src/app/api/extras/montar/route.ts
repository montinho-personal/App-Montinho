// Treino extra montado pelo app. POST com as três respostas devolve a prévia;
// com iniciar=true (e client_key), começa a sessão. Tudo recalculado aqui.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { iniciarExtraGerado, previaExtraGerado } from "@/lib/data/extra-gerado";
import { lerJson, montarExtraSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, montarExtraSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const respostas = data.modo === "app" ? { modo: "app" as const, foco: data.foco, tempoMin: data.tempo_min, corpo: data.corpo } : { modo: "livre" as const, corpo: data.corpo, itens: data.itens };
  try {
    if (!data.iniciar) return NextResponse.json(await previaExtraGerado(sessao.alunoId, respostas));
    if (!data.client_key) return NextResponse.json({ error: "client_key obrigatória" }, { status: 400 });
    const s = await iniciarExtraGerado(sessao.alunoId, { ...respostas, clientKey: data.client_key });
    return NextResponse.json({ id: s.id, treinoId: s.treino_id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível montar o extra";
    return NextResponse.json({ error: msg }, { status: /não disponível|acesso ao app terminou/i.test(msg) ? 409 : 500 });
  }
}
