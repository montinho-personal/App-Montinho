import { NextResponse } from "next/server";
import { requireAcessoAlunoApi, requireTreinadorApi } from "@/lib/auth/session";
import { getPlanoAtivo, salvarPlano } from "@/lib/data/programas";
import { salvarCorrecoes, criarIntervencao } from "@/lib/data/acompanhamento";
import { lerJson, salvarPlanoSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/alunos/[id]/plano — plano ativo (treinador ou o próprio aluno). */
export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await requireAcessoAlunoApi(id);
  if (error) return error;
  return NextResponse.json(await getPlanoAtivo(id));
}

/**
 * PUT /api/alunos/[id]/plano — salva programa + treinos com IDs estáveis,
 * cria versão imutável e registra o programa na memória (desidentificado).
 */
export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, salvarPlanoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });

  // Proteção contra sobrescrever: o protocolo mudou desde que o montador abriu (outra aba,
  // outro aparelho, cópia de protocolo)? Avisa em vez de apagar o trabalho de alguém.
  if (data.versao_base != null && !data.forcar) {
    const atual = await getPlanoAtivo(id).catch(() => null);
    const versaoAtual = atual?.programa?.versao ?? null;
    if (versaoAtual != null && versaoAtual !== data.versao_base) return NextResponse.json({ error: "O protocolo foi alterado em outro lugar.", conflito: true, versaoAtual }, { status: 409 });
  }
  try {
    const resultado = await salvarPlano(id, sessao.userId, {
      programa: data.programa,
      treinos: data.treinos.map((t) => ({ ...t, exercicios: t.exercicios.map((e) => ({ ...e, observacoes: e.observacoes ?? null, bloco: e.bloco ?? null, carga_alvo: e.carga_alvo ?? null })) })),
      motivo: data.motivo ?? null,
      volume: data.volume,
    });
    let correcoes = 0;
    if (data.correcoes?.length) correcoes = await salvarCorrecoes(sessao.userId, data.correcoes);
    await criarIntervencao(id, sessao.userId, {
      tipo: "revisao_treino",
      titulo: `Plano salvo (versão ${resultado.versao.versao})`,
      descricao: data.motivo?.trim() || resultado.versao.diff_resumo || "Plano atualizado.",
      referencia: { versao_id: resultado.versao.id },
      visivel_aluno: true,
    }).catch(() => undefined);
    return NextResponse.json({ ok: true, ...resultado, correcoes });
  } catch (e) {
    console.error("[plano] falha ao salvar", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao salvar plano" }, { status: 500 });
  }
}
