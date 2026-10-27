// ============================================================================
// Montinho Cardio — dados (RLS; regras puras em src/lib/cardio/regras.ts).
// • Prescrição: só o personal grava. Mudar = desativar a antiga e criar outra
//   (as semanas passadas continuam com a meta da época). Nunca apaga.
// • Registro: o aluno grava/corrige os próprios; o personal também registra
//   e corrige. Excluir = removido_em. client_key deixa o envio idempotente.
// • Extras de cardio e cardios do Strava são LIDOS de onde já estão
//   (sem copiar: um minuto nunca conta duas vezes).
// ============================================================================

import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import { mockProfiles } from "@/lib/mock/db";
import { dataLocal, inicioDaSemana, somarDias } from "@/lib/aderencia/calcular";
import { deRegistro, juntarCardios, semanasDeCardio, sinaisDoCardio, proximoMarco, type CardioFeito, type EntradaCardio, type SemanaCardio, type SinalCardio } from "@/lib/cardio/regras";
import { modalidadeDoStrava, modalidadeDoTexto } from "@/lib/cardio/modalidades";
import { listarCardiosStrava } from "@/lib/data/strava";
import type { CardioPrescricao, CardioRegistro, IntensidadeCardio, ModalidadeCardio, ModalidadePrescricao } from "@/lib/supabase/types-extended";
import type { TrainingSession } from "@/lib/supabase/types-sessoes";
import type { ProgressoCardio } from "@/lib/conquistas/vitrine";

type Demo = { prescricoes: CardioPrescricao[]; registros: CardioRegistro[]; semeado: boolean };
function demo(): Demo {
  const g = globalThis as unknown as { __montinhoCardio?: Demo };
  g.__montinhoCardio ??= { prescricoes: [], registros: [], semeado: false };
  const d = g.__montinhoCardio;
  if (!d.semeado) {
    d.semeado = true;
    semearDemo(d);
  }
  return d;
}

/** Demo: a Aline tem esteira 3×/semana + caminhada longa de 60 min e alguns cardios feitos. */
function semearDemo(d: Demo) {
  const aline = demoStore().alunos.find((a) => mockProfiles.find((p) => p.id === a.profile_id)?.nome?.startsWith("Aline"));
  if (!aline) return;
  const hoje = dataLocal(new Date());
  const desde = `${somarDias(inicioDaSemana(hoje), -21)}T09:00:00-03:00`;
  const p1: CardioPrescricao = { id: uid(), aluno_id: aline.id, modalidade: "esteira", nome: null, tipo: "continuo", duracao_min: 30, intensidade: "moderada", frequencia_semanal: 3, dias: [1, 3, 5], vinculo: "apos_treino", treino_id: null, fc_alvo_min: 120, fc_alvo_max: 145, intervalos: null, observacoes: "Inclinação 5% se estiver confortável.", ativo: true, desativado_em: null, autor_id: null, created_at: desde, updated_at: desde };
  const p2: CardioPrescricao = { ...p1, id: uid(), modalidade: "caminhada", duracao_min: 60, intensidade: "leve", frequencia_semanal: 1, dias: [6], vinculo: "independente", fc_alvo_min: null, fc_alvo_max: null, observacoes: "Ao ar livre, ritmo de conversa." };
  d.prescricoes.push(p1, p2);
  const reg = (data: string, p: CardioPrescricao, min: number, esforco: number, status: CardioRegistro["status"] = "concluido"): CardioRegistro => {
    const em = `${data}T19:00:00-03:00`;
    return { id: uid(), aluno_id: aline.id, prescricao_id: p.id, modalidade: p.modalidade === "livre" ? "outro" : p.modalidade, status, duracao_min: status === "nao_realizado" ? 0 : min, planejado_min: p.duracao_min, intensidade_planejada: p.intensidade, intensidade: p.intensidade, esforco: status === "nao_realizado" ? null : esforco, distancia_km: null, velocidade_kmh: p.modalidade === "esteira" ? 6.5 : null, inclinacao_pct: p.modalidade === "esteira" ? 5 : null, fc_media: null, fc_max: null, observacoes: null, session_id: null, origem: "app", client_key: `demo-${uid()}`, data, realizado_em: em, removido_em: null, created_at: em, updated_at: em };
  };
  const w = (n: number, dia: number) => somarDias(inicioDaSemana(hoje), -7 * n + dia);
  for (const n of [3, 2, 1]) {
    d.registros.push(reg(w(n, 0), p1, 30, 5), reg(w(n, 2), p1, 30, 6), reg(w(n, 4), p1, n === 1 ? 20 : 30, 6, n === 1 ? "parcial" : "concluido"));
    if (n !== 2) d.registros.push(reg(w(n, 5), p2, 60, 3));
  }
  if (w(0, 0) <= hoje) d.registros.push(reg(w(0, 0), p1, 30, 5));
}

