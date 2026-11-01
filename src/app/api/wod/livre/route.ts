// POST — o aluno começa um WOD livre (monta os blocos e anota, como no treino
// livre da musculação). Mesma guarda do treino livre: aluno ou visitante em dia.
import { NextResponse } from "next/server";
import { FEATURES } from "@/lib/env";
import { requireAlunoTreinoLivreApi } from "@/lib/treino/livre-guarda";
import { iniciarSessaoWodLivre } from "@/lib/data/wod-dia";
import { lerJson, wodLivreSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  if (!FEATURES.multimodalidade) return NextResponse.json({ error: "Indisponível" }, { status: 404 });
  const { sessao, error } = await requireAlunoTreinoLivreApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, wodLivreSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const s = await iniciarSessaoWodLivre(sessao.alunoId, { titulo: data.titulo ?? null, modalidade: data.modalidade, blocos: data.blocos }, data.client_key);
    return NextResponse.json({ id: s.id, status: s.status }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível começar agora.";
    return NextResponse.json({ error: msg }, { status: /acesso ao app terminou/i.test(msg) ? 403 : /andamento/i.test(msg) ? 409 : /bloco/i.test(msg) ? 400 : 500 });
  }
}
