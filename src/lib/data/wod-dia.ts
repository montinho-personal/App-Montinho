// ============================================================================
// WOD do dia + ranking do dia (Multimodalidade, fase 3; 0134). Referência
// funcional: app de aluno de box da Tecnofit (sem copiar nada dela).
//  • O personal publica 1 WOD por dia (dia de Brasília); despublicar não apaga.
//  • Quem faz abre uma sessão EXTRA (sem treino da ficha) com
//    `snapshot.wod_dia_id`: conta como treino extra (carimbo, Jornada, Tribo),
//    não na meta semanal do plano — decisão 3 da auditoria.
//  • Ranking do dia: só o bloco WOD (metcon), RX e Scaled separados na tela,
//    adaptado fora; o aluno vê nome curto de quem está no ranking.
// ============================================================================
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import { mockProfiles } from "@/lib/mock/db";
import { dataLocal } from "@/lib/aderencia/calcular";
import { blocosComResultado, blocosDaSessao } from "./wod";
import { getSessao, getSessaoEmAndamento, gravarSessaoNova, type SessaoCompleta } from "./sessoes";
import { normalizarBlocos, novoBloco } from "@/lib/modalidades/blocos";
import type { BlocoTreino, ModalidadeTreino } from "@/lib/modalidades/tipos";
import type { ResultadoBloco } from "@/lib/modalidades/resultado";
import type { TrainingSession } from "@/lib/supabase/types-sessoes";

export type WodDoDia = { id: string; data: string; titulo: string; modalidade: Exclude<ModalidadeTreino, "musculacao">; blocos: BlocoTreino[]; observacoes: string | null; publicado: boolean; created_at: string; updated_at: string };
export type LinhaRankingWod = ResultadoBloco & { ref: string; nome: string; eu: boolean; registrado_em: string };

type Demo = { wods: WodDoDia[] };
function demo(): Demo {
  const g = globalThis as unknown as { __montinhoWodDia?: Demo };
  if (!g.__montinhoWodDia) {
    const hoje = dataLocal(new Date());
    const agora = new Date().toISOString();
    const aquec = { ...novoBloco("aquecimento", []), texto: "2 rounds: 200 m de remo, 10 air squats, 10 ombro com elástico" };
    const wod = { ...novoBloco("metcon", [aquec], "for_time"), esquema: "21-15-9", time_cap_seg: 600, movimentos: [{ nome: "Ram Thrusters", reps: "21-15-9", carga: "43/29 kg", scaled: "thruster com 25/15 kg" }, { nome: "Barra fixa pronada", reps: "21-15-9", scaled: "pull-up com elástico" }] };
    g.__montinhoWodDia = { wods: [{ id: "wod-demo-hoje", data: hoje, titulo: "Sexta de Fogo", modalidade: "cross", blocos: [aquec, wod], observacoes: "Escolha a carga que deixa você terminar em até 10 minutos.", publicado: true, created_at: agora, updated_at: agora }] };
  }
  return g.__montinhoWodDia;
}

const hojeBrasilia = () => dataLocal(new Date());

/** O WOD publicado do dia (Brasília). */
export async function wodDoDia(data = hojeBrasilia()): Promise<WodDoDia | null> {
  if (isDemoMode()) return demo().wods.find((w) => w.data === data && w.publicado) ?? null;
  const db = await getDb();
  const { data: w } = await db.from("wods_do_dia").select("*").eq("data", data).eq("publicado", true).maybeSingle();
  return (w as WodDoDia | null) ?? null;
}

export async function getWod(id: string): Promise<WodDoDia | null> {
  if (isDemoMode()) return demo().wods.find((w) => w.id === id) ?? null;
  const db = await getDb();
  const { data } = await db.from("wods_do_dia").select("*").eq("id", id).maybeSingle();
  return (data as WodDoDia | null) ?? null;
}

/** Personal: os WODs dos últimos dias (publicados ou não). */
export async function wodsRecentes(limite = 14): Promise<WodDoDia[]> {
  if (isDemoMode()) return [...demo().wods].sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, limite);
  const db = await getDb();
  const { data } = await db.from("wods_do_dia").select("*").order("data", { ascending: false }).order("updated_at", { ascending: false }).limit(limite);
  return (data ?? []) as WodDoDia[];
}

export type EntradaWod = { id?: string | null; data: string; titulo: string; modalidade: WodDoDia["modalidade"]; blocos: BlocoTreino[]; observacoes?: string | null; publicado: boolean };

/** Personal publica/edita. Publicar num dia que já tem um publicado tira o anterior do ar (nada é apagado). */
export async function salvarWod(autorId: string, e: EntradaWod): Promise<WodDoDia> {
  const blocos = normalizarBlocos(e.blocos);
  const agora = new Date().toISOString();
  if (isDemoMode()) {
    const lista = demo().wods;
    if (e.publicado) lista.filter((w) => w.data === e.data && w.id !== e.id).forEach((w) => (w.publicado = false));
    let w = e.id ? lista.find((x) => x.id === e.id) : undefined;
    if (w) Object.assign(w, { data: e.data, titulo: e.titulo, modalidade: e.modalidade, blocos, observacoes: e.observacoes ?? null, publicado: e.publicado, updated_at: agora });
    else {
      w = { id: uid(), data: e.data, titulo: e.titulo, modalidade: e.modalidade, blocos, observacoes: e.observacoes ?? null, publicado: e.publicado, created_at: agora, updated_at: agora };
      lista.push(w);
    }
    return w;
  }
  const db = await getDb();
  if (e.publicado) {
    let q = db.from("wods_do_dia").update({ publicado: false, updated_at: agora }).eq("data", e.data).eq("publicado", true);
    if (e.id) q = q.neq("id", e.id);
    const { error } = await q;
    if (error) throw new Error(`Não foi possível tirar o WOD anterior do ar: ${error.message}`);
  }
  const valores = { data: e.data, titulo: e.titulo, modalidade: e.modalidade, blocos, observacoes: e.observacoes ?? null, publicado: e.publicado, updated_at: agora };
  const { data, error } = e.id
    ? await db.from("wods_do_dia").update(valores).eq("id", e.id).select("*").single()
    : await db.from("wods_do_dia").insert({ ...valores, criado_por: autorId }).select("*").single();
  if (error) throw new Error(`Não foi possível salvar o WOD: ${error.message}`);
  return data as WodDoDia;
}

