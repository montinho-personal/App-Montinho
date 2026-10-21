// ============================================================================
// Conquistas e “Meu Chalalá de hoje” — persistência e resumo da conclusão.
// Regras em src/lib/conquistas (puras). Sempre pelo cliente com RLS:
// o aluno grava/lê só as próprias; o treinador lê todas e assina
// reconhecimentos. Inserção idempotente (aluno, código, referência).
// ============================================================================

import { relatorioDaConclusao, type RelatorioConclusao } from "@/lib/relatorios/conclusao";
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { uid } from "@/lib/mock/store";
import { listSessoes, getSessao, type SessaoCompleta } from "@/lib/data/sessoes";
import { aderenciaDoAluno, type AderenciaAluno } from "@/lib/data/aderencia";
import { classificarSessao, dataLocal, inicioDaSemana } from "@/lib/aderencia/calcular";
import { sessaoParaConquista as paraConquista } from "@/lib/conquistas/mapear";
import { CODIGOS_ALEM, CODIGOS_TECNICA, detectarConquistas, mensagemConclusao, type CodigoConquista, type ItemRecorde, type ModeloCard, type SessaoConquista } from "@/lib/conquistas/regras";
import { resumoMensal, type ResumoMensal } from "@/lib/conquistas/mensal";
import { nomeDaConquista } from "@/lib/conquistas/conteudo";
import { proximaMedalha, vitrineDeMedalhas } from "@/lib/conquistas/vitrine";
import { ciclos, linhaDoTempo, montarJornada } from "@/lib/conquistas/jornada";
import { descobertasDaSessao, type Descoberta } from "@/lib/evolucao/motor";
import { execucoesDeSessoes, sessaoParaAvaliar } from "@/lib/evolucao/adaptar";
import { listarHistoricoResumo } from "@/lib/data/historico";
import { baseCargaDoResumo } from "@/lib/historico/resumo";

export type ConquistaRow = {
  id: string;
  aluno_id: string;
  codigo: CodigoConquista;
  referencia: string;
  conquistado_em: string;
  session_id: string | null;
  titulo: string;
  descricao: string | null;
  dados: { recordes?: ItemRecorde[]; diasAfastado?: number; meta?: number };
  created_at: string;
  /** Conquistas 3.0 (0028). Antigas: versão 1, evidência vazia, origem “app”. */
  criterio_versao?: number;
  evidencia?: Record<string, unknown>;
  origem?: "app" | "importado";
  vista_em?: string | null;
};

export type Reconhecimento = { id: string; aluno_id: string; conquista_id: string | null; mensagem: string; autor_id: string | null; created_at: string };

export const TIPOS_EVENTO = ["conclusao_vista", "editor_aberto", "modelo_escolhido", "card_gerado", "download", "compartilhar_nativo", "compartilhar_cancelado", "visita_link", "vitrine_vista", "explicacao_aberta", "colecao_vista", "conhecimento_aberto", "quiz_respondido", "sugestao_vista", "sugestao_aberta", "descoberta_salva", "descoberta_compartilhada", "chalala_workout_started", "chalala_progression_shown", "chalala_reps_evolution_shown", "chalala_record_unlocked", "chalala_advanced_technique_shown", "chalala_workout_completed", "chalala_push_permission_granted", "chalala_push_permission_revoked", "chalala_vai_que_ta_facil"] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];
export type EventoChalala = { aluno_id: string | null; tipo: TipoEvento; modelo: string | null; formato: string | null; origem: string | null; created_at: string; ref?: string | null };

type AlunoBase = { id: string; data_inicio: string | null; created_at: string };

type DemoConquistas = { conquistas: ConquistaRow[]; reconhecimentos: Reconhecimento[]; eventos: EventoChalala[] };
function demo(): DemoConquistas {
  const g = globalThis as unknown as { __montinhoConquistas?: DemoConquistas };
  g.__montinhoConquistas ??= { conquistas: [], reconhecimentos: [], eventos: [] };
  return g.__montinhoConquistas;
}


export async function listarConquistas(alunoId: string | null, opts: { desde?: string; limite?: number } = {}): Promise<ConquistaRow[]> {
  if (isDemoMode()) {
    return demo()
      .conquistas.filter((c) => (!alunoId || c.aluno_id === alunoId) && (!opts.desde || c.conquistado_em >= opts.desde))
      .sort((a, b) => (a.conquistado_em < b.conquistado_em ? 1 : -1))
      .slice(0, opts.limite ?? 500);
  }
  const db = await getDb();
  let q = db.from("conquistas_aluno").select("*").order("conquistado_em", { ascending: false }).limit(opts.limite ?? 500);
  if (alunoId) q = q.eq("aluno_id", alunoId);
  if (opts.desde) q = q.gte("conquistado_em", opts.desde);
  const { data } = await q;
  return (data ?? []) as ConquistaRow[];
}

