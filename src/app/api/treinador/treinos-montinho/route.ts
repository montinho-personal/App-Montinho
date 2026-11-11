// POST /api/treinador/treinos-montinho — o personal salva um treino que ele fez
// (Meu treino) como “Treino do Montinho”, publicado para os alunos (0154).
import { NextResponse } from "next/server";
import { requirePersonalApi } from "@/lib/auth/personal-ou-meu-treino";
import { salvarDaSessao } from "@/lib/data/treinos-montinho";
import { lerJson, treinoMontinhoSalvarSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { meuAluno, error } = await requirePersonalApi();
  if (error) return error;
  if (!meuAluno) return NextResponse.json({ error: "Crie a sua ficha no Meu treino primeiro." }, { status: 409 });
  const { data, error: vErr } = await lerJson(request, treinoMontinhoSalvarSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const t = await salvarDaSessao(meuAluno, data.sessao_id, data.titulo);
    return NextResponse.json({ treino: t }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível salvar agora.";
    return NextResponse.json({ error: msg }, { status: /já está salvo/.test(msg) ? 409 : /não foi encontrado|não tem/.test(msg) ? 404 : 500 });
  }
}
