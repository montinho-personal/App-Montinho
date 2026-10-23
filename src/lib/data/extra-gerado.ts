// Treino extra montado pelo app: contexto (pode ou não pode), prévia e início.
// Regras puras em src/lib/treino/extra-gerado.ts. Tudo é recalculado no
// servidor ao começar: o cliente só manda as três respostas.
import { getAluno } from "@/lib/db";
import { getPlanoAtivo } from "@/lib/data/programas";
import { getSessaoEmAndamento, gravarSessaoNova, exerciciosDaSessao, listSessoes, type SessaoCompleta } from "@/lib/data/sessoes";
import { exigirExtraLiberado, getConfigExtra, sessaoRecente } from "@/lib/data/extras";
import { juntarOpcoes, type OpcaoExtra } from "@/lib/treino/extra-opcoes";
import type { ItemExtraAprovado, Recuperacao } from "@/lib/treino/extra";
import type { SugestaoExtra } from "@/lib/treino/sugestao-extra";
import { aderenciaDoAluno } from "@/lib/data/aderencia";
import { completarGrupos } from "@/lib/data/biblioteca";
import { estadoSemana } from "@/lib/relatorios/calcular";
import { CONFIG_EXTRA_PADRAO } from "@/lib/treino/extra";
import { dataLocal, diaDaSemana, inicioDaSemana } from "@/lib/aderencia/calcular";
import { montarExtraGerado, montarExtraLivre, semanaCumprida, FOCOS_EXTRA, GRUPOS_PEQUENOS, LIMITES_EXTRA_LIVRE, REGRAS_EXTRA_GERADO, type CorpoExtra, type FocoExtra, type ItemExtraLivre, type ResultadoExtraGerado, type ExtraGerado } from "@/lib/treino/extra-gerado";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { normalizarNome } from "@/lib/grupos";
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

export type EscolhaLivre = { biblioteca_id?: string | null; nome: string; series: number; reps: string };
export type RespostasExtra =
  | { modo: "app"; foco: FocoExtra; tempoMin: number; corpo: CorpoExtra }
  | { modo: "livre"; corpo: CorpoExtra; itens: EscolhaLivre[] };

/** O que o aluno escolheu → exercício do plano (carga anterior, recado) ou, se não houver, da biblioteca. */
async function resolverEscolhas(c: Carga, itens: EscolhaLivre[]): Promise<ItemExtraLivre[] | { erro: string }> {
  const biblioteca = await listarBiblioteca();
  const out: ItemExtraLivre[] = [];
  for (const i of itens.slice(0, LIMITES_EXTRA_LIVRE.maxExercicios)) {
    const nome = normalizarNome(i.nome);
    const b = biblioteca.find((x) => (i.biblioteca_id && x.id === i.biblioteca_id) || normalizarNome(x.nome) === nome);
    // Mesmo movimento do plano? Usa o do plano (carga anterior, recado). "Elevação lateral" do plano
    // = "Elevação lateral com halteres" da biblioteca, se for o mesmo grupo.
    const nomesB = b ? [b.nome, ...(b.sinonimos ?? [])].map(normalizarNome) : [];
    const doPlano =
      c.exercicios.find((x) => (b && x.biblioteca_id === b.id) || normalizarNome(x.nome) === nome || nomesB.includes(normalizarNome(x.nome))) ??
      (b ? c.exercicios.find((x) => x.grupo_muscular === b.grupo && nomesB.some((n) => n.startsWith(normalizarNome(x.nome) + " "))) : undefined);
    const series = Math.min(LIMITES_EXTRA_LIVRE.maxSeries, Math.max(1, Math.round(i.series || LIMITES_EXTRA_LIVRE.seriesPadrao)));
    const reps = (i.reps || LIMITES_EXTRA_LIVRE.repsPadrao).trim().slice(0, 20);
    if (doPlano) { out.push({ exercicio: doPlano, series, reps }); continue; }
    if (!b) return { erro: `Não encontrei “${i.nome}” na biblioteca de exercícios. Escolha outro nome.` };
    if (b.contaVolume === false || b.grupo === "cardio") return { erro: `“${b.nome}” não é exercício de musculação: para cardio e mobilidade, use as opções liberadas pelo Montinho.` };
    const pequeno = GRUPOS_PEQUENOS.includes(b.grupo);
    const sintetico = {
      id: uid(), treino_id: "", ordem: out.length, nome: b.nome, series, reps, ie: 7, descanso_seg: pequeno ? 60 : 90, observacoes: null, video_url: null, created_at: new Date().toISOString(),
      biblioteca_id: b.id, series_config: null, grupo_muscular: b.grupo, grupos_secundarios: b.secundarios ?? [], grupo_origem: "biblioteca", grupo_confianca: "alta",
      series_aquecimento: 0, tecnica: "normal", tecnica_extras: null, tecnica_series: null, tecnica_config: null, bloco: null, unilateral: false, carga_alvo: null, rir: 2, cadencia: null, conta_volume: true, removido_em: null,
    } as unknown as ExercicioPrescrito;
    out.push({ exercicio: sintetico, series, reps });
  }
  return out;
}

