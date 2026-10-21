// Cadastra uma prescrição pronta pelo mesmo caminho do montador (salvarPlano):
// validação zod, IDs estáveis, versão imutável, RLS. Idempotente: se o plano
// ativo já é esta prescrição, não grava nada. Treinos anteriores são
// arquivados (ativo=false), nunca apagados; histórico de sessões intacto.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTreinadorApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { getPlanoAtivo, listVersoes, salvarPlano, type TreinoInput } from "@/lib/data/programas";
import { criarIntervencao } from "@/lib/data/acompanhamento";
import { assinaturaTreinos, PRESCRICOES } from "@/lib/prescricoes";
import { auditarPrescricao } from "@/lib/prescricoes/auditar";
import { lerJson, salvarPlanoSchema } from "@/lib/validacao/schemas";
import { normalizarNome } from "@/lib/grupos";
import type { TreinoLetra } from "@/lib/supabase/types-sessoes";

const schema = z.object({ prescricao_id: z.string().min(1).max(80) });
type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, schema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const pr = PRESCRICOES.find((p) => p.id === data.prescricao_id);
  if (!pr) return NextResponse.json({ error: "Prescrição não encontrada" }, { status: 404 });
  const aluno = await getAluno(id);
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  if (normalizarNome(aluno.profile?.nome) !== normalizarNome(pr.alunoNome)) return NextResponse.json({ error: `Esta prescrição é de ${pr.alunoNome}.` }, { status: 409 });

  const validado = salvarPlanoSchema.safeParse(pr.plano);
  if (!validado.success) return NextResponse.json({ error: "Prescrição inválida", detalhes: validado.error.issues.slice(0, 5) }, { status: 422 });

  const [atual, versoes] = await Promise.all([getPlanoAtivo(id), listVersoes(id, 50)]);
  // Já cadastrada (pela marca na versão) ou idêntica ao plano ativo → não grava de novo.
  if (versoes.some((v) => v.motivo?.includes(`[${pr.id}]`)) || (atual.treinos.length && assinaturaTreinos(atual.treinos) === assinaturaTreinos(pr.plano.treinos))) {
    return NextResponse.json({ ok: true, jaCadastrada: true, auditoria: auditarPrescricao({ treinos: atual.treinos.map((t) => ({ ...t, letra: t.letra as TreinoLetra, exercicios: t.exercicios })) as TreinoInput[] }) });
  }
  // Treinos atuais (se houver) ficam arquivados — nada é apagado.
  const arquivados: TreinoInput[] = atual.treinos.map((t) => ({
    id: t.id, letra: t.letra as TreinoLetra, nome: t.nome, ativo: false, observacoes: t.observacoes,
    exercicios: t.exercicios.map((e) => ({ id: e.id, nome: e.nome, series: e.series, reps: e.reps, ie: e.ie, rir: e.rir, descanso_seg: e.descanso_seg, observacoes: e.observacoes, grupo_muscular: e.grupo_muscular, grupos_secundarios: e.grupos_secundarios, grupo_origem: e.grupo_origem, grupo_confianca: e.grupo_confianca, series_aquecimento: e.series_aquecimento, tecnica: e.tecnica, tecnica_extras: e.tecnica_extras ?? null, tecnica_series: e.tecnica_series ?? null, tecnica_config: e.tecnica_config ?? null, descanso_apos_seg: e.descanso_apos_seg ?? null, cadencia: e.cadencia ?? null, prioridade: e.prioridade ?? "normal", bloco: e.bloco, unilateral: e.unilateral, carga_alvo: e.carga_alvo, conta_volume: e.conta_volume, series_config: e.series_config, biblioteca_id: e.biblioteca_id })),
  }));
  try {
    const resultado = await salvarPlano(id, sessao.userId, { ...pr.plano, treinos: [...pr.plano.treinos, ...arquivados], motivo: `${pr.plano.motivo ?? "Prescrição cadastrada"} [${pr.id}]` });
    await criarIntervencao(id, sessao.userId, { tipo: "revisao_treino", titulo: `Treino cadastrado (versão ${resultado.versao.versao})`, descricao: pr.titulo, referencia: { versao_id: resultado.versao.id, prescricao: pr.id }, visivel_aluno: true }).catch(() => undefined);
    const ativos = resultado.treinos.filter((t) => t.ativo);
    return NextResponse.json({ ok: true, jaCadastrada: false, versao: resultado.versao.versao, auditoria: auditarPrescricao({ treinos: ativos.map((t) => ({ ...t, letra: t.letra as TreinoLetra })) as unknown as TreinoInput[] }) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao cadastrar" }, { status: 500 });
  }
}
