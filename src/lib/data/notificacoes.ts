// Chalalá no celular — preferências, histórico, configuração geral, métricas e
// teste de envio. Tudo pelo cliente com RLS (login do próprio usuário); o envio
// agendado roda no servidor pelo agendador (src/app/api/cron/lembretes).
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { TESTE, mensagemChalala } from "@/lib/push/chalala";
import { configurarVapid, enviarAosAparelhos } from "@/lib/push/enviar";
import type { FUSOS } from "@/lib/validacao/schemas";

export type PreferenciasNotificacao = {
  motivacionais: boolean;
  bom_dia: boolean;
  bom_dia_hora: string;
  pos_treino: boolean;
  lembrete_treino: boolean;
  silencio_inicio: string;
  silencio_fim: string;
  fuso: (typeof FUSOS)[number];
};

/** Padrão: Bom Dia DESLIGADO (o aluno escolhe se e quando quer receber). */
export const PREFERENCIAS_PADRAO: PreferenciasNotificacao = {
  motivacionais: true,
  bom_dia: false,
  bom_dia_hora: "07:00",
  pos_treino: true,
  lembrete_treino: true,
  silencio_inicio: "22:00",
  silencio_fim: "05:00",
  fuso: "America/Sao_Paulo",
};

export type ConfigChalala = { chalala_ativo: boolean; limite_diario: number; intervalo_minimo_min: number };
export const CONFIG_PADRAO: ConfigChalala = { chalala_ativo: false, limite_diario: 2, intervalo_minimo_min: 60 };

export type ItemHistorico = { id: string; categoria: string; titulo: string; corpo: string; enviada_em: string; aberta_em: string | null };

export type MetricasPush = {
  inscritos: number;
  habilitados: number;
  bomDiaLigado: number;
  posTreinoLigado: number;
  enviadas: number;
  falhas: number;
  abertas: number;
  bomDiaEnviadas: number;
  bomDiaAbertas: number;
  posTreinoEnviadas: number;
  descartadas: Record<string, number>;
  treinosAposAbertura: number;
  ativo: boolean;
  limiteDiario: number;
  intervaloMin: number;
};

// Demonstração: só em memória.
function demo() {
  const g = globalThis as unknown as { __montinhoNotif?: { prefs: Map<string, PreferenciasNotificacao>; config: ConfigChalala } };
  g.__montinhoNotif ??= { prefs: new Map(), config: { ...CONFIG_PADRAO } };
  return g.__montinhoNotif;
}

const hhmm = (t: string | null | undefined, padrao: string) => (t ? t.slice(0, 5) : padrao);

export async function getPreferencias(userId: string): Promise<PreferenciasNotificacao> {
  if (isDemoMode()) return demo().prefs.get(userId) ?? { ...PREFERENCIAS_PADRAO };
  const db = await getDb();
  const { data } = await db.from("notificacao_preferencias").select("*").eq("profile_id", userId).maybeSingle();
  if (!data) return { ...PREFERENCIAS_PADRAO };
  const d = data as Record<string, unknown>;
  return {
    motivacionais: d.motivacionais !== false,
    bom_dia: d.bom_dia === true,
    bom_dia_hora: hhmm(d.bom_dia_hora as string, PREFERENCIAS_PADRAO.bom_dia_hora),
    pos_treino: d.pos_treino !== false,
    lembrete_treino: d.lembrete_treino !== false,
    silencio_inicio: hhmm(d.silencio_inicio as string, PREFERENCIAS_PADRAO.silencio_inicio),
    silencio_fim: hhmm(d.silencio_fim as string, PREFERENCIAS_PADRAO.silencio_fim),
    fuso: (d.fuso as PreferenciasNotificacao["fuso"]) ?? PREFERENCIAS_PADRAO.fuso,
  };
}

export async function salvarPreferencias(userId: string, p: PreferenciasNotificacao): Promise<void> {
  if (isDemoMode()) {
    demo().prefs.set(userId, { ...p });
    return;
  }
  const db = await getDb();
  const { error } = await db.from("notificacao_preferencias").upsert({ profile_id: userId, ...p, atualizado_em: new Date().toISOString() }, { onConflict: "profile_id" });
  if (error) throw new Error("Não foi possível salvar as preferências.");
}