/**
 * Recalcula as conquistas sustentadas pelos dados e grava as que faltam.
 * Pode ser chamada quantas vezes for: nunca duplica.
 */
export async function sincronizarConquistas(aluno: AlunoBase): Promise<{ todas: ConquistaRow[]; novas: ConquistaRow[]; sessoes: SessaoConquista[]; aderencia: AderenciaAluno }> {
  const [completas, aderencia, existentes, resumo] = await Promise.all([listSessoes(aluno.id, { limite: 400, status: "todas" }), aderenciaDoAluno(aluno), listarConquistas(aluno.id), listarHistoricoResumo(aluno.id)]);
  const sessoes = completas.map(paraConquista);
  const relatorio = existentes.find((c) => c.codigo === "relatorio_mensal");
  const detectadas = detectarConquistas({ sessoes, aderencia, relatorioVistoEm: relatorio?.conquistado_em ?? null, baseCarga: baseCargaDoResumo(resumo), hoje: dataLocal(new Date()) });
  const chave = (c: { codigo: string; referencia: string }) => `${c.codigo}:${c.referencia}`;
  const ja = new Set(existentes.map(chave));
  const faltam = detectadas.filter((d) => !ja.has(chave(d)));
  if (!faltam.length) return { todas: existentes, novas: [], sessoes, aderencia };

  const linhas = faltam.map((d) => ({ aluno_id: aluno.id, codigo: d.codigo, referencia: d.referencia, conquistado_em: d.data, session_id: d.sessaoId, titulo: d.titulo, descricao: d.descricao, dados: d.dados ?? {}, criterio_versao: d.versao, evidencia: d.evidencia, origem: d.origem, vista_em: null }));
  if (isDemoMode()) {
    const st = demo();
    const agora = new Date().toISOString();
    for (const l of linhas) if (!st.conquistas.some((c) => c.aluno_id === l.aluno_id && chave(c) === chave(l))) st.conquistas.push({ id: uid(), created_at: agora, ...l });
  } else {
    const db = await getDb();
    // Medalhas novas vão num pedido separado: se o banco ainda não as aceitar
    // (migração 0037 pendente), as demais continuam sendo gravadas.
    const novasAlem = linhas.filter((l) => CODIGOS_ALEM.includes(l.codigo));
    const novasTecnica = linhas.filter((l) => CODIGOS_TECNICA.includes(l.codigo));
    const antigas = linhas.filter((l) => !CODIGOS_ALEM.includes(l.codigo) && !CODIGOS_TECNICA.includes(l.codigo));
    if (antigas.length) await db.from("conquistas_aluno").upsert(antigas, { onConflict: "aluno_id,codigo,referencia", ignoreDuplicates: true });
    if (novasAlem.length) await db.from("conquistas_aluno").upsert(novasAlem, { onConflict: "aluno_id,codigo,referencia", ignoreDuplicates: true });
    if (novasTecnica.length) await db.from("conquistas_aluno").upsert(novasTecnica, { onConflict: "aluno_id,codigo,referencia", ignoreDuplicates: true });
  }
  const todas = await listarConquistas(aluno.id);
  const novas = todas.filter((c) => !ja.has(chave(c)));
  return { todas, novas, sessoes, aderencia };
}

/** Marca conquistas do aluno como vistas (a celebração não reaparece). Só a coluna vista_em. */
export async function marcarConquistasVistas(alunoId: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const agora = new Date().toISOString();
  if (isDemoMode()) {
    for (const c of demo().conquistas) if (c.aluno_id === alunoId && ids.includes(c.id) && !c.vista_em) c.vista_em = agora;
    return;
  }
  const db = await getDb();
  await db.from("conquistas_aluno").update({ vista_em: agora }).eq("aluno_id", alunoId).in("id", ids).is("vista_em", null);
}