// ---------------------------------------------------------------------------
// Prescrição
// ---------------------------------------------------------------------------
export type EntradaPrescricao = {
  modalidade: ModalidadePrescricao;
  nome?: string | null;
  tipo: "continuo" | "intervalado";
  duracao_min: number;
  intensidade: IntensidadeCardio;
  frequencia_semanal: number;
  /** Meta da semana em minutos (o app divide pelos dias). */
  minutos_semana?: number | null;
  dias: number[];
  vinculo: "qualquer" | "independente" | "apos_treino" | "antes_treino";
  treino_id?: string | null;
  fc_alvo_min?: number | null;
  fc_alvo_max?: number | null;
  intervalos?: string | null;
  observacoes?: string | null;
};

export async function listarPrescricoesCardio(alunoId: string, opts: { todas?: boolean } = {}): Promise<CardioPrescricao[]> {
  if (isDemoMode()) return demo().prescricoes.filter((p) => p.aluno_id === alunoId && (opts.todas || p.ativo)).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const db = await getDb();
  let q = db.from("cardio_prescricoes").select("*").eq("aluno_id", alunoId).order("created_at");
  if (!opts.todas) q = q.eq("ativo", true);
  const { data, error } = await q;
  if (error) return []; // banco sem a 0098
  return (data ?? []) as CardioPrescricao[];
}

/** Cria (ou, com `substituiId`, troca: a antiga é desativada, nunca apagada). Só o personal (RLS). */
/** `autoria: "proprio"` = o visitante montando o próprio cardio (só troca/encerra os dele). */
export async function salvarPrescricaoCardio(alunoId: string, e: EntradaPrescricao, substituiId?: string | null, autoria: "personal" | "proprio" = "personal"): Promise<CardioPrescricao> {
  const agora = new Date().toISOString();
  const linha = { aluno_id: alunoId, nome: e.nome ?? null, treino_id: e.vinculo === "independente" || e.vinculo === "qualquer" ? null : (e.treino_id ?? null), fc_alvo_min: e.fc_alvo_min ?? null, fc_alvo_max: e.fc_alvo_max ?? null, intervalos: e.tipo === "intervalado" ? (e.intervalos ?? null) : null, observacoes: e.observacoes ?? null, modalidade: e.modalidade, tipo: e.tipo, duracao_min: e.duracao_min, intensidade: e.intensidade, frequencia_semanal: e.frequencia_semanal, minutos_semana: e.minutos_semana ?? null, dias: [...new Set(e.dias)].sort(), vinculo: e.vinculo, autoria };
  if (isDemoMode()) {
    const d = demo();
    if (substituiId) {
      const old = d.prescricoes.find((p) => p.id === substituiId && p.aluno_id === alunoId && (autoria === "personal" || p.autoria === "proprio"));
      if (old) Object.assign(old, { ativo: false, desativado_em: agora, updated_at: agora });
    }
    const p: CardioPrescricao = { id: uid(), ...linha, ativo: true, desativado_em: null, autor_id: null, created_at: agora, updated_at: agora };
    d.prescricoes.push(p);
    return p;
  }
  const db = await getDb();
  if (substituiId) await desativarPrescricaoCardio(alunoId, substituiId, autoria);
  const { data, error } = await db.from("cardio_prescricoes").insert(linha).select("*").single();
  if (error) throw new Error(`Não foi possível salvar a prescrição: ${error.message}`);
  return data as CardioPrescricao;
}

