// Treino extra montado pelo app: contexto (pode ou não pode), prévia e início.
// Regras puras em src/lib/treino/extra-gerado.ts. Tudo é recalculado no
// servidor ao começar: o cliente só manda as três respostas.
import { getAluno } from "@/lib/db";
import { getPlanoAtivo } from "@/lib/data/programas";
import { getSessaoEmAndamento, gravarSessaoNova, exerciciosDaSessao, listSessoes, type SessaoCompleta } from "@/lib/data/sessoes";
import { getConfigExtra, sessaoRecente } from "@/lib/data/extras";
import { aderenciaDoAluno } from "@/lib/data/aderencia";
import { completarGrupos } from "@/lib/data/biblioteca";
import { estadoSemana } from "@/lib/relatorios/calcular";
import { CONFIG_EXTRA_PADRAO } from "@/lib/treino/extra";
import { dataLocal, diaDaSemana, inicioDaSemana } from "@/lib/aderencia/calcular";
import { montarExtraGerado, semanaCumprida, REGRAS_EXTRA_GERADO, type CorpoExtra, type FocoExtra, type ResultadoExtraGerado } from "@/lib/treino/extra-gerado";
import { estimarPrescricao } from "@/lib/tempo/prescricao";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { ExercicioPrescrito, TrainingSession } from "@/lib/supabase/types-sessoes";
import { uid } from "@/lib/mock/store";

export type ContextoExtraGerado = {
  habilitado: boolean;
  feitos: number;
  programados: number | null;
  cumprida: boolean;
  proximo: { id: string; letra: string; nome: string } | null;
  emAndamento: { id: string; treinoId: string | null; nome: string | null } | null;
  extrasSemana: number;
  maxPorSemana: number;
  diaPermitido: boolean;
  seriesDisponiveis: number;
  prioridades: string[];
  /** Mensagem para o aluno quando o extra não está disponível agora; null = pode montar. */
  bloqueio: string | null;
};

type Carga = { ctx: ContextoExtraGerado; exercicios: ExercicioPrescrito[]; recentes48h: GrupoMuscular[]; proximoGrupos: GrupoMuscular[]; tempos: Record<string, number | boolean> | null; treinoBase: string | null };

async function carregar(alunoId: string, agora = new Date()): Promise<Carga> {
  const [aluno, plano, config, sessoes, emAndamento] = await Promise.all([getAluno(alunoId), getPlanoAtivo(alunoId), getConfigExtra(alunoId), listSessoes(alunoId, { limite: 120, status: "todas" }), getSessaoEmAndamento(alunoId)]);
  const cfg = config ?? { ...CONFIG_EXTRA_PADRAO, observacao: null };
  const treinos = plano.treinos.filter((t) => t.ativo && t.exercicios.length > 0);
  const aderencia = aluno ? await aderenciaDoAluno(aluno) : null;
  const semana = aderencia?.semanaAtual ?? null;
  const programados = semana?.meta ?? aderencia?.metaAtual.meta ?? null;
  const feitos = semana?.concluidas ?? 0;
  const est = estadoSemana(sessoes, plano.programa?.frequencia, treinos.map((t) => t.letra), agora);
  const proximoT = treinos.find((t) => t.letra === est.proximaLetra) ?? treinos[0] ?? null;

  const hoje = dataLocal(agora);
  const inicio = inicioDaSemana(hoje);
  const recentes = sessoes.map(sessaoRecente);
  const extrasSemanaLista = recentes.filter((s) => s.modo === "extra" && s.series_concluidas > 0 && dataLocal(s.iniciado_em) >= inicio);
  const seriesFeitas = extrasSemanaLista.reduce((n, s) => n + (s.series_extra ?? 0), 0);
  const recentes48h = [...new Set(recentes.filter((s) => s.status !== "em_andamento" && s.series_concluidas > 0 && agora.getTime() - new Date(s.finalizado_em ?? s.iniciado_em).getTime() < REGRAS_EXTRA_GERADO.horasRecuperacao * 3_600_000).flatMap((s) => s.grupos))] as GrupoMuscular[];

  const todos = await completarGrupos(treinos.flatMap((t) => t.exercicios) as ExercicioPrescrito[]);
  // Semana cumprida: o próximo treino da sequência é o da semana que vem (segunda-feira).
  // Os músculos dele só saem do extra quando ele é amanhã (extra no domingo).
  const proximoEhAmanha = diaDaSemana(hoje) === 0;
  const proximoGrupos = proximoT && proximoEhAmanha ? [...new Set(todos.filter((x) => x.treino_id === proximoT.id).map((x) => x.grupo_muscular).filter(Boolean))] as GrupoMuscular[] : [];

  const ctx: ContextoExtraGerado = {
    habilitado: !!cfg.habilitado,
    feitos,
    programados,
    cumprida: semanaCumprida(feitos, programados),
    proximo: proximoT ? { id: proximoT.id, letra: proximoT.letra, nome: proximoT.nome } : null,
    emAndamento: emAndamento?.status === "em_andamento" ? { id: emAndamento.id, treinoId: emAndamento.treino_id, nome: emAndamento.nome_treino } : null,
    extrasSemana: extrasSemanaLista.length,
    maxPorSemana: cfg.max_por_semana,
    diaPermitido: cfg.dias_permitidos.includes(diaDaSemana(hoje)),
    seriesDisponiveis: Math.max(0, cfg.limite_series_semana - seriesFeitas),
    prioridades: plano.programa?.prioridades ?? [],
    bloqueio: null,
  };
  ctx.bloqueio = !ctx.habilitado
    ? "O Montinho ainda não liberou treinos extras para você."
    : ctx.emAndamento
      ? "Você tem um treino em andamento. Termine ele primeiro."
      : !ctx.cumprida
        ? ctx.programados
          ? `Antes do extra, complete a sua semana: ${ctx.feitos} de ${ctx.programados} treinos feitos.`
          : "Sua semana ainda não tem treinos programados."
        : ctx.extrasSemana >= ctx.maxPorSemana
          ? `Você já fez ${ctx.extrasSemana === 1 ? "o seu treino extra" : `${ctx.extrasSemana} treinos extras`} desta semana. O próximo libera na segunda-feira.`
          : !ctx.diaPermitido
            ? "Hoje não é um dos dias liberados para treino extra."
            : ctx.seriesDisponiveis <= 0
              ? "Você já fez todas as séries extras combinadas para esta semana."
              : null;
  return { ctx, exercicios: todos, recentes48h, proximoGrupos, tempos: proximoT ? ((proximoT.tempos_efetivos ?? proximoT.tempos ?? null) as Record<string, number | boolean> | null) : null, treinoBase: treinos[0]?.id ?? null };
}