async function gerar(c: Carga, r: RespostasExtra): Promise<ResultadoExtraGerado> {
  if (r.modo === "livre") {
    const itens = await resolverEscolhas(c, r.itens);
    if ("erro" in itens) return { ok: false, motivo: itens.erro };
    return montarExtraLivre({ itens, corpo: r.corpo, recentes48h: c.recentes48h, seriesDisponiveis: c.ctx.seriesDisponiveis, tempos: c.tempos });
  }
  return montarExtraGerado({ exercicios: c.exercicios, prioridades: c.ctx.prioridades, foco: r.foco, tempoMin: r.tempoMin, corpo: r.corpo, recentes48h: c.recentes48h, proximoTreino: c.proximoGrupos, seriesDisponiveis: c.ctx.seriesDisponiveis, tempos: c.tempos });
}

export async function previaExtraGerado(alunoId: string, r: RespostasExtra): Promise<{ ctx: ContextoExtraGerado; resultado: ResultadoExtraGerado | null }> {
  const c = await carregar(alunoId);
  if (c.ctx.bloqueio) return { ctx: c.ctx, resultado: null };
  return { ctx: c.ctx, resultado: await gerar(c, r) };
}

/** Começa o extra montado. Liberado direto (decisão do Montinho, 22/10/2026), mas só dentro das regras. */
export async function iniciarExtraGerado(alunoId: string, r: RespostasExtra & { clientKey: string }): Promise<SessaoCompleta> {
  const c = await carregar(alunoId);
  if (c.ctx.bloqueio) throw new Error(`Extra não disponível agora: ${c.ctx.bloqueio}`);
  const g = await gerar(c, r);
  if (!g.ok) throw new Error(`Extra não disponível agora: ${g.motivo}`);
  return gravarExtra(alunoId, c, g.extra, { clientKey: r.clientKey, corpo: r.corpo, foco: r.modo === "app" ? r.foco : "livre", tempoMin: r.modo === "app" ? r.tempoMin : null, extraId: null });
}

/**
 * Começa um extra que o personal aprovou com a lista de exercícios (0073).
 * Vale a avaliação de sempre dos extras liberados (dor, 48 h, dias, limites,
 * aprovação); os exercícios são os que ele aprovou, na versão extra.
 */
export async function iniciarExtraAprovado(alunoId: string, input: { extraId: string; clientKey: string; recuperacao: Recuperacao | null }): Promise<SessaoCompleta> {
  const extra = await exigirExtraLiberado(alunoId, input.extraId, { recuperacao: input.recuperacao, tempoDisponivelMin: null });
  if (!extra.exercicios?.length) throw new Error("Este treino extra não tem exercícios cadastrados");
  const c = await carregar(alunoId);
  if (c.ctx.emAndamento) throw new Error("Extra não disponível agora: você tem um treino em andamento. Termine ele primeiro.");
  const itens = await resolverEscolhas(c, extra.exercicios);
  if ("erro" in itens) throw new Error(`Extra não disponível agora: ${itens.erro}`);
  const corpo: CorpoExtra = input.recuperacao === "cansado" || input.recuperacao === "dor_leve" || input.recuperacao === "dor_moderada" ? input.recuperacao : "bem";
  // O personal já aprovou a lista: 48 h e limites são conferidos pela avaliação do extra.
  const g = montarExtraLivre({ itens, corpo, recentes48h: [], seriesDisponiveis: 40, tempos: c.tempos });
  if (!g.ok) throw new Error(`Extra não disponível agora: ${g.motivo}`);
  return gravarExtra(alunoId, c, { ...g.extra, titulo: extra.titulo }, { clientKey: input.clientKey, corpo, foco: "aprovado", tempoMin: null, extraId: extra.id });
}