export async function desativarPrescricaoCardio(alunoId: string, id: string, autoria: "personal" | "proprio" = "personal"): Promise<void> {
  const agora = new Date().toISOString();
  if (isDemoMode()) {
    const p = demo().prescricoes.find((x) => x.id === id && x.aluno_id === alunoId && (autoria === "personal" || x.autoria === "proprio"));
    if (p) Object.assign(p, { ativo: false, desativado_em: agora, updated_at: agora });
    return;
  }
  const db = await getDb();
  let q = db.from("cardio_prescricoes").update({ ativo: false, desativado_em: agora }).eq("id", id).eq("aluno_id", alunoId).eq("ativo", true);
  if (autoria === "proprio") q = q.eq("autoria", "proprio");
  const { error } = await q;
  if (error) throw new Error(`Não foi possível encerrar a prescrição: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Registro
// ---------------------------------------------------------------------------
export type EntradaRegistro = {
  client_key: string;
  prescricao_id?: string | null;
  modalidade: ModalidadeCardio;
  status: CardioRegistro["status"];
  duracao_min: number;
  intensidade?: IntensidadeCardio | null;
  esforco?: number | null;
  distancia_km?: number | null;
  velocidade_kmh?: number | null;
  inclinacao_pct?: number | null;
  fc_media?: number | null;
  fc_max?: number | null;
  observacoes?: string | null;
  session_id?: string | null;
  /** AAAA-MM-DD (Brasília); padrão: hoje. Até 7 dias para trás. */
  data?: string | null;
};

/** Registra (idempotente por client_key). O planejado do dia vem da prescrição, no servidor. */
export async function registrarCardio(alunoId: string, e: EntradaRegistro, origem: "app" | "personal"): Promise<CardioRegistro> {
  const hoje = dataLocal(new Date());
  const data = e.data && e.data <= hoje && e.data >= somarDias(hoje, -7) ? e.data : hoje;
  const prescricoes = e.prescricao_id ? await listarPrescricoesCardio(alunoId, { todas: true }) : [];
  const p = e.prescricao_id ? prescricoes.find((x) => x.id === e.prescricao_id) : undefined;
  if (e.prescricao_id && !p) throw new Error("Cardio prescrito não encontrado.");
  const agora = new Date().toISOString();
  const realizado = data === hoje ? agora : `${data}T12:00:00-03:00`;
  const linha = {
    aluno_id: alunoId,
    prescricao_id: p?.id ?? null,
    modalidade: e.modalidade,
    status: e.status,
    duracao_min: e.status === "nao_realizado" ? 0 : Math.round(e.duracao_min),
    planejado_min: p?.duracao_min ?? null,
    intensidade_planejada: p?.intensidade ?? null,
    intensidade: e.status === "nao_realizado" ? null : (e.intensidade ?? null),
    esforco: e.status === "nao_realizado" ? null : (e.esforco ?? null),
    distancia_km: e.distancia_km ?? null,
    velocidade_kmh: e.velocidade_kmh ?? null,
    inclinacao_pct: e.inclinacao_pct ?? null,
    fc_media: e.fc_media ?? null,
    fc_max: e.fc_max ?? null,
    observacoes: e.observacoes ?? null,
    session_id: e.session_id ?? null,
    origem,
    client_key: e.client_key,
    data,
    realizado_em: realizado,
  };
  if (isDemoMode()) {
    const d = demo();
    const ja = d.registros.find((r) => r.aluno_id === alunoId && (r.client_key === e.client_key || (!!linha.session_id && !!linha.prescricao_id && r.session_id === linha.session_id && r.prescricao_id === linha.prescricao_id && !r.removido_em)));
    if (ja) return ja;
    const r: CardioRegistro = { id: uid(), ...linha, removido_em: null, created_at: agora, updated_at: agora };
    d.registros.push(r);
    return r;
  }
  const db = await getDb();
  const { data: ja } = await db.from("cardio_registros").select("*").eq("aluno_id", alunoId).eq("client_key", e.client_key).maybeSingle();
  if (ja) return ja as CardioRegistro;
  const { data: nova, error } = await db.from("cardio_registros").insert(linha).select("*").single();
  if (error) {
    // Mesmo cardio prescrito já registrado para este treino: devolve o existente.
    if (error.code === "23505" && linha.session_id && linha.prescricao_id) {
      const { data: existe } = await db.from("cardio_registros").select("*").eq("session_id", linha.session_id).eq("prescricao_id", linha.prescricao_id).is("removido_em", null).maybeSingle();
      if (existe) return existe as CardioRegistro;
    }
    throw new Error(`Não foi possível registrar o cardio: ${error.message}`);
  }
  return nova as CardioRegistro;
}

export type CorrecaoRegistro = Partial<Pick<EntradaRegistro, "status" | "duracao_min" | "intensidade" | "esforco" | "distancia_km" | "velocidade_kmh" | "inclinacao_pct" | "fc_media" | "fc_max" | "observacoes" | "modalidade">> & { remover?: boolean };

/** Corrige ou exclui (removido_em). O aluno só mexe nos próprios registros do app (RLS); o personal, em todos. */
export async function corrigirCardio(alunoId: string, id: string, c: CorrecaoRegistro): Promise<void> {
  const patch: Record<string, unknown> = { ...c };
  delete patch.remover;
  if (c.remover) patch.removido_em = new Date().toISOString();
  if (c.status === "nao_realizado") Object.assign(patch, { duracao_min: 0, esforco: null, intensidade: null });
  if (isDemoMode()) {
    const r = demo().registros.find((x) => x.id === id && x.aluno_id === alunoId && !x.removido_em);
    if (!r) throw new Error("Registro não encontrado.");
    Object.assign(r, patch, { updated_at: new Date().toISOString() });
    return;
  }
  const db = await getDb();
  const { data, error } = await db.from("cardio_registros").update(patch).eq("id", id).eq("aluno_id", alunoId).is("removido_em", null).select("id");
  if (error) throw new Error(`Não foi possível corrigir: ${error.message}`);
  if (!data?.length) throw new Error("Registro não encontrado (ou não pode ser alterado por você).");
}

export async function listarRegistrosCardio(alunoId: string, opts: { desde?: string } = {}): Promise<CardioRegistro[]> {
  if (isDemoMode()) return demo().registros.filter((r) => r.aluno_id === alunoId && !r.removido_em && (!opts.desde || r.data >= opts.desde));
  const db = await getDb();
  let q = db.from("cardio_registros").select("*").eq("aluno_id", alunoId).is("removido_em", null).order("realizado_em").limit(3000);
  if (opts.desde) q = q.gte("data", opts.desde);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as CardioRegistro[];
}

// ---------------------------------------------------------------------------
// Tudo junto: registros + extras de cardio + Strava
// ---------------------------------------------------------------------------
const ehExtraCardio = (s: Pick<TrainingSession, "modo" | "status" | "snapshot">) => {
  const ex = (s.snapshot as { extra?: { modalidade?: string } } | null)?.extra;
  return s.modo === "extra" && s.status === "concluida" && !!ex?.modalidade?.startsWith("cardio");
};

function deExtra(s: TrainingSession): CardioFeito {
  const ex = (s.snapshot as { extra?: { titulo?: string; duracao_min?: number; modalidade?: string } }).extra!;
  return { id: s.id, origem: "extra", modalidade: modalidadeDoTexto(ex.titulo ?? s.nome_treino), status: "concluido", duracaoMin: Math.round((s.duracao_seg ?? 0) / 60), planejadoMin: ex.duracao_min ?? null, intensidadePlanejada: ex.modalidade === "cardio_leve" ? "leve" : "moderada", intensidade: null, esforco: null, data: dataLocal(s.iniciado_em), realizadoEm: s.finalizado_em ?? s.iniciado_em, prescricaoId: null, sessionId: null, distanciaKm: null, fcMedia: null, fcMax: null, observacoes: ex.titulo ?? null, editavel: false };
}

async function extrasDeCardio(alunoId: string): Promise<TrainingSession[]> {
  if (isDemoMode()) return demoStore().sessions.filter((s) => s.aluno_id === alunoId && ehExtraCardio(s));
  const db = await getDb();
  const { data } = await db.from("training_sessions").select("id, aluno_id, modo, status, snapshot, nome_treino, duracao_seg, iniciado_em, finalizado_em").eq("aluno_id", alunoId).eq("modo", "extra").eq("status", "concluida").limit(1000);
  return ((data ?? []) as TrainingSession[]).filter(ehExtraCardio);
}

export async function cardiosFeitos(alunoId: string): Promise<CardioFeito[]> {
  const [registros, extras, strava] = await Promise.all([listarRegistrosCardio(alunoId), extrasDeCardio(alunoId).catch(() => []), listarCardiosStrava(alunoId, 1000).catch(() => [])]);
  return juntarCardios(
    registros.map(deRegistro),
    extras.map(deExtra),
    strava.map((c): CardioFeito => ({ id: `strava:${c.atividade_id}`, origem: "strava", modalidade: modalidadeDoStrava(c.tipo), status: "concluido", duracaoMin: Math.round(c.duracao_seg / 60), planejadoMin: null, intensidadePlanejada: null, intensidade: null, esforco: null, data: dataLocal(c.inicio), realizadoEm: c.inicio, prescricaoId: null, sessionId: null, distanciaKm: c.distancia_m ? Math.round(c.distancia_m / 10) / 100 : null, fcMedia: c.fc_media, fcMax: c.fc_max, observacoes: c.nome, editavel: false }))
  );
}

/** Entrada dos troféus de cardio (null quando não há nada de cardio). */
export async function entradaCardio(alunoId: string, semanasPausadas: string[] = []): Promise<EntradaCardio | null> {
  const [prescricoes, feitos] = await Promise.all([listarPrescricoesCardio(alunoId, { todas: true }), cardiosFeitos(alunoId)]);
  if (!prescricoes.length && !feitos.length) return null;
  return { prescricoes, feitos, semanasPausadas };
}

export type CardioDoAluno = {
  prescricoes: CardioPrescricao[];
  todasPrescricoes: CardioPrescricao[];
  feitos: CardioFeito[];
  semanas: SemanaCardio[];
  marco: ReturnType<typeof proximoMarco>;
  sinais: SinalCardio[];
};

export async function cardioDoAluno(alunoId: string, semanasPausadas: string[] = []): Promise<CardioDoAluno> {
  const hoje = dataLocal(new Date());
  const [todas, feitos] = await Promise.all([listarPrescricoesCardio(alunoId, { todas: true }), cardiosFeitos(alunoId)]);
  const semanas = semanasDeCardio({ prescricoes: todas, feitos, hoje, semanasPausadas });
  return { prescricoes: todas.filter((p) => p.ativo), todasPrescricoes: todas, feitos, semanas, marco: proximoMarco(feitos), sinais: sinaisDoCardio(semanas, feitos, hoje) };
}

// ---------------------------------------------------------------------------
// Painel do personal (todos os alunos com cardio)
// ---------------------------------------------------------------------------
export type LinhaPainelCardio = {
  alunoId: string;
  nome: string;
  telefone: string | null;
  visitante: boolean;
  prescricoes: CardioPrescricao[];
  semanaAtual: SemanaCardio | null;
  ultimaFechada: SemanaCardio | null;
  quatro: SemanaCardio[];
  esforcoMedio: number | null;
  ultimoCardio: string | null;
  sinais: SinalCardio[];
};

export async function painelCardio(): Promise<LinhaPainelCardio[]> {
  const hoje = dataLocal(new Date());
  let alunos: Array<{ id: string; nome: string; telefone: string | null; visitante: boolean }>;
  if (isDemoMode()) {
    demo();
    alunos = demoStore().alunos.filter((a) => a.status !== "arquivado").map((a) => ({ id: a.id, nome: mockProfiles.find((p) => p.id === a.profile_id)?.nome ?? "Aluno", telefone: a.telefone ?? null, visitante: a.modalidade === "visitante" }));
  } else {
    const db = await getDb();
    const [{ data: ps }, { data: rs }] = await Promise.all([db.from("cardio_prescricoes").select("aluno_id"), db.from("cardio_registros").select("aluno_id").is("removido_em", null).gte("data", somarDias(hoje, -90)).limit(5000)]);
    const ids = [...new Set([...(ps ?? []), ...(rs ?? [])].map((x) => x.aluno_id as string))];
    if (!ids.length) return [];
    const { data } = await db.from("alunos").select("id, telefone, status, modalidade, profile:profiles(nome)").in("id", ids).neq("status", "arquivado");
    alunos = ((data ?? []) as unknown as Array<{ id: string; telefone: string | null; modalidade: string | null; profile: { nome: string | null } | null }>).map((a) => ({ id: a.id, nome: a.profile?.nome ?? "Aluno", telefone: a.telefone, visitante: a.modalidade === "visitante" }));
  }
  const linhas = await Promise.all(
    alunos.map(async (a) => {
      const c = await cardioDoAluno(a.id);
      if (!c.todasPrescricoes.length && !c.feitos.length) return null;
      const fechadas = c.semanas.filter((s) => !s.atual && s.alvoSessoes > 0);
      const recentes = c.feitos.filter((f) => f.esforco != null && f.data >= somarDias(hoje, -28));
      return {
        alunoId: a.id,
        nome: a.nome,
        telefone: a.telefone,
        visitante: a.visitante,
        prescricoes: c.prescricoes,
        semanaAtual: c.semanas.find((s) => s.atual) ?? null,
        ultimaFechada: fechadas.at(-1) ?? null,
        quatro: fechadas.slice(-4),
        esforcoMedio: recentes.length ? Math.round((recentes.reduce((t, f) => t + f.esforco!, 0) / recentes.length) * 10) / 10 : null,
        ultimoCardio: c.feitos.filter((f) => f.status !== "nao_realizado").at(-1)?.data ?? null,
        sinais: c.sinais,
      } satisfies LinhaPainelCardio;
    })
  );
  return linhas.filter((x): x is LinhaPainelCardio => !!x).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Para o progresso dos troféus de cardio na sala de troféus. */
export async function progressoCardio(alunoId: string): Promise<ProgressoCardio> {
  const [todas, feitos] = await Promise.all([listarPrescricoesCardio(alunoId, { todas: true }), cardiosFeitos(alunoId)]);
  const temPrescricao = todas.some((p) => p.ativo);
  let semana: ProgressoCardio["semana"] = null;
  let semanaMin: ProgressoCardio["semanaMin"] = null;
  let seguidas = 0;
  if (temPrescricao) {
    const semanas = semanasDeCardio({ prescricoes: todas, feitos, hoje: dataLocal(new Date()) });
    const atual = semanas.find((w) => w.atual);
    if (atual && atual.alvoMin > 0) semanaMin = { minutos: atual.minutos, alvoMin: atual.alvoMin };
    if (atual && !atual.cumpridaEm && (atual.alvoSessoes > 0 || atual.alvoMin > 0)) {
      semana = { faltaSessoes: Math.max(0, atual.alvoSessoes - atual.sessoes), faltaMin: Math.max(0, Math.ceil(atual.alvoMin - atual.minutos)), metaMinutos: atual.metaMinutos };
    }
    // Semanas seguidas cumpridas logo antes da atual (a que começou a prescrição no meio não quebra).
    for (const w of semanas.filter((x) => !x.atual).sort((a, b) => (a.inicio < b.inicio ? 1 : -1))) {
      if (w.cumpridaEm) seguidas++;
      else if (!w.inicioPrescricao) break;
    }
  }
  return { feitos: proximoMarco(feitos).feitos, temPrescricao, prescricaoLonga: todas.some((p) => p.ativo && p.duracao_min >= 60), semana, seguidas, semanaMin };
}