export async function contextoExtraGerado(alunoId: string): Promise<ContextoExtraGerado> {
  return (await carregar(alunoId)).ctx;
}

export type RespostasExtra = { foco: FocoExtra; tempoMin: number; corpo: CorpoExtra };

function gerar(c: Carga, r: RespostasExtra): ResultadoExtraGerado {
  return montarExtraGerado({ exercicios: c.exercicios, prioridades: c.ctx.prioridades, foco: r.foco, tempoMin: r.tempoMin, corpo: r.corpo, recentes48h: c.recentes48h, proximoTreino: c.proximoGrupos, seriesDisponiveis: c.ctx.seriesDisponiveis, tempos: c.tempos });
}

export async function previaExtraGerado(alunoId: string, r: RespostasExtra): Promise<{ ctx: ContextoExtraGerado; resultado: ResultadoExtraGerado | null }> {
  const c = await carregar(alunoId);
  if (c.ctx.bloqueio) return { ctx: c.ctx, resultado: null };
  return { ctx: c.ctx, resultado: gerar(c, r) };
}

/** Começa o extra montado. Liberado direto (decisão do Montinho, 22/10/2026), mas só dentro das regras. */
export async function iniciarExtraGerado(alunoId: string, r: RespostasExtra & { clientKey: string }): Promise<SessaoCompleta> {
  const c = await carregar(alunoId);
  if (c.ctx.bloqueio) throw new Error(`Extra não disponível agora: ${c.ctx.bloqueio}`);
  const g = gerar(c, r);
  if (!g.ok) throw new Error(`Extra não disponível agora: ${g.motivo}`);
  const ex = g.extra;
  // A tela de treino abre pelo treino do primeiro exercício; os exercícios vêm da foto da sessão.
  const treinoId = ex.exercicios[0].treino_id ?? c.treinoBase;
  const agora = new Date().toISOString();
  const sessao: TrainingSession = {
    id: uid(),
    aluno_id: alunoId,
    treino_id: treinoId,
    programa_versao_id: null,
    letra: null,
    nome_treino: ex.titulo,
    client_key: r.clientKey,
    status: "em_andamento",
    iniciado_em: agora,
    finalizado_em: null,
    duracao_seg: null,
    snapshot: {
      treino: { id: treinoId, letra: "+", nome: ex.titulo, observacoes: null, tempos: c.tempos ?? {} },
      exercicios: ex.exercicios,
      extra: { id: null, gerado: true, modalidade: "resistido", titulo: ex.titulo, foco: r.foco, grupos: ex.grupos, series_estimadas: ex.series },
      recuperacao: r.corpo,
    },
    series_planejadas: ex.series,
    tempo_estimado_seg: estimarPrescricao(ex.exercicios, c.tempos).totalSeg || null,
    pausado_seg: 0,
    checkin_pre: r.corpo === "cansado" ? "cansado" : "muito_bem",
    checkin_pre_nota: null,
    modo: "extra",
    tempo_disponivel_min: r.tempoMin,
    extra_id: null,
    series_concluidas: 0,
    feedback_percepcao: null,
    feedback_comentario: null,
    origem: "app",
    created_at: agora,
    updated_at: agora,
  };
  return gravarSessaoNova(alunoId, r.clientKey, sessao, exerciciosDaSessao(sessao.id, ex.exercicios, agora));
}

/** Sessão é um extra montado pelo app? (a tela de treino usa a foto dela) */
export function ehExtraGerado(s: { modo?: string | null; snapshot?: unknown } | null | undefined): boolean {
  return !!s && s.modo === "extra" && !!(s.snapshot as { extra?: { gerado?: boolean } } | null)?.extra?.gerado;
}
