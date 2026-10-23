// POST /api/livre/[id]/exercicios — entra um exercício no treino livre (nome e músculo vêm da biblioteca no servidor).
import { NextResponse } from "next/server";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { adicionarExercicioLivre } from "@/lib/data/livre";
import { ultimasExecucoes } from "@/lib/data/sessoes";
import { textoUltimaVez } from "@/lib/treino/livre";
import { requireAlunoTreinoLivreApi } from "@/lib/treino/livre-guarda";
import { lerJson, livreExercicioSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireAlunoTreinoLivreApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, livreExercicioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const item = data.biblioteca_id ? ((await listarBiblioteca()).find((i) => i.id === data.biblioteca_id) ?? null) : null;
  if (data.biblioteca_id && !item) return NextResponse.json({ error: "Exercício não encontrado na biblioteca." }, { status: 404 });
  try {
    const se = await adicionarExercicioLivre(sessao.alunoId, id, { clientKey: data.client_key, item, nomeLivre: data.nome_livre ?? null, tecnica: data.tecnica });
    // Última vez que fez esse exercício (pelo nome), para lembrar a carga.
    const ultima = await ultimasExecucoes(sessao.alunoId, [{ id: se.id, nome: se.nome, biblioteca_id: se.biblioteca_id }]).then((u) => textoUltimaVez(u[se.id]), () => null);
    return NextResponse.json({ id: se.id, nome: se.nome, grupo: se.grupo_muscular, ultima }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível adicionar agora.";
    return NextResponse.json({ error: msg }, { status: /não encontrado/i.test(msg) ? 404 : /finalizado|Limite/.test(msg) ? 409 : 500 });
  }
}
