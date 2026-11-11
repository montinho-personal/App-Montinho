// POST /api/treinos-montinho/[id]/comecar — o aluno (ou visitante em dia) faz um
// Treino do Montinho: abre o treino livre já com os exercícios, a meta e a técnica.
import { NextResponse } from "next/server";
import { requireAlunoTreinoLivreApi } from "@/lib/treino/livre-guarda";
import { getTreinoMontinho } from "@/lib/data/treinos-montinho";
import { comecarComBase } from "@/lib/data/treino-base";
import { baseDoTreinoMontinho } from "@/lib/treino/treinos-montinho";
import { lerJson, treinoMontinhoComecarSchema } from "@/lib/validacao/schemas";
import { getConfigExtra } from "@/lib/data/extras";
import { contextoExtraGerado } from "@/lib/data/extra-gerado";
import { BRAND } from "@/config/brand";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireAlunoTreinoLivreApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, treinoMontinhoComecarSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const t = await getTreinoMontinho(id);
  if (!t || (!t.publicado && !sessao.comoPersonal)) return NextResponse.json({ error: "Esse treino não está disponível." }, { status: 404 });
  // Como treino extra: as mesmas regras do extra (liberado, semana cumprida, sem dor forte).
  if (data.extra) {
    if (data.extra.corpo === "dor") return NextResponse.json({ error: `Com dor forte, nada de extra hoje. Converse com o ${BRAND.name} antes de treinar mais.` }, { status: 409 });
    const [config, ctx] = await Promise.all([getConfigExtra(sessao.alunoId), contextoExtraGerado(sessao.alunoId)]);
    if (!config?.habilitado) return NextResponse.json({ error: `O ${BRAND.name} ainda não liberou treinos extras para você.` }, { status: 403 });
    if (ctx.bloqueio) return NextResponse.json({ error: ctx.bloqueio }, { status: 409 });
  }
  try {
    const extra = data.extra && data.extra.corpo !== "dor" ? { corpo: data.extra.corpo } : null;
    const s = await comecarComBase(sessao.alunoId, data.client_key, baseDoTreinoMontinho(t), { extra });
    return NextResponse.json({ id: s.id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível começar agora.";
    return NextResponse.json({ error: msg }, { status: /em andamento/.test(msg) ? 409 : 500 });
  }
}
