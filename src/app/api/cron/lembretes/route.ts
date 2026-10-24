// Disparado pelo agendador do banco (pg_cron, a cada 5 min) em /api/cron/lembretes:
// 1) lembrete de treino em aberto; 2) Chalalá no celular (Bom Dia e pós-treino).
// Protegido pela chave do agendador (LEMBRETE_CHAVE); o banco também confere a
// mesma chave antes de devolver qualquer dado. Quando/para quem enviar é decidido
// no banco (migração 0036): aqui só se monta o texto e se entrega.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MINUTOS_SEM_ATIVIDADE, mensagemTreinoAberto, type LembreteDevido } from "@/lib/push/mensagem";
import { TTL_SEG, agruparPorEnvio, mensagemChalala, topicoDoEnvio, type EnvioChalala } from "@/lib/push/chalala";
import { configurarVapid, enviarAosAparelhos } from "@/lib/push/enviar";
import { entregarWebhook } from "@/lib/crm/entregar";

export const dynamic = "force-dynamic";

type Linha = LembreteDevido & { endpoint: string; p256dh: string; auth: string };
type LinhaChalala = EnvioChalala & { session_id: string | null; endpoint: string; p256dh: string; auth: string };

export async function POST(req: Request) {
  const chave = process.env.LEMBRETE_CHAVE;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!chave || !url || !anon || !configurarVapid()) return NextResponse.json({ error: "Lembretes não configurados" }, { status: 503 });
  if (req.headers.get("x-montinho-chave") !== chave) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // Sem sessão de usuário: o acesso é só às funções protegidas pela chave.
  const db = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const desativar = (endpoints: string[]) => Promise.all(endpoints.map((e) => db.rpc("push_desativar", { p_chave: chave, p_endpoint: e })));

  // 1) Treino em aberto
  const { data, error } = await db.rpc("lembretes_devidos", { p_chave: chave, p_minutos: MINUTOS_SEM_ATIVIDADE });
  if (error) return NextResponse.json({ error: "Falha ao consultar lembretes" }, { status: 500 });
  let enviados = 0;
  let falhas = 0;
  for (const l of (data ?? []) as Linha[]) {
    const r = await enviarAosAparelhos([l], mensagemTreinoAberto(l), { ttl: 60 * 60 });
    enviados += r.ok;
    falhas += r.falha;
    await desativar(r.expirados);
  }

  // 2) Chalalá (se a migração 0036 ainda não existir, só pula)
  const chalala = { enviados: 0, falhas: 0, envios: 0 };
  const { data: devidas, error: e2 } = await db.rpc("chalala_notificacoes_devidas", { p_chave: chave });
  if (!e2) {
    for (const env of agruparPorEnvio((devidas ?? []) as LinhaChalala[])) {
      const msg = mensagemChalala(env);
      const r = await enviarAosAparelhos(env.aparelhos, msg, { ttl: TTL_SEG[env.categoria], topic: topicoDoEnvio(env.envio_id) });
      await desativar(r.expirados);
      await db.rpc("chalala_notificacao_resultado", { p_chave: chave, p_id: env.envio_id, p_titulo: msg.titulo, p_corpo: msg.corpo, p_url: msg.url, p_ok: r.ok, p_falha: r.falha });
      chalala.envios++;
      chalala.enviados += r.ok;
      chalala.falhas += r.falha;
    }
  }
  // 2b) Desafios entre alunos (0095): convite, cutucada e “termina amanhã” — 1 por pessoa a cada 24 h.
  const desafios = { enviados: 0, falhas: 0 };
  const { data: devDesafio, error: e4 } = await db.rpc("desafio_notificacoes_devidas", { p_chave: chave });
  if (!e4) {
    const porEnvio = new Map<string, { titulo: string; corpo: string; url: string; aparelhos: Array<{ endpoint: string; p256dh: string; auth: string }> }>();
    for (const r of (devDesafio ?? []) as Array<{ envio_id: string; titulo: string; corpo: string; url: string; endpoint: string; p256dh: string; auth: string }>) {
      const x = porEnvio.get(r.envio_id) ?? { titulo: r.titulo, corpo: r.corpo, url: r.url, aparelhos: [] };
      x.aparelhos.push({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth });
      porEnvio.set(r.envio_id, x);
    }
    for (const [id, env] of porEnvio) {
      const r = await enviarAosAparelhos(env.aparelhos, { id, titulo: env.titulo, corpo: env.corpo, url: env.url, tag: "desafio" }, { ttl: 12 * 60 * 60, topic: topicoDoEnvio(id) });
      await desativar(r.expirados);
      await db.rpc("chalala_notificacao_resultado", { p_chave: chave, p_id: id, p_titulo: env.titulo, p_corpo: env.corpo, p_url: env.url, p_ok: r.ok, p_falha: r.falha });
      desafios.enviados += r.ok;
      desafios.falhas += r.falha;
    }
  }
  // 3) CRM do personal (Modo Visitante, 0058): entrega a fila de novidades dos leads.
  const crm = { entregues: 0, falhas: 0 };
  const { data: pendentes, error: e3 } = await db.rpc("crm_pendentes", { p_chave: chave });
  if (!e3) {
    for (const p of (pendentes ?? []) as Array<{ id: number; url: string; token: string; payload: unknown }>) {
      const r = await entregarWebhook(p.url, p.token, p.payload);
      await db.rpc("crm_resultado", { p_chave: chave, p_id: p.id, p_ok: r.ok, p_codigo: r.codigo, p_erro: r.erro });
      if (r.ok) crm.entregues++;
      else crm.falhas++;
    }
  }
  return NextResponse.json({ ok: true, enviados, falhas, chalala: e2 ? "indisponivel" : chalala, desafios: e4 ? "indisponivel" : desafios, crm: e3 ? "indisponivel" : crm });
}
