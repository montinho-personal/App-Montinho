// ============================================================================
// Strava — dados. Cliente com RLS (0086): o aluno lê/grava só a própria
// conexão e os próprios resumos; o personal só lê os resumos (nunca as chaves).
// Modo demo: conexão e atividade simuladas em memória.
// ============================================================================

import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { getSessao } from "./sessoes";
import { detalheAtividade, desautorizar, listarAtividades, renovarToken, type TokensStrava } from "@/lib/strava/cliente";
import { escolherAtividade, janelaDeBusca } from "@/lib/strava/combinar";

export type ConexaoStrava = { aluno_id: string; athlete_id: number; atleta_nome: string | null; access_token: string; refresh_token: string; expira_em: string; escopo: string | null; consentido_em: string; conectado_em: string };
export type CardioSessao = { session_id: string; aluno_id: string; fonte: "strava"; atividade_id: number; nome_atividade: string | null; dispositivo: string | null; fc_media: number | null; fc_max: number | null; duracao_seg: number | null; calorias: number | null; inicio_atividade: string | null; importado_em: string };
/** O que a tela do aluno pode saber da conexão (sem as chaves). */
export type StatusStrava = { conectado: boolean; atleta: string | null; desde: string | null };

type Demo = { conexoes: Map<string, ConexaoStrava>; cardio: CardioSessao[] };
const demo = (): Demo => {
  const g = globalThis as unknown as { __montinhoStrava?: Demo };
  g.__montinhoStrava ??= { conexoes: new Map(), cardio: [] };
  return g.__montinhoStrava;
};
const num = (v: unknown) => (v == null ? null : Number(v));
const paraCardio = (r: Record<string, unknown>): CardioSessao => ({ ...(r as CardioSessao), fc_media: num(r.fc_media), fc_max: num(r.fc_max), atividade_id: Number(r.atividade_id) });

async function getConexao(alunoId: string): Promise<ConexaoStrava | null> {
  if (isDemoMode()) return demo().conexoes.get(alunoId) ?? null;
  const db = await getDb();
  const { data } = await db.from("strava_conexoes").select("*").eq("aluno_id", alunoId).maybeSingle();
  return (data as ConexaoStrava | null) ?? null;
}

export async function statusStrava(alunoId: string): Promise<StatusStrava> {
  const c = await getConexao(alunoId).catch(() => null);
  return { conectado: !!c, atleta: c?.atleta_nome ?? null, desde: c?.conectado_em ?? null };
}

/** Grava a conexão depois que o aluno autorizou no Strava (com o consentimento dado na tela). */
export async function salvarConexao(alunoId: string, t: TokensStrava, escopo: string | null, consentidoEm: string): Promise<void> {
  const linha = {
    aluno_id: alunoId,
    athlete_id: t.athlete?.id ?? 0,
    atleta_nome: [t.athlete?.firstname, t.athlete?.lastname].filter(Boolean).join(" ") || null,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expira_em: new Date(t.expires_at * 1000).toISOString(),
    escopo,
    consentido_em: consentidoEm,
    conectado_em: new Date().toISOString(),
  };
  if (isDemoMode()) {
    demo().conexoes.set(alunoId, linha);
    return;
  }
  const db = await getDb();
  const { error } = await db.from("strava_conexoes").upsert({ ...linha, updated_at: linha.conectado_em }, { onConflict: "aluno_id" });
  if (error) throw new Error(`Não foi possível guardar a conexão: ${error.message}`);
}

/** Simulação da demonstração: conecta sem sair do app. */
export async function conectarDemo(alunoId: string): Promise<void> {
  await salvarConexao(alunoId, { access_token: "demo", refresh_token: "demo", expires_at: Math.floor(Date.now() / 1000) + 6 * 3600, athlete: { id: 1, firstname: "Atleta", lastname: "Demo" } }, "read,activity:read_all", new Date().toISOString());
}

export async function desconectar(alunoId: string): Promise<void> {
  const c = await getConexao(alunoId);
  if (!c) return;
  if (!isDemoMode()) await desautorizar(c.access_token);
  if (isDemoMode()) {
    demo().conexoes.delete(alunoId);
    return;
  }
  const db = await getDb();
  const { error } = await db.from("strava_conexoes").delete().eq("aluno_id", alunoId);
  if (error) throw new Error(error.message);
}