/** “Primeiro relatório consultado”: registrado quando o aluno abre a evolução completa. */
export async function registrarRelatorioVisto(alunoId: string): Promise<void> {
  const linha = { aluno_id: alunoId, codigo: "relatorio_mensal" as const, referencia: "1", conquistado_em: new Date().toISOString(), session_id: null, titulo: "Conhecendo minha evolução", descricao: "Você abriu sua evolução completa.", dados: {} };
  if (isDemoMode()) {
    const st = demo();
    if (!st.conquistas.some((c) => c.aluno_id === alunoId && c.codigo === "relatorio_mensal")) st.conquistas.push({ id: uid(), created_at: linha.conquistado_em, ...linha });
    return;
  }
  const db = await getDb();
  await db.from("conquistas_aluno").upsert([linha], { onConflict: "aluno_id,codigo,referencia", ignoreDuplicates: true });
}

// ---------------------------------------------------------------------------
// Tela de conclusão
// ---------------------------------------------------------------------------
export type ResumoChalala = {
  sessaoId: string;
  status: SessaoCompleta["status"];
  modo: "normal" | "reduzido" | "extra";
  nomeTreino: string | null;
  letra: string | null;
  data: string;
  /** Duração real (início → fim, menos pausas registradas). Null quando não confiável. */
  duracaoMin: number | null;
  exercicios: number;
  series: number;
  seriesPlanejadas: number;
  meta: number | null;
  /** Treinos válidos da semana (concluídos + 0,5 × parciais, sem extras). */
  pontosSemana: number;
  metaCumprida: boolean;
  metaCumpridaAgora: boolean;
  conquistas: ConquistaRow[];
  recordes: ItemRecorde[];
  retomada: boolean;
  mensagem: string;
  modeloSugerido: ModeloCard;
  /** Melhor evolução confiável da sessão (Evolução Inteligente). */
  evolucao: Descoberta | null;
  /** Até 3 destaques: evolução, conquista e meta da semana. */
  destaques: string[];
  /** Relatório curto: completou tudo, volume vs anterior/média, recordes da vida. */
  relatorio: RelatorioConclusao;
  /** Montinho Desbloqueia: explicação ligada ao que aconteceu hoje (anexada pela rota). */
  descoberta?: { id: string; pergunta: string; chamada: string } | null;
};

export async function resumoChalala(aluno: AlunoBase, sessaoId: string): Promise<ResumoChalala | null> {
  const s = await getSessao(aluno.id, sessaoId);
  if (!s || s.status === "em_andamento") return null;
  const [{ todas, aderencia }, historicoSessoes, resumoImportado] = await Promise.all([sincronizarConquistas(aluno), listSessoes(aluno.id, { limite: 200, status: "todas" }), listarHistoricoResumo(aluno.id).catch(() => [])]);
  const sc = paraConquista(s);
  const evolucao = descobertasDaSessao(sessaoParaAvaliar(s), execucoesDeSessoes(historicoSessoes.filter((x) => x.id !== s.id))).find((d) => d.confianca === "alta") ?? null;
  const semana = aderencia.semanas.find((w) => w.inicio === inicioDaSemana(dataLocal(s.iniciado_em))) ?? null;
  const pontosSemana = semana ? semana.concluidas + 0.5 * semana.parciais : 0;
  const daSessao = todas.filter((c) => c.session_id === s.id);
  const msg = mensagemConclusao({ sessao: sc, conquistas: daSessao, meta: semana?.meta ?? null, pontosSemana });
  const exercicios = s.exercicios.filter((e) => e.series.some((x) => x.tipo !== "aquecimento")).length;
  const duracao = s.duracao_seg && s.duracao_seg > 0 && s.duracao_seg < 6 * 3600 ? Math.max(1, Math.round(s.duracao_seg / 60)) : null;
  return {
    sessaoId: s.id,
    status: s.status,
    modo: s.modo ?? "normal",
    nomeTreino: s.nome_treino,
    letra: s.letra,
    data: dataLocal(s.finalizado_em ?? s.iniciado_em),
    duracaoMin: duracao,
    exercicios,
    series: s.series_concluidas,
    seriesPlanejadas: s.series_planejadas,
    meta: semana?.meta ?? null,
    pontosSemana,
    metaCumprida: !!semana?.meta && pontosSemana >= semana.meta && classificarSessao(sc) !== "extra",
    metaCumpridaAgora: msg.metaCumpridaAgora,
    conquistas: daSessao,
    recordes: daSessao.find((c) => c.codigo === "recorde")?.dados.recordes ?? [],
    retomada: daSessao.some((c) => c.codigo === "eu_voltei"),
    mensagem: msg.mensagem,
    modeloSugerido: msg.modeloSugerido,
    evolucao,
    relatorio: relatorioDaConclusao(s, historicoSessoes, resumoImportado.filter((r) => (r.carga_max_kg ?? 0) > 0).map((r) => ({ nome: r.exercicio_nome, bibliotecaId: r.biblioteca_id, carga: Number(r.carga_max_kg), data: r.data }))),
    destaques: destaquesDaConclusao({ evolucao, conquistas: daSessao, meta: semana?.meta ?? null, pontosSemana, metaCumpridaAgora: msg.metaCumpridaAgora, extra: classificarSessao(sc) === "extra" }),
  };
}

