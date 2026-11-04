// O aluno abriu (e talvez respondeu) uma descoberta. “Acertou” é calculado no
// servidor; errar nunca tira nada. Acertos somam para os troféus de
// Autoconhecimento (1, 10, 30, 50): saiu troféu novo, volta para comemorar.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { albumParaAluno, explorarConteudo, getConteudo } from "@/lib/data/desbloqueia";
import { explorarConhecimentoSchema, lerJson } from "@/lib/validacao/schemas";
import { getAluno } from "@/lib/db";
import { sincronizarConquistas } from "@/lib/data/conquistas";
import { paraComemorar } from "@/lib/conquistas/comemorar";
import { CODIGOS_QUIZ } from "@/lib/conquistas/quiz";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, explorarConhecimentoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const conteudo = await getConteudo(id);
  if (!conteudo || conteudo.status !== "publicado") return NextResponse.json({ error: "Conteúdo não encontrado" }, { status: 404 });
  try {
    const t0 = new Date(Date.now() - 60_000).toISOString();
    // A origem vem do servidor: pergunta que já saiu no álbum fica com a origem
    // do álbum (conta nos troféus); a que ainda não saiu é “biblioteca” (só conta
    // quando sair). A sugestão do treino (“contexto”) continua valendo.
    const aluno = await getAluno(sessao.alunoId).catch(() => null);
    const album = aluno ? await albumParaAluno(aluno).catch(() => null) : null;
    const item = album?.itens.find((i) => i.conteudo.id === id) ?? null;
    const origem = item?.disponivelEm && item.origem && item.origem !== "biblioteca" ? item.origem : data.origem === "contexto" ? "contexto" : "biblioteca";
    const resultado = await explorarConteudo(sessao.alunoId, conteudo, { resposta: data.resposta ?? null, origem, revisao: data.revisao ?? false });
    let novas: unknown[] = [];
    if (data.resposta && resultado?.acertou && !data.revisao) {
      const sync = aluno ? await sincronizarConquistas(aluno).catch(() => null) : null;
      novas = sync ? paraComemorar(sync.todas, t0, (c) => (CODIGOS_QUIZ as string[]).includes(c)) : [];
    }
    return NextResponse.json({ ok: true, resultado, novas });
  } catch (e) {
    // Sem a tabela ainda: o aluno lê normalmente, só o progresso não fica guardado.
    return NextResponse.json({ ok: false, aviso: e instanceof Error ? e.message : "Não foi possível guardar." }, { status: 200 });
  }
}