/** Token válido (renova 5 min antes de vencer e guarda o novo). */
async function tokenValido(c: ConexaoStrava): Promise<string> {
  if (Date.parse(c.expira_em) - Date.now() > 5 * 60 * 1000) return c.access_token;
  const t = await renovarToken(c.refresh_token);
  const db = await getDb();
  await db.from("strava_conexoes").update({ access_token: t.access_token, refresh_token: t.refresh_token, expira_em: new Date(t.expires_at * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("aluno_id", c.aluno_id);
  return t.access_token;
}

export async function getCardio(alunoId: string, sessionId: string): Promise<CardioSessao | null> {
  if (isDemoMode()) return demo().cardio.find((x) => x.session_id === sessionId && x.aluno_id === alunoId) ?? null;
  const db = await getDb();
  const { data } = await db.from("sessao_cardio").select("*").eq("session_id", sessionId).eq("aluno_id", alunoId).maybeSingle();
  return data ? paraCardio(data as Record<string, unknown>) : null;
}

export async function listarCardio(alunoId: string, limite = 10): Promise<CardioSessao[]> {
  if (isDemoMode()) return demo().cardio.filter((x) => x.aluno_id === alunoId).sort((a, b) => (b.inicio_atividade ?? "").localeCompare(a.inicio_atividade ?? "")).slice(0, limite);
  const db = await getDb();
  const { data } = await db.from("sessao_cardio").select("*").eq("aluno_id", alunoId).order("inicio_atividade", { ascending: false }).limit(limite);
  return ((data ?? []) as Record<string, unknown>[]).map(paraCardio);
}

export type ResultadoSync = { conectado: false } | { conectado: true; cardio: CardioSessao | null; motivo?: string };

/**
 * Busca no Strava a atividade do relógio que corresponde a este treino e
 * guarda o resumo. Já importado: devolve o que está guardado.
 */
export async function sincronizarSessao(alunoId: string, sessionId: string): Promise<ResultadoSync> {
  const c = await getConexao(alunoId);
  if (!c) return { conectado: false };
  const ja = await getCardio(alunoId, sessionId);
  if (ja) return { conectado: true, cardio: ja };
  const s = await getSessao(alunoId, sessionId);
  if (!s) throw new Error("Treino não encontrado");
  const janela = { inicio: s.iniciado_em, fim: s.finalizado_em, duracaoSeg: s.duracao_seg };

  if (isDemoMode()) {
    const novo: CardioSessao = { session_id: sessionId, aluno_id: alunoId, fonte: "strava", atividade_id: 1000 + demo().cardio.length, nome_atividade: "Musculação", dispositivo: "Relógio (demonstração)", fc_media: 128, fc_max: 167, duracao_seg: s.duracao_seg || 3300, calorias: 390, inicio_atividade: s.iniciado_em, importado_em: new Date().toISOString() };
    demo().cardio.push(novo);
    return { conectado: true, cardio: novo };
  }

  let token: string;
  try {
    token = await tokenValido(c);
  } catch {
    return { conectado: true, cardio: null, motivo: "A conexão com o Strava expirou. Desconecte e conecte de novo no Perfil." };
  }
  const { after, before } = janelaDeBusca(janela);
  const atividades = await listarAtividades(token, after, before);
  const escolhida = escolherAtividade(janela, atividades);
  if (!escolhida) return { conectado: true, cardio: null, motivo: "Ainda não achei no Strava uma atividade no horário deste treino. Se o relógio ainda não sincronizou, tente de novo daqui a pouco." };
  const d = await detalheAtividade(token, escolhida.id).catch(() => null);
  const linha = {
    session_id: sessionId,
    aluno_id: alunoId,
    fonte: "strava" as const,
    atividade_id: escolhida.id,
    nome_atividade: escolhida.name?.slice(0, 120) ?? null,
    dispositivo: d?.device_name?.slice(0, 80) ?? null,
    fc_media: escolhida.average_heartrate ?? null,
    fc_max: escolhida.max_heartrate ?? null,
    duracao_seg: escolhida.elapsed_time ?? null,
    calorias: d?.calories ? Math.round(d.calories) : null,
    inicio_atividade: escolhida.start_date,
  };
  const db = await getDb();
  const { data, error } = await db.from("sessao_cardio").upsert(linha, { onConflict: "session_id" }).select("*").single();
  if (error) throw new Error(`Não foi possível guardar o resumo do relógio: ${error.message}`);
  return { conectado: true, cardio: paraCardio(data as Record<string, unknown>) };
}