/** Até 3 destaques na conclusão: melhor evolução, conquista relevante e meta da semana. */
export function destaquesDaConclusao(e: { evolucao: Descoberta | null; conquistas: Array<{ codigo: string; titulo: string }>; meta: number | null; pontosSemana: number; metaCumpridaAgora: boolean; extra: boolean }): string[] {
  const out: string[] = [];
  if (e.evolucao) out.push(e.evolucao.tipo.startsWith("recorde") ? `Nova marca pessoal em ${e.evolucao.exercicio}.` : `Você evoluiu em ${e.evolucao.exercicio}: ${e.evolucao.atual.carga} kg × ${e.evolucao.atual.reps}${e.evolucao.anterior ? ` (antes ${e.evolucao.anterior.carga} kg × ${e.evolucao.anterior.reps})` : ""}.`.replace(/(\d)\.(\d)/g, "$1,$2"));
  const c = e.conquistas.find((x) => !["recorde", "relatorio_mensal"].includes(x.codigo));
  if (c) out.push(`Conquista: ${nomeDaConquista(c.codigo, c.titulo)}.`);
  if (!e.extra && e.meta) out.push(e.metaCumpridaAgora ? "Você completou sua meta semanal." : e.pontosSemana >= e.meta ? "Meta da semana já cumprida — este treino soma à sua jornada." : `Meta da semana: ${String(Math.min(e.pontosSemana, e.meta)).replace(".", ",")} de ${e.meta} treinos.`);
  if (out.length < 3) out.push("Mais uma sessão registrada na sua jornada.");
  return out.slice(0, 3);
}

export async function resumoMensalDoAluno(aluno: AlunoBase): Promise<{ mensal: ResumoMensal; conquistas: ConquistaRow[]; sessoes: SessaoConquista[]; aderencia: AderenciaAluno }> {
  const { todas, sessoes, aderencia } = await sincronizarConquistas(aluno);
  const hoje = dataLocal(new Date());
  const primeira = sessoes.map((s) => dataLocal(s.iniciado_em)).sort()[0];
  const inicio = [aluno.data_inicio ?? dataLocal(aluno.created_at), primeira].filter(Boolean).sort()[0] ?? hoje;
  return { mensal: resumoMensal({ sessoes, aderencia, conquistas: todas, inicioAcompanhamento: inicio, hoje }), conquistas: todas, sessoes, aderencia };
}

// ---------------------------------------------------------------------------
// Reconhecimento do personal (mensagem escrita por ele)
// ---------------------------------------------------------------------------
export async function criarReconhecimento(input: { alunoId: string; conquistaId: string | null; mensagem: string }): Promise<Reconhecimento> {
  if (isDemoMode()) {
    const r: Reconhecimento = { id: uid(), aluno_id: input.alunoId, conquista_id: input.conquistaId, mensagem: input.mensagem, autor_id: null, created_at: new Date().toISOString() };
    demo().reconhecimentos.push(r);
    return r;
  }
  const db = await getDb();
  const { data, error } = await db.from("reconhecimentos").insert({ aluno_id: input.alunoId, conquista_id: input.conquistaId, mensagem: input.mensagem }).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Falha ao salvar");
  return data as Reconhecimento;
}

export async function listarReconhecimentos(alunoId: string | null, limite = 50): Promise<Reconhecimento[]> {
  if (isDemoMode()) {
    return demo()
      .reconhecimentos.filter((r) => !alunoId || r.aluno_id === alunoId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limite);
  }
  const db = await getDb();
  let q = db.from("reconhecimentos").select("*").order("created_at", { ascending: false }).limit(limite);
  if (alunoId) q = q.eq("aluno_id", alunoId);
  const { data } = await q;
  return (data ?? []) as Reconhecimento[];
}