/** A sessão do aluno neste WOD (a mais recente), se houver. */
export async function minhaSessaoDoWod(alunoId: string, wodId: string): Promise<SessaoCompleta | null> {
  if (isDemoMode()) {
    const st = demoStore();
    const s = st.sessions.filter((x) => x.aluno_id === alunoId && (x.snapshot as { wod_dia_id?: string } | null)?.wod_dia_id === wodId && x.status !== "abandonada").sort((a, b) => (a.iniciado_em < b.iniciado_em ? 1 : -1))[0];
    return s ? getSessao(alunoId, s.id) : null;
  }
  const db = await getDb();
  const { data } = await db.from("training_sessions").select("id").eq("aluno_id", alunoId).eq("snapshot->>wod_dia_id", wodId).neq("status", "abandonada").order("iniciado_em", { ascending: false }).limit(1).maybeSingle();
  return data ? getSessao(alunoId, (data as { id: string }).id) : null;
}

/** Começa o WOD do dia: sessão extra com os blocos congelados. */
export async function iniciarSessaoWod(alunoId: string, wodId: string, clientKey: string): Promise<SessaoCompleta> {
  const wod = await getWod(wodId);
  if (!wod || !wod.publicado) throw new Error("Esse WOD não está mais publicado.");
  const minha = await minhaSessaoDoWod(alunoId, wodId);
  if (minha) return minha;
  const atual = await getSessaoEmAndamento(alunoId);
  if (atual) throw new Error("Você tem um treino em andamento. Termine ele antes de começar o WOD do dia.");
  const agora = new Date().toISOString();
  const sessao: TrainingSession = {
    id: uid(),
    aluno_id: alunoId,
    treino_id: null,
    programa_versao_id: null,
    letra: null,
    nome_treino: `WOD do dia · ${wod.titulo}`,
    client_key: clientKey,
    status: "em_andamento",
    iniciado_em: agora,
    finalizado_em: null,
    duracao_seg: null,
    snapshot: { wod_dia_id: wod.id, modalidade: wod.modalidade, blocos: wod.blocos, treino: { id: null, letra: null, nome: wod.titulo, observacoes: wod.observacoes, tempos: {} }, exercicios: [] },
    series_planejadas: blocosComResultado(wod.blocos),
    tempo_estimado_seg: null,
    pausado_seg: 0,
    checkin_pre: null,
    checkin_pre_nota: null,
    modo: "extra",
    tempo_disponivel_min: null,
    extra_id: null,
    series_concluidas: 0,
    feedback_percepcao: null,
    feedback_comentario: null,
    origem: "app",
    modalidade: wod.modalidade,
    created_at: agora,
    updated_at: agora,
  };
  return gravarSessaoNova(alunoId, clientKey, sessao, []);
}

/** Ranking do dia: resultados do bloco WOD (o RLS/RPC decide quem cada um vê). */
export async function rankingWodDia(wodId: string, quem: { alunoId: string | null; treinador: boolean }): Promise<LinhaRankingWod[]> {
  if (isDemoMode()) {
    const st = demoStore();
    const sessoes = st.sessions.filter((s) => (s.snapshot as { wod_dia_id?: string } | null)?.wod_dia_id === wodId && s.status !== "abandonada");
    const out: LinhaRankingWod[] = [];
    for (const s of sessoes) {
      const aluno = st.alunos.find((a) => a.id === s.aluno_id);
      const nome = mockProfiles.find((p) => p.id === aluno?.profile_id)?.nome ?? "Aluno";
      const partes = nome.trim().split(/\s+/);
      const curto = partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.` : partes[0];
      for (const b of await blocosDaSessao(s.aluno_id, s.id)) {
        if (b.tipo !== "metcon") continue;
        out.push({ ...b, ref: s.aluno_id, nome: quem.treinador ? nome : curto, eu: s.aluno_id === quem.alunoId, registrado_em: b.updated_at, modificacoes: quem.treinador || s.aluno_id === quem.alunoId ? b.modificacoes : null });
      }
    }
    return out;
  }
  const db = await getDb();
  const { data, error } = await db.rpc("ranking_wod_dia", { p_wod: wodId });
  if (error) return [];
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    ref: String(r.ref),
    nome: String(r.nome ?? "Aluno"),
    eu: !!r.eu,
    bloco_id: "wod",
    tipo: "metcon",
    formato: (r.formato as LinhaRankingWod["formato"]) ?? null,
    condicao: (r.condicao as LinhaRankingWod["condicao"]) ?? null,
    concluido: !!r.concluido,
    tempo_seg: (r.tempo_seg as number | null) ?? null,
    time_cap_seg: (r.time_cap_seg as number | null) ?? null,
    rounds: (r.rounds as number | null) ?? null,
    reps: (r.reps as number | null) ?? null,
    carga_kg: r.carga_kg != null ? Number(r.carga_kg) : null,
    intervalos: (r.intervalos as number[] | null) ?? null,
    modificacoes: (r.modificacoes as string | null) ?? null,
    registrado_em: String(r.registrado_em),
  }));
}
