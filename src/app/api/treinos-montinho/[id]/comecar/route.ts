// POST /api/treinos-montinho/[id]/comecar — o aluno (ou visitante em dia) faz um
// Treino do Montinho: abre o treino livre já com os exercícios, a meta e a técnica.
import { NextResponse } from "next/server";
import { requireAlunoTreinoLivreApi } from "@/lib/treino/livre-guarda";
import { getTreinoMontinho } from "@/lib/data/treinos-montinho";
import { comecarComBase } from "@/lib/data/treino-base";
import { baseDoTreinoMontinho } from "@/lib/treino/treinos-montinho";
import { lerJson, treinoMontinhoComecarSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireAlunoTreinoLivreApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, treinoMontinhoComecarSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const t = await getTreinoMontinho(id);
  if (!t || (!t.publicado && !sessao.comoPersonal)) return NextResponse.json({ error: "Esse treino não está disponível." }, { status: 404 });
  try {
    const s = await comecarComBase(sessao.alunoId, data.client_key, baseDoTreinoMontinho(t));
    return NextResponse.json({ id: s.id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível começar agora.";
    return NextResponse.json({ error: msg }, { status: /em andamento/.test(msg) ? 409 : 500 });
  }
}
