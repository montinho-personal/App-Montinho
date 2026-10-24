// Treino extra montado pelo app (ou sorteado pelo Montinho). POST com as respostas devolve a prévia;
// com iniciar=true (e client_key), começa a sessão. Tudo recalculado aqui.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { iniciarExtraGerado, previaExtraGerado, sortearExtra } from "@/lib/data/extra-gerado";
import { lerJson, montarExtraSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, montarExtraSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    // “O Montinho sorteia”: sem chave = sorteia um treino de um pronto (fora os já vistos).
    if (data.modo === "sorteio" && !data.chave) {
      if (data.iniciar) return NextResponse.json({ error: "Sorteie um treino antes de começar" }, { status: 400 });
      return NextResponse.json(await sortearExtra(sessao.alunoId, { corpo: data.corpo, vistos: data.vistos }));
    }
    const respostas =
      data.modo === "app" ? { modo: "app" as const, foco: data.foco, tempoMin: data.tempo_min, corpo: data.corpo }
      : data.modo === "livre" ? { modo: "livre" as const, corpo: data.corpo, itens: data.itens }
      : { modo: "sorteio" as const, corpo: data.corpo, chave: data.chave! };
    if (!data.iniciar) return NextResponse.json(await previaExtraGerado(sessao.alunoId, respostas));
    if (!data.client_key) return NextResponse.json({ error: "client_key obrigatória" }, { status: 400 });
    const s = await iniciarExtraGerado(sessao.alunoId, { ...respostas, clientKey: data.client_key });
    return NextResponse.json({ id: s.id, treinoId: s.treino_id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível montar o extra";
    return NextResponse.json({ error: msg }, { status: /não disponível|acesso ao app terminou/i.test(msg) ? 409 : 500 });
  }
}