/** Opções de extra para o personal aprovar: abaixo da meta + focos do plano (até 3, sem repetir). */
export async function opcoesExtraParaPersonal(alunoId: string, sugestaoVolume: SugestaoExtra | null): Promise<OpcaoExtra[]> {
  const c = await carregar(alunoId);
  const biblioteca = await listarBiblioteca();
  const idPorNome = new Map(biblioteca.map((b) => [normalizarNome(b.nome), b.id]));
  const doPlano = (x: ExercicioPrescrito): ItemExtraAprovado => ({ biblioteca_id: x.biblioteca_id ?? idPorNome.get(normalizarNome(x.nome)) ?? null, nome: x.nome, series: Math.max(1, x.series - (x.series_aquecimento ?? 0)), reps: x.reps });
  const meta: OpcaoExtra | null = sugestaoVolume
    ? { chave: "meta", titulo: sugestaoVolume.titulo.replace("Extra sugerido: ", "Abaixo da meta: "), motivo: sugestaoVolume.grupos.map((g) => `${g.rotulo}: ${String(g.feito).replace(".", ",")} de ${g.meta} séries nos últimos 7 dias`).join(" · "), itens: sugestaoVolume.exercicios.map((x) => ({ biblioteca_id: idPorNome.get(normalizarNome(x.nome)) ?? null, nome: x.nome, series: x.series, reps: x.reps })) }
    : null;
  const porFoco = (foco: FocoExtra): OpcaoExtra | null => {
    const g = montarExtraGerado({ exercicios: c.exercicios, prioridades: c.ctx.prioridades, foco, tempoMin: 30, corpo: "bem", recentes48h: [], proximoTreino: [], seriesDisponiveis: 12, tempos: c.tempos });
    if (!g.ok) return null;
    return { chave: foco, titulo: FOCOS_EXTRA[foco].rotulo.replace(/^Meus /, "").replace(/^./, (l) => l.toUpperCase()), motivo: FOCOS_EXTRA[foco].detalhe.replace("Os músculos que o Montinho marcou como foco do seu plano.", "Os músculos marcados como prioridade no plano."), itens: g.extra.exercicios.map(doPlano) };
  };
  return juntarOpcoes([meta, porFoco("prioridade"), porFoco("full_body"), porFoco("pequenos")]);
}

async function gravarExtra(alunoId: string, c: Carga, ex: ExtraGerado, o: { clientKey: string; corpo: CorpoExtra; foco: string; tempoMin: number | null; extraId: string | null }): Promise<SessaoCompleta> {
  const r = { clientKey: o.clientKey, corpo: o.corpo };
  // A tela de treino abre pelo treino do primeiro exercício; os exercícios vêm da foto da sessão.
  const treinoId = ex.exercicios.find((x) => x.treino_id)?.treino_id || c.treinoBase;
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
      extra: { id: o.extraId, gerado: true, modalidade: "resistido", titulo: ex.titulo, foco: o.foco, grupos: ex.grupos, series_estimadas: ex.series },
      recuperacao: r.corpo,
    },
    series_planejadas: ex.series,
    tempo_estimado_seg: estimarPrescricao(ex.exercicios, c.tempos).totalSeg || null,
    pausado_seg: 0,
    checkin_pre: r.corpo === "cansado" ? "cansado" : r.corpo === "dor_leve" || r.corpo === "dor_moderada" ? "desconforto" : "muito_bem",
    checkin_pre_nota: null,
    modo: "extra",
    tempo_disponivel_min: o.tempoMin,
    extra_id: o.extraId,
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

/** Atalhos do "Eu monto": exercícios do plano, um por nome, na ordem do plano. */
export async function atalhosDoPlano(alunoId: string): Promise<Array<{ nome: string; biblioteca_id: string | null; grupo: string | null }>> {
  const plano = await getPlanoAtivo(alunoId);
  const vistos = new Set<string>();
  const exs = await completarGrupos(plano.treinos.filter((t) => t.ativo).flatMap((t) => t.exercicios) as ExercicioPrescrito[]);
  return exs
    .filter((x) => x.conta_volume !== false && x.grupo_muscular && x.grupo_muscular !== "cardio" && !vistos.has(normalizarNome(x.nome)) && vistos.add(normalizarNome(x.nome)))
    .map((x) => ({ nome: x.nome, biblioteca_id: x.biblioteca_id ?? null, grupo: x.grupo_muscular }));
}