/** Inscrições push do aluno (só o treinador consegue; função no banco confere). */
export async function inscricoesPushDoAluno(alunoId: string): Promise<Array<{ endpoint: string; p256dh: string; auth: string }>> {
  if (isDemoMode()) return [];
  const db = await getDb();
  const { data } = await db.rpc("push_do_aluno", { p_aluno: alunoId });
  return (data ?? []) as Array<{ endpoint: string; p256dh: string; auth: string }>;
}

// ---------------------------------------------------------------------------
// Métricas do compartilhamento (eventos sem conteúdo privado)
// ---------------------------------------------------------------------------
export async function registrarEvento(alunoId: string | null, e: { tipo: TipoEvento; modelo?: string | null; formato?: string | null; origem?: string | null; ref?: string | null }): Promise<void> {
  const linha: EventoChalala = { aluno_id: e.tipo === "visita_link" ? null : alunoId, tipo: e.tipo, modelo: e.modelo ?? null, formato: e.formato ?? null, origem: e.origem ?? null, created_at: new Date().toISOString(), ...(e.ref ? { ref: e.ref } : {}) };
  if (linha.tipo !== "visita_link" && !linha.aluno_id) return;
  if (isDemoMode()) {
    demo().eventos.push(linha);
    return;
  }
  const db = await getDb();
  const { created_at: _c, ...ins } = linha;
  void _c;
  await db.from("eventos_chalala").insert(ins);
}

/** Exercícios que já receberam o incentivo de progressão nos últimos 14 dias (não repetir). */
export async function progressoesRecentes(alunoId: string): Promise<string[]> {
  const desde = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
  if (isDemoMode()) return demo().eventos.filter((e) => e.aluno_id === alunoId && e.tipo === "chalala_progression_shown" && e.created_at >= desde && e.ref).map((e) => e.ref!);
  const db = await getDb();
  const { data, error } = await db.from("eventos_chalala").select("ref").eq("aluno_id", alunoId).eq("tipo", "chalala_progression_shown").gte("created_at", desde).limit(200);
  if (error) return [];
  return ((data ?? []) as Array<{ ref: string | null }>).map((x) => x.ref).filter((x): x is string => !!x);
}

export async function listarEventos(desde: string): Promise<EventoChalala[]> {
  if (isDemoMode()) return demo().eventos.filter((e) => e.created_at >= desde);
  const db = await getDb();
  const { data } = await db.from("eventos_chalala").select("aluno_id, tipo, modelo, formato, origem, ref, created_at").gte("created_at", desde).order("created_at", { ascending: false }).limit(10000);
  return (data ?? []) as EventoChalala[];
}


// ---------------------------------------------------------------------------
// Minha Jornada (aluno e personal): tudo derivado do motor oficial.
// ---------------------------------------------------------------------------
export async function dadosDaJornada(aluno: AlunoBase) {
  const [{ todas, sessoes, aderencia }, reconhecimentos] = await Promise.all([sincronizarConquistas(aluno), listarReconhecimentos(aluno.id)]);
  const hoje = dataLocal(new Date());
  const medalhas = vitrineDeMedalhas({ conquistas: todas, sessoes, aderencia, hoje });
  const jornada = montarJornada({ medalhas, proxima: proximaMedalha(medalhas), conquistas: todas, semanas: aderencia.semanas });
  const eventos = linhaDoTempo({
    conquistas: todas,
    semanas: aderencia.semanas,
    hoje,
    reconhecimentos,
    ciclosAlcancados: ciclos(aderencia.semanas).filter((c) => c.alcancado),
  });
  const codigoPorId = new Map(todas.map((c) => [c.id, c.codigo]));
  const reconhecimentosPorCodigo: Record<string, { mensagem: string; data: string }> = {};
  for (const r of [...reconhecimentos].reverse()) {
    const cod = r.conquista_id ? codigoPorId.get(r.conquista_id) : null;
    if (cod) reconhecimentosPorCodigo[cod] = { mensagem: r.mensagem, data: r.created_at };
  }
  const treinos = sessoes.filter((s) => s.conta_aderencia !== false && classificarSessao(s) === "concluida").length;
  return {
    jornada,
    eventos,
    reconhecimentosPorCodigo,
    stats: { semanas: aderencia.semanas.filter((w) => !w.pausada).length, treinos, aderencia: aderencia.indices.d28.pct },
    semTreinos: !sessoes.some((s) => s.conta_aderencia !== false && ["concluida", "parcial"].includes(classificarSessao(s))),
  };
}