export async function listarHistorico(userId: string, limite = 30): Promise<ItemHistorico[]> {
  if (isDemoMode()) return [];
  const db = await getDb();
  const { data } = await db
    .from("notificacoes_envios")
    .select("id, categoria, titulo, corpo, enviada_em, aberta_em")
    .eq("profile_id", userId)
    .eq("status", "enviada")
    .order("enviada_em", { ascending: false })
    .limit(limite);
  return ((data ?? []) as ItemHistorico[]).filter((x) => x.titulo && x.corpo);
}

export async function getConfigChalala(): Promise<ConfigChalala> {
  if (isDemoMode()) return { ...demo().config };
  const db = await getDb();
  const { data } = await db.from("notificacao_config").select("chalala_ativo, limite_diario, intervalo_minimo_min").eq("id", 1).maybeSingle();
  return (data as ConfigChalala | null) ?? { ...CONFIG_PADRAO };
}

export async function salvarConfigChalala(c: ConfigChalala): Promise<void> {
  if (isDemoMode()) {
    demo().config = { ...c };
    return;
  }
  const db = await getDb();
  const { error } = await db.from("notificacao_config").update({ ...c, atualizado_em: new Date().toISOString() }).eq("id", 1);
  if (error) throw new Error("Não foi possível salvar.");
}

const METRICAS_VAZIAS: MetricasPush = { inscritos: 0, habilitados: 0, bomDiaLigado: 0, posTreinoLigado: 0, enviadas: 0, falhas: 0, abertas: 0, bomDiaEnviadas: 0, bomDiaAbertas: 0, posTreinoEnviadas: 0, descartadas: {}, treinosAposAbertura: 0, ativo: false, limiteDiario: 2, intervaloMin: 60 };

/** Agregados (só o treinador; o banco confere). null = migração 0036 ainda não aplicada. */
export async function metricasPush(desde: Date): Promise<MetricasPush | null> {
  if (isDemoMode()) return { ...METRICAS_VAZIAS, ativo: demo().config.chalala_ativo };
  const db = await getDb();
  const { data, error } = await db.rpc("chalala_metricas_push", { p_desde: desde.toISOString() });
  if (error || !data) return null;
  return { ...METRICAS_VAZIAS, ...(data as Partial<MetricasPush>) };
}

export type ResultadoTeste = { ok: boolean; aparelhos: number; entregues: number; erro?: string; demo?: boolean };

/** Teste real: envia para os aparelhos DO PRÓPRIO usuário (limite: 1 por minuto, 10 por dia). */
export async function enviarTeste(userId: string, opts: { treinador: boolean }): Promise<ResultadoTeste> {
  if (isDemoMode()) return { ok: true, aparelhos: 0, entregues: 0, demo: true };
  if (!configurarVapid()) return { ok: false, aparelhos: 0, entregues: 0, erro: "Notificações ainda não configuradas no servidor (chaves VAPID)." };
  const db = await getDb();
  const { data: aparelhos } = await db.from("push_inscricoes").select("endpoint, p256dh, auth").eq("profile_id", userId).eq("ativo", true);
  if (!aparelhos?.length) return { ok: false, aparelhos: 0, entregues: 0, erro: "Nenhum aparelho com notificações ativas. Ative neste celular primeiro." };
  const { data: id, error } = await db.rpc("notificacao_teste_criar");
  if (error || !id) return { ok: false, aparelhos: aparelhos.length, entregues: 0, erro: error?.message?.includes("limite") ? "Calma! Espere um minuto entre os testes (máx. 10 por dia)." : "Não foi possível registrar o teste." };
  const msg = { ...mensagemChalala({ envio_id: id as string, categoria: "teste", mensagem: null }, { treinador: opts.treinador }), titulo: TESTE.titulo, corpo: TESTE.corpo };
  const r = await enviarAosAparelhos(aparelhos, msg, { ttl: 10 * 60 });
  await db.rpc("notificacao_teste_resultado", { p_id: id, p_titulo: msg.titulo, p_corpo: msg.corpo, p_url: msg.url, p_ok: r.ok, p_falha: r.falha });
  // Aparelhos recusados pelo serviço: some da lista do próprio usuário (RLS permite apagar os seus).
  if (r.expirados.length) await db.from("push_inscricoes").delete().in("endpoint", r.expirados);
  return { ok: r.ok > 0, aparelhos: aparelhos.length, entregues: r.ok, erro: r.ok ? undefined : "O serviço de notificações recusou. Desative e ative de novo neste aparelho." };
}

export async function marcarAberta(id: string): Promise<void> {
  if (isDemoMode()) return;
  const db = await getDb();
  await db.rpc("notificacao_aberta", { p_id: id });
}
